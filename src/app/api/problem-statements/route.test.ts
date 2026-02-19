import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
  getSupabaseCredentials: vi.fn(),
}));

vi.mock("@/lib/register-api", () => ({
  createSupabaseClient: mocks.createSupabaseClient,
  EVENT_ID: "event-1",
  getSupabaseCredentials: mocks.getSupabaseCredentials,
  JSON_HEADERS: { "Cache-Control": "no-store" },
}));

describe("/api/problem-statements GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createSupabaseClient.mockReset();
    mocks.getSupabaseCredentials.mockReset();

    mocks.getSupabaseCredentials.mockReturnValue({
      anonKey: "anon",
      url: "http://localhost",
    });
  });

  it("returns 401 for unauthenticated users", async () => {
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
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 15 statements with derived counts", async () => {
    const rows = [
      { details: { problemStatementId: "ps-01" } },
      { details: { problemStatementId: "ps-01" } },
      ...Array.from({ length: 10 }).map(() => ({
        details: { problemStatementId: "ps-03" },
      })),
    ];

    const eqByEvent = vi.fn().mockResolvedValue({ data: rows, error: null });
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

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.statements).toHaveLength(15);

    const ps01 = body.statements.find(
      (item: { id: string }) => item.id === "ps-01",
    );
    const ps03 = body.statements.find(
      (item: { id: string }) => item.id === "ps-03",
    );

    expect(ps01.registeredCount).toBe(2);
    expect(ps01.remaining).toBe(8);
    expect(ps01.isFull).toBe(false);

    expect(ps03.registeredCount).toBe(10);
    expect(ps03.remaining).toBe(0);
    expect(ps03.isFull).toBe(true);
  });
});
