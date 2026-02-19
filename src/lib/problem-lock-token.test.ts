import { describe, expect, it } from "vitest";
import {
  createProblemLockToken,
  verifyProblemLockToken,
} from "@/lib/problem-lock-token";

const SECRET = "test-lock-secret";

describe("problem lock token", () => {
  it("validates a correct token", () => {
    const { token } = createProblemLockToken(
      {
        problemStatementId: "ps-01",
        ttlMs: 1000,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    const result = verifyProblemLockToken(
      {
        problemStatementId: "ps-01",
        token,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    expect(result.valid).toBe(true);
  });

  it("rejects tampered tokens", () => {
    const { token } = createProblemLockToken(
      {
        problemStatementId: "ps-01",
        ttlMs: 1000,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    const [payload, signature] = token.split(".");
    const tamperedToken = `${payload}.x${signature?.slice(1)}`;

    const result = verifyProblemLockToken(
      {
        problemStatementId: "ps-01",
        token: tamperedToken,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("signature");
    }
  });

  it("rejects tokens used by a different user", () => {
    const { token } = createProblemLockToken(
      {
        problemStatementId: "ps-01",
        ttlMs: 1000,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    const result = verifyProblemLockToken(
      {
        problemStatementId: "ps-01",
        token,
        userId: "user-2",
      },
      { secret: SECRET },
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("belong");
    }
  });

  it("rejects expired tokens", () => {
    const now = Date.now();
    const { token } = createProblemLockToken(
      {
        problemStatementId: "ps-01",
        ttlMs: 1,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    const result = verifyProblemLockToken(
      {
        nowMs: now + 1000,
        problemStatementId: "ps-01",
        token,
        userId: "user-1",
      },
      { secret: SECRET },
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("expired");
    }
  });
});
