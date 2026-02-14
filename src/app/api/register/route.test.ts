import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readTeamsMock = vi.fn();
const writeTeamsMock = vi.fn();

vi.mock("@/lib/register-store", () => ({
  readTeams: readTeamsMock,
  writeTeams: writeTeamsMock,
}));

describe("/api/register route", () => {
  beforeEach(() => {
    readTeamsMock.mockReset();
    writeTeamsMock.mockReset();
  });

  it("GET returns teams", async () => {
    readTeamsMock.mockResolvedValueOnce([{ id: "a" }]);
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([{ id: "a" }]);
  });

  it("POST rejects invalid payload", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({ teamType: "srm" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("POST accepts valid payload and persists", async () => {
    readTeamsMock.mockResolvedValueOnce([]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        teamType: "srm",
        teamName: "Board Breakers",
        lead: {
          name: "Lead",
          raNumber: "RA0000000000001",
          netId: "od7270",
          dept: "CSE",
          contact: 9999999999,
        },
        members: [
          {
            name: "M1",
            raNumber: "RA0000000000002",
            netId: "ab1234",
            dept: "CSE",
            contact: 8888888888,
          },
          {
            name: "M2",
            raNumber: "RA0000000000003",
            netId: "cd5678",
            dept: "ECE",
            contact: 7777777777,
          },
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.team.teamName).toBe("Board Breakers");
    expect(writeTeamsMock).toHaveBeenCalledTimes(1);
  });

  it("DELETE removes team by query id", async () => {
    readTeamsMock.mockResolvedValueOnce([{ id: "x1" }, { id: "x2" }]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await import("./route");
    const req = new NextRequest("http://localhost/api/register?id=x1", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([{ id: "x2" }]);
    expect(writeTeamsMock).toHaveBeenCalledWith([{ id: "x2" }]);
  });
});
