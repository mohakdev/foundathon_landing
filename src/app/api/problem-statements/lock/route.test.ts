import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createProblemLockToken: vi.fn(),
  createSupabaseClient: vi.fn(),
  getSupabaseCredentials: vi.fn(),
}));

vi.mock("@/lib/register-api", () => ({
  createSupabaseClient: mocks.createSupabaseClient,
  EVENT_ID: "event-1",
  getSupabaseCredentials: mocks.getSupabaseCredentials,
  JSON_HEADERS: { "Cache-Control": "no-store" },
}));

vi.mock("@/lib/problem-lock-token", () => ({
  createProblemLockToken: mocks.createProblemLockToken,
}));

describe("/api/problem-statements/lock POST", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.createSupabaseClient.mockReset();
    mocks.getSupabaseCredentials.mockReset();
    mocks.createProblemLockToken.mockReset();

    mocks.getSupabaseCredentials.mockReturnValue({
      anonKey: "anon",
      url: "http://localhost",
    });

    mocks.createProblemLockToken.mockReturnValue({
      expiresAt: "2026-02-20T00:00:00.000Z",
      token: "token-1",
    });
  });

  it("rejects unknown problem statement ids", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/problem-statements/lock",
      {
        body: JSON.stringify({ problemStatementId: "missing" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("not found");
    expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects full problem statements", async () => {
    const fullRows = Array.from({ length: 10 }).map(() => ({
      details: { problemStatementId: "ps-01" },
    }));

    const eqByEvent = vi
      .fn()
      .mockResolvedValue({ data: fullRows, error: null });
    const select = vi.fn().mockReturnValue({ eq: eqByEvent });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select }),
    });

    const { POST } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/problem-statements/lock",
      {
        body: JSON.stringify({ problemStatementId: "ps-01" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("cap");
  });

  it("returns 500 when lock token generation fails", async () => {
    const eqByEvent = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ eq: eqByEvent });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select }),
    });

    mocks.createProblemLockToken.mockImplementation(() => {
      throw new Error("token failed");
    });

    const { POST } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/problem-statements/lock",
      {
        body: JSON.stringify({ problemStatementId: "ps-01" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("token failed");
  });

  it("returns lock token for valid requests", async () => {
    const eqByEvent = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ eq: eqByEvent });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select }),
    });

    const { POST } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/problem-statements/lock",
      {
        body: JSON.stringify({ problemStatementId: "ps-01" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.locked).toBe(true);
    expect(body.problemStatement.id).toBe("ps-01");
    expect(body.lockToken).toBe("token-1");
    expect(body.lockExpiresAt).toBe("2026-02-20T00:00:00.000Z");
    expect(mocks.createProblemLockToken).toHaveBeenCalledWith({
      problemStatementId: "ps-01",
      userId: "user-1",
    });
  });
});
