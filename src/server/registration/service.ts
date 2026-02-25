import {
  getProblemStatementById,
  PROBLEM_STATEMENT_CAP,
} from "@/data/problem-statements";
import {
  getPresentationExtension,
  isPresentationExtensionAllowed,
  isPresentationMimeTypeAllowed,
  PRESENTATION_BUCKET_NAME,
  PRESENTATION_MAX_FILE_SIZE_BYTES,
} from "@/lib/presentation";
import { verifyProblemLockToken } from "@/lib/problem-lock-token";
import {
  countProblemStatementRegistrations,
  getProblemStatementIdFromDetails,
  type ProblemStatementCountRow,
} from "@/lib/problem-statement-availability";
import {
  type RegistrationRow,
  toTeamRecord,
  toTeamSummary,
  UUID_PATTERN,
  withSrmEmailNetIds,
} from "@/lib/register-api";
import type { TeamSubmission } from "@/lib/register-schema";
import {
  deleteRegistrationByQueryIdForUser,
  deleteRegistrationByTeamIdForUser,
  findAnyRegistrationForUser,
  findRegistrationByTeamIdForUser,
  insertRegistration,
  listProblemStatementRows,
  listRegistrationsForUser,
  updateRegistrationDetailsByTeamIdForUser,
} from "@/server/registration/repository";
import type { RouteSupabaseClient } from "@/server/supabase/route-client";

type ServiceSuccess<T> = {
  data: T;
  ok: true;
  status: number;
};

type ServiceFailure = {
  error: string;
  ok: false;
  status: number;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

const ok = <T>(data: T, status = 200): ServiceSuccess<T> => ({
  data,
  ok: true,
  status,
});

const fail = (error: string, status: number): ServiceFailure => ({
  error,
  ok: false,
  status,
});

const isRlsViolationError = (message: string | undefined) =>
  typeof message === "string" &&
  message.toLowerCase().includes("row-level security policy");

const PROBLEM_STATEMENT_DETAIL_KEYS = [
  "problemStatementId",
  "problemStatementTitle",
  "problemStatementCap",
  "problemStatementLockedAt",
] as const;

const PRESENTATION_DETAIL_KEYS = [
  "presentationPublicUrl",
  "presentationStoragePath",
  "presentationUploadedAt",
  "presentationFileName",
  "presentationMimeType",
  "presentationFileSizeBytes",
] as const;

type ServiceContext = {
  supabase: RouteSupabaseClient;
  userId: string;
};

type CreateTeamInput = {
  lockToken: string;
  problemStatementId: string;
  team: TeamSubmission;
};

type PatchTeamInput = {
  lock?: {
    lockToken: string;
    problemStatementId: string;
  };
  team: TeamSubmission;
};

type SubmitPresentationInput = {
  file: File;
  teamId: string;
};

export const listTeams = async ({
  supabase,
  userId,
}: ServiceContext): Promise<
  ServiceResult<{ teams: ReturnType<typeof toTeamSummary>[] }>
> => {
  const { data, error } = await listRegistrationsForUser(supabase, userId);

  if (error) {
    return fail("Failed to fetch registrations.", 500);
  }

  const teams = ((data ?? []) as RegistrationRow[]).map((row) =>
    toTeamSummary(row),
  );

  return ok({ teams });
};

export const createTeam = async ({
  input,
  supabase,
  userEmail,
  userId,
}: ServiceContext & {
  input: CreateTeamInput;
  userEmail?: string;
}): Promise<ServiceResult<{ team: { id: string } }>> => {
  const problemStatement = getProblemStatementById(input.problemStatementId);

  if (!problemStatement) {
    return fail("Problem statement not found.", 400);
  }

  const lockVerification = verifyProblemLockToken({
    problemStatementId: problemStatement.id,
    token: input.lockToken,
    userId,
  });

  if (!lockVerification.valid) {
    return fail(lockVerification.error, 400);
  }

  const teamDetails = withSrmEmailNetIds(input.team);
  const details: Record<string, unknown> = {
    ...teamDetails,
    problemStatementCap: PROBLEM_STATEMENT_CAP,
    problemStatementId: problemStatement.id,
    problemStatementLockedAt: new Date(
      lockVerification.payload.iat,
    ).toISOString(),
    problemStatementTitle: problemStatement.title,
  };

  const { data: existingRegistration, error: existingRegistrationError } =
    await findAnyRegistrationForUser(supabase, userId);

  if (existingRegistrationError) {
    return fail("Failed to validate existing registrations.", 500);
  }

  if (existingRegistration) {
    return fail("You have already registered for this event.", 409);
  }

  const { data: statementRows, error: statementRowsError } =
    await listProblemStatementRows(supabase);

  if (statementRowsError) {
    return fail("Failed to check statement availability.", 500);
  }

  const registeredCount = countProblemStatementRegistrations(
    (statementRows ?? []) as ProblemStatementCountRow[],
    problemStatement.id,
  );

  if (registeredCount >= PROBLEM_STATEMENT_CAP) {
    return fail("This problem statement is currently unavailable.", 409);
  }

  const { data, error } = await insertRegistration({
    details,
    registrationEmail: userEmail ?? "",
    supabase,
    userId,
  });

  if (error || !data) {
    return fail(error?.message || "Failed to create registration.", 500);
  }

  const teamId = typeof data.id === "string" ? data.id : null;

  if (!teamId || !UUID_PATTERN.test(teamId)) {
    return fail("Failed to create registration.", 500);
  }

  return ok({ team: { id: teamId } }, 201);
};

export const deleteTeamByQueryId = async ({
  id,
  supabase,
  userId,
}: ServiceContext & {
  id: string | null | undefined;
}): Promise<ServiceResult<{ teams: ReturnType<typeof toTeamSummary>[] }>> => {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return fail("Team id is required.", 400);
  }

  if (!UUID_PATTERN.test(normalizedId)) {
    return fail("Team id is invalid.", 400);
  }

  const { data: deleted, error: deleteError } =
    await deleteRegistrationByQueryIdForUser({
      id: normalizedId,
      supabase,
      userId,
    });

  if (deleteError) {
    return fail("Failed to remove team.", 500);
  }

  if (!deleted) {
    return fail("Team not found.", 404);
  }

  const { data, error } = await listRegistrationsForUser(supabase, userId);

  if (error) {
    return fail(error.message || "Failed to delete team.", 500);
  }

  const teams = ((data ?? []) as RegistrationRow[]).map((row) =>
    toTeamSummary(row),
  );

  return ok({ teams });
};

