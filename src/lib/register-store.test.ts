import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe.sequential("register-store", () => {
  const originalCwd = process.cwd();
  let tempRoot = "";

  beforeEach(async () => {
    vi.resetModules();
    tempRoot = await mkdtemp(join(tmpdir(), "foundathon-store-"));
    process.chdir(tempRoot);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("returns [] when data file is missing", async () => {
    const { readTeams } = await import("@/lib/register-store");
    const teams = await readTeams();
    expect(teams).toEqual([]);
  });

  it("migrates SRM records without teamName while reading", async () => {
    const dataDir = join(tempRoot, "data");
    const file = join(dataDir, "register-teams.json");
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      file,
      JSON.stringify([
        {
          id: "t1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamType: "srm",
          lead: {
            name: "Lead",
            raNumber: "RA0000000000001",
            collegeId: "od7270",
            dept: "CSE",
            contact: "9999999999",
          },
          members: [
            {
              name: "M1",
              raNumber: "RA0000000000002",
              collegeId: "ab1234",
              dept: "CSE",
              contact: "8888888888",
            },
            {
              name: "M2",
              raNumber: "RA0000000000003",
              collegeId: "cd5678",
              dept: "ECE",
              contact: "7777777777",
            },
          ],
        },
      ]),
      "utf8",
    );

    const { readTeams } = await import("@/lib/register-store");
    const teams = await readTeams();

    expect(teams).toHaveLength(1);
    expect(teams[0]?.teamName).toBe("SRM Team");
    expect(teams[0]?.lead.netId).toBe("od7270");
    expect(teams[0]?.members[0]?.netId).toBe("ab1234");
    expect(teams[0]?.lead.contact).toBe(9999999999);
  });
});
