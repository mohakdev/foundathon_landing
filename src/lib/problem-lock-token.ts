import { createHmac, timingSafeEqual } from "node:crypto";

export const PROBLEM_LOCK_TOKEN_TTL_MS = 30 * 60 * 1000;

type SecretOptions = {
  secret?: string;
};

type ProblemLockTokenPayload = {
  exp: number;
  iat: number;
  problemStatementId: string;
  userId: string;
  version: 1;
};

type CreateProblemLockTokenInput = {
  problemStatementId: string;
  ttlMs?: number;
  userId: string;
};

type VerifyProblemLockTokenInput = {
  nowMs?: number;
  problemStatementId: string;
  token: string;
  userId: string;
};

type VerifyProblemLockTokenResult =
  | { valid: true; payload: ProblemLockTokenPayload }
  | { error: string; valid: false };

const getSecret = (providedSecret?: string) => {
  const secret = providedSecret ?? process.env.PROBLEM_LOCK_TOKEN_SECRET;
  if (!secret) {
    throw new Error("PROBLEM_LOCK_TOKEN_SECRET is not configured.");
  }

  return secret;
};

const toBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const fromBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (encodedPayload: string, secret: string) =>
  createHmac("sha256", secret).update(encodedPayload).digest("base64url");

export const createProblemLockToken = (
  input: CreateProblemLockTokenInput,
  options: SecretOptions = {},
) => {
  const secret = getSecret(options.secret);
  const nowMs = Date.now();
  const ttlMs = input.ttlMs ?? PROBLEM_LOCK_TOKEN_TTL_MS;

  const payload: ProblemLockTokenPayload = {
    exp: nowMs + ttlMs,
    iat: nowMs,
    problemStatementId: input.problemStatementId,
    userId: input.userId,
    version: 1,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);

  return {
    expiresAt: new Date(payload.exp).toISOString(),
    token: `${encodedPayload}.${signature}`,
  };
};

export const verifyProblemLockToken = (
  input: VerifyProblemLockTokenInput,
  options: SecretOptions = {},
): VerifyProblemLockTokenResult => {
  const secret = getSecret(options.secret);
  const [encodedPayload, signature] = input.token.split(".");

  if (!encodedPayload || !signature) {
    return { error: "Lock token is malformed.", valid: false };
  }

  const expectedSignature = sign(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { error: "Lock token signature is invalid.", valid: false };
  }

  let payload: ProblemLockTokenPayload;
  try {
    payload = JSON.parse(
      fromBase64Url(encodedPayload),
    ) as ProblemLockTokenPayload;
  } catch {
    return { error: "Lock token payload is invalid.", valid: false };
  }

  if (payload.version !== 1) {
    return { error: "Lock token version is unsupported.", valid: false };
  }

  if (payload.userId !== input.userId) {
    return { error: "Lock token does not belong to this user.", valid: false };
  }

  if (payload.problemStatementId !== input.problemStatementId) {
    return {
      error: "Lock token does not match the selected problem statement.",
      valid: false,
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (payload.exp <= nowMs) {
    return { error: "Lock token has expired.", valid: false };
  }

  return { payload, valid: true };
};