export const getTeam = async ({
  supabase,
  teamId,
  userId,
}: ServiceContext & {
  teamId: string;
}): Promise<
  ServiceResult<{ team: NonNullable<ReturnType<typeof toTeamRecord>> }>
> => {
  if (!UUID_PATTERN.test(teamId)) {
    return fail("Team id is invalid.", 400);
  }

  const { data, error } = await findRegistrationByTeamIdForUser(
    supabase,
    teamId,
    userId,
  );

  if (error) {
    return fail(error.message || "Failed to fetch team.", 500);
  }

  if (!data) {
    return fail("Team not found.", 404);
  }

  const team = toTeamRecord(data as RegistrationRow);
  if (!team) {
    return fail("Team data is incomplete or outdated.", 422);
  }

  return ok({ team });
};

export const patchTeam = async ({
  input,
  supabase,
  teamId,
  userId,
}: ServiceContext & {
  input: PatchTeamInput;
  teamId: string;
}): Promise<
  ServiceResult<{ team: NonNullable<ReturnType<typeof toTeamRecord>> }>
> => {
  if (!UUID_PATTERN.test(teamId)) {
    return fail("Team id is invalid.", 400);
  }

  const { data: existingTeam, error: existingTeamError } =
    await findRegistrationByTeamIdForUser(supabase, teamId, userId);

  if (existingTeamError) {
    return fail(existingTeamError.message || "Failed to fetch team.", 500);
  }

  if (!existingTeam) {
    return fail("Team not found.", 404);
  }

  const existingDetails =
    existingTeam.details && typeof existingTeam.details === "object"
      ? (existingTeam.details as Record<string, unknown>)
      : {};
  const existingStatementId = getProblemStatementIdFromDetails(existingDetails);

  const updatedDetails: Record<string, unknown> = {
    ...withSrmEmailNetIds(input.team),
  };

  for (const key of PROBLEM_STATEMENT_DETAIL_KEYS) {
    const value = existingDetails[key];

    if (typeof value === "string" && value.trim().length > 0) {
      updatedDetails[key] = value;
      continue;
    }

    if (
      key === "problemStatementCap" &&
      typeof value === "number" &&
      Number.isInteger(value) &&
      value > 0
    ) {
      updatedDetails[key] = value;
    }
  }

  for (const key of PRESENTATION_DETAIL_KEYS) {
    const value = existingDetails[key];

    if (typeof value === "string" && value.trim().length > 0) {
      updatedDetails[key] = value;
      continue;
    }

    if (
      key === "presentationFileSizeBytes" &&
      typeof value === "number" &&
      Number.isInteger(value) &&
      value > 0
    ) {
      updatedDetails[key] = value;
    }
  }

  if (input.lock) {
    if (existingStatementId) {
      return fail("A problem statement is already locked for this team.", 409);
    }

    const problemStatement = getProblemStatementById(
      input.lock.problemStatementId,
    );

    if (!problemStatement) {
      return fail("Problem statement not found.", 400);
    }

    const lockVerification = verifyProblemLockToken({
      problemStatementId: problemStatement.id,
      token: input.lock.lockToken,
      userId,
    });

    if (!lockVerification.valid) {
      return fail(lockVerification.error, 400);
    }

    const { data: statementRows, error: statementRowsError } =
      await listProblemStatementRows(supabase);

    if (statementRowsError) {
      return fail("Failed to check statement availability.", 500);
    }

    const registeredCount = countProblemStatementRegistrations(
      (statementRows ?? []) as ProblemStatementCountRow[],
      problemStatement.id,
    );

    if (registeredCount >= PROBLEM_STATEMENT_CAP) {
      return fail("This problem statement is currently unavailable.", 409);
    }

    updatedDetails.problemStatementId = problemStatement.id;
    updatedDetails.problemStatementTitle = problemStatement.title;
    updatedDetails.problemStatementCap = PROBLEM_STATEMENT_CAP;
    updatedDetails.problemStatementLockedAt = new Date(
      lockVerification.payload.iat,
    ).toISOString();
  }

  const { data, error } = await updateRegistrationDetailsByTeamIdForUser({
    details: updatedDetails,
    supabase,
    teamId,
    userId,
  });

  if (error) {
    return fail(error.message || "Failed to update team.", 500);
  }

  if (!data) {
    return fail("Team not found.", 404);
  }

  const team = toTeamRecord(data as RegistrationRow);
  if (!team) {
    return fail("Team data is incomplete or outdated.", 422);
  }

  return ok({ team });
};

