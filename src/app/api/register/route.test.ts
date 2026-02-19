import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
  getSupabaseCredentials: vi.fn(),
  toTeamSummary: vi.fn(),
  verifyProblemLockToken: vi.fn(),
  withSrmEmailNetIds: vi.fn(),
}));

vi.mock("@/lib/register-api", () => ({
  createSupabaseClient: mocks.createSupabaseClient,
  EVENT_ID: "583a3b40-da9d-412a-a266-cc7e64330b16",
  EVENT_TITLE: "Foundathon 3.0",
  getSupabaseCredentials: mocks.getSupabaseCredentials,
  JSON_HEADERS: { "Cache-Control": "no-store" },
  toTeamSummary: mocks.toTeamSummary,
  UUID_PATTERN:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  withSrmEmailNetIds: mocks.withSrmEmailNetIds,
}));

vi.mock("@/lib/problem-lock-token", () => ({
  verifyProblemLockToken: mocks.verifyProblemLockToken,
}));

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-01-01T00:00:00.000Z",
  details: {},
  updated_at: "2026-01-01T00:00:00.000Z",
};

const summary = {
  createdAt: row.created_at,
  id: row.id,
  leadName: "Lead",
  memberCount: 3,
  teamName: "Alpha",
  teamType: "srm" as const,
  updatedAt: row.updated_at,
};

const teamPayload = {
  teamType: "srm",
  teamName: "Board Breakers",
  lead: {
    name: "Lead",
    raNumber: "RA0000000000001",
    netId: "od7270",
    dept: "CSE",
    contact: 9876543210,
  },
  members: [
    {
      name: "M1",
      raNumber: "RA0000000000002",
      netId: "ab1234",
      dept: "CSE",
      contact: 9876543211,
    },
    {
      name: "M2",
      raNumber: "RA0000000000003",
      netId: "cd5678",
      dept: "ECE",
      contact: 9876543212,
    },
  ],
} as const;

describe("/api/register route", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createSupabaseClient.mockReset();
    mocks.getSupabaseCredentials.mockReset();
    mocks.toTeamSummary.mockReset();
    mocks.verifyProblemLockToken.mockReset();
    mocks.withSrmEmailNetIds.mockReset();

    mocks.getSupabaseCredentials.mockReturnValue({
      anonKey: "anon",
      url: "http://localhost",
    });
    mocks.toTeamSummary.mockReturnValue(summary);
    mocks.withSrmEmailNetIds.mockImplementation((payload) => payload);
    mocks.verifyProblemLockToken.mockReturnValue({
      payload: { iat: Date.parse("2026-02-19T08:00:00.000Z") },
      valid: true,
    });
  });

  it("GET returns 401 for unauthenticated users", async () => {
    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from: vi.fn(),
    });

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("GET returns summarized teams", async () => {
    const order = vi.fn().mockResolvedValue({ data: [row], error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ order }),
        }),
      }),
    });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    });

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([summary]);
    expect(mocks.toTeamSummary).toHaveBeenCalledWith(row);
  });

  it("POST rejects invalid payload", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      body: JSON.stringify({ team: { teamType: "srm" } }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
  });

  it("POST rejects invalid lock tokens", async () => {
    mocks.verifyProblemLockToken.mockReturnValue({
      error: "Lock token is malformed.",
      valid: false,
    });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "lead@example.com", id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    });

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      body: JSON.stringify({
        lockToken: "bad",
        problemStatementId: "ps-01",
        team: teamPayload,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("malformed");
  });

  it("POST creates team with direct insert for valid input", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const existingSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    });

    const countEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const countSelect = vi.fn().mockReturnValue({ eq: countEq });

    const single = vi.fn().mockResolvedValue({
      data: { id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });
    const selectInserted = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select: selectInserted });

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ select: countSelect })
      .mockReturnValueOnce({ insert });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "lead@example.com", id: "user-1" } },
          error: null,
        }),
      },
      from,
    });

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      body: JSON.stringify({
        lockToken: "token-1",
        problemStatementId: "ps-01",
        team: teamPayload,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.team.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(mocks.verifyProblemLockToken).toHaveBeenCalledWith({
      problemStatementId: "ps-01",
      token: "token-1",
      userId: "user-1",
    });

    expect(insert).toHaveBeenCalledTimes(1);
    const insertedRecord = insert.mock.calls[0][0][0];
    expect(insertedRecord.event_id).toBe(
      "583a3b40-da9d-412a-a266-cc7e64330b16",
    );
    expect(insertedRecord.event_title).toBe("Foundathon 3.0");
    expect(insertedRecord.application_id).toBe("user-1");
    expect(insertedRecord.registration_email).toBe("lead@example.com");
    expect(insertedRecord.details.problemStatementId).toBe("ps-01");
    expect(insertedRecord.details.problemStatementTitle).toBe(
      "Campus Mobility Optimizer",
    );
  });

  it("POST returns 409 when statement cap is already reached", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const existingSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    });

    const fullRows = Array.from({ length: 10 }).map(() => ({
      details: { problemStatementId: "ps-01" },
    }));
    const countEq = vi.fn().mockResolvedValue({ data: fullRows, error: null });
    const countSelect = vi.fn().mockReturnValue({ eq: countEq });

    const insert = vi.fn();
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ select: countSelect })
      .mockReturnValueOnce({ insert });

    mocks.createSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "lead@example.com", id: "user-1" } },
          error: null,
        }),
      },
      from,
    });

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      body: JSON.stringify({
        lockToken: "token-1",
        problemStatementId: "ps-01",
        team: teamPayload,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("cap");
    expect(insert).not.toHaveBeenCalled();
  });

  it("DELETE rejects invalid id format", async () => {
    const { DELETE } = await import("./route");
    const req = new NextRequest("http://localhost/api/register?id=not-a-uuid", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("invalid");
  });
});
