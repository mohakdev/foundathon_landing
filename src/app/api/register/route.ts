import { type NextRequest, NextResponse } from "next/server";
import {
  createSupabaseClient,
  EVENT_ID,
  getSupabaseCredentials,
  JSON_HEADERS,
  type RegistrationRow,
  toTeamRecord,
  toTeamSummary,
  transformToLegacyFormat,
  UUID_PATTERN,
} from "@/lib/register-api";
import { teamSubmissionSchema } from "@/lib/register-schema";

const isJsonRequest = (request: NextRequest) =>
  request.headers.get("content-type")?.includes("application/json");

const parseRequestJson = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const missingSupabaseConfigResponse = () =>
  NextResponse.json(
    { error: "Supabase environment variables are not configured." },
    { status: 500, headers: JSON_HEADERS },
  );

export async function GET() {
  const credentials = getSupabaseCredentials();
  if (!credentials) return missingSupabaseConfigResponse();

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, updated_at, details")
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch registrations." },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const teams = (data ?? []).map((row) =>
    toTeamSummary(row as RegistrationRow),
  );
  return NextResponse.json({ teams }, { headers: JSON_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415, headers: JSON_HEADERS },
    );
  }

  const body = await parseRequestJson(request);
  if (body === null) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const parsed = teamSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) return missingSupabaseConfigResponse();

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("eventsregistrations")
    .select("id")
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "Failed to check existing registration." },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "You have already registered for this event." },
      { status: 409, headers: JSON_HEADERS },
    );
  }

  const legacyDetails = transformToLegacyFormat(parsed.data);
  const { data, error } = await supabase
    .from("eventsregistrations")
    .insert([
      {
        event_id: EVENT_ID,
        event_title: "Foundathon 3.0",
        application_id: user.id,
        details: legacyDetails,
        registration_email: user.email,
        is_team_entry: true,
      },
    ])
    .select("id, created_at, updated_at, details")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to register team." },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const row = data as RegistrationRow;
  return NextResponse.json(
    {
      team: toTeamRecord(row) ?? { id: row.id },
      teams: [toTeamSummary(row)],
    },
    { status: 201, headers: JSON_HEADERS },
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Team id is required." },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) return missingSupabaseConfigResponse();

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("eventsregistrations")
    .delete()
    .eq("id", id)
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove team." },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  if (!deleted) {
    return NextResponse.json(
      { error: "Team not found." },
      { status: 404, headers: JSON_HEADERS },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, updated_at, details")
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Deleted team, but failed to refresh list." },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const teams = (data ?? []).map((row) =>
    toTeamSummary(row as RegistrationRow),
  );
  return NextResponse.json({ teams }, { headers: JSON_HEADERS });
}