export const deleteTeam = async ({
  supabase,
  teamId,
  userId,
}: ServiceContext & {
  teamId: string;
}): Promise<ServiceResult<{ deleted: true }>> => {
  if (!UUID_PATTERN.test(teamId)) {
    return fail("Team id is invalid.", 400);
  }

  const { data: deleted, error } = await deleteRegistrationByTeamIdForUser({
    supabase,
    teamId,
    userId,
  });

  if (error) {
    return fail("Failed to remove team.", 500);
  }

  if (!deleted) {
    return fail("Team not found.", 404);
  }

  return ok({ deleted: true });
};

export const submitTeamPresentation = async ({
  input,
  supabase,
  userId,
}: ServiceContext & {
  input: SubmitPresentationInput;
}): Promise<
  ServiceResult<{ team: NonNullable<ReturnType<typeof toTeamRecord>> }>
> => {
  if (!UUID_PATTERN.test(input.teamId)) {
    return fail("Team id is invalid.", 400);
  }

  const file = input.file;
  const fileName = file.name.trim();
  if (!fileName) {
    return fail("Presentation file is required.", 400);
  }

  if (file.size <= 0) {
    return fail("Presentation file is empty.", 400);
  }

  if (file.size > PRESENTATION_MAX_FILE_SIZE_BYTES) {
    return fail("Presentation file size must be 5 MB or less.", 400);
  }

  if (!isPresentationExtensionAllowed(fileName)) {
    return fail("Only .ppt or .pptx files are allowed.", 400);
  }

  if (file.type && !isPresentationMimeTypeAllowed(file.type)) {
    return fail("Invalid presentation file type.", 400);
  }

  const { data: existingTeam, error: existingTeamError } =
    await findRegistrationByTeamIdForUser(supabase, input.teamId, userId);

  if (existingTeamError) {
    return fail(existingTeamError.message || "Failed to fetch team.", 500);
  }

  if (!existingTeam) {
    return fail("Team not found.", 404);
  }

  const existingDetails =
    existingTeam.details && typeof existingTeam.details === "object"
      ? (existingTeam.details as Record<string, unknown>)
      : {};
  const existingStatementId = getProblemStatementIdFromDetails(existingDetails);

  if (!existingStatementId) {
    return fail("Lock a problem statement before submitting your PPT.", 409);
  }

  if (
    typeof existingDetails.presentationPublicUrl === "string" &&
    existingDetails.presentationPublicUrl.trim().length > 0
  ) {
    return fail("Presentation already submitted for this team.", 409);
  }

  const extension = getPresentationExtension(fileName);
  const storagePath = `${userId}/${input.teamId}/submission${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PRESENTATION_BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    if (isRlsViolationError(uploadError.message)) {
      return fail(
        "Presentation upload is blocked by Supabase Storage policy. Please ask an admin to allow authenticated uploads to the foundathon-presentation bucket.",
        500,
      );
    }

    return fail(uploadError.message || "Failed to upload presentation.", 500);
  }

  const { data: publicUrlData } = supabase.storage
    .from(PRESENTATION_BUCKET_NAME)
    .getPublicUrl(storagePath);

  const presentationPublicUrl = publicUrlData.publicUrl;
  const updatedDetails: Record<string, unknown> = {
    ...existingDetails,
    presentationFileName: fileName,
    presentationFileSizeBytes: file.size,
    presentationMimeType: file.type || "application/octet-stream",
    presentationPublicUrl,
    presentationStoragePath: storagePath,
    presentationUploadedAt: new Date().toISOString(),
  };

  const { data, error } = await updateRegistrationDetailsByTeamIdForUser({
    details: updatedDetails,
    supabase,
    teamId: input.teamId,
    userId,
  });

  if (error || !data) {
    await supabase.storage
      .from(PRESENTATION_BUCKET_NAME)
      .remove([storagePath])
      .catch(() => undefined);
    return fail(error?.message || "Failed to save presentation details.", 500);
  }

  const team = toTeamRecord(data as RegistrationRow);
  if (!team) {
    return fail("Team data is incomplete or outdated.", 422);
  }

  return ok({ team });
};
