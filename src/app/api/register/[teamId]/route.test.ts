import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readTeamsMock = vi.fn();
const writeTeamsMock = vi.fn();

vi.mock("@/lib/register-store", () => ({
  readTeams: readTeamsMock,
  writeTeams: writeTeamsMock,
}));

const makeParams = (teamId: string) => ({
  params: Promise.resolve({ teamId }),
});

describe("/api/register/[teamId] route", () => {
  beforeEach(() => {
    readTeamsMock.mockReset();
    writeTeamsMock.mockReset();
  });

  it("GET returns team when id exists", async () => {
    readTeamsMock.mockResolvedValueOnce([{ id: "t1", teamType: "srm" }]);
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/register/t1");

    const res = await GET(req, makeParams("t1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.team.id).toBe("t1");
  });

  it("PATCH updates existing team", async () => {
    const existing = {
      id: "t1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      teamType: "srm",
      teamName: "Old Team",
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
    };

    readTeamsMock.mockResolvedValueOnce([existing]);
    writeTeamsMock.mockResolvedValueOnce(undefined);

    const { PATCH } = await import("./route");
    const req = new NextRequest("http://localhost/api/register/t1", {
      method: "PATCH",
      body: JSON.stringify({
        teamType: "srm",
        teamName: "New Team",
        lead: existing.lead,
        members: existing.members,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PATCH(req, makeParams("t1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.team.teamName).toBe("New Team");
    expect(writeTeamsMock).toHaveBeenCalledTimes(1);
  });

  it("DELETE removes team by route param", async () => {
    readTeamsMock.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await import("./route");
    const req = new NextRequest("http://localhost/api/register/t1", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams("t1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([{ id: "t2" }]);
  });
});
