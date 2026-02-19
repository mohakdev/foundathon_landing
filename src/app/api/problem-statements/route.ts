import { NextResponse } from "next/server";
import {
  PROBLEM_STATEMENT_CAP,
  PROBLEM_STATEMENTS,
} from "@/data/problem-statements";
import {
  createSupabaseClient,
  EVENT_ID,
  getSupabaseCredentials,
  JSON_HEADERS,
} from "@/lib/register-api";

type ProblemStatementCountRow = {
  details: Record<string, unknown> | null;
};

const missingSupabaseConfigResponse = () =>
  NextResponse.json(
    { error: "Supabase environment variables are not configured." },
    { headers: JSON_HEADERS, status: 500 },
  );

const getProblemStatementId = (details: Record<string, unknown> | null) => {
  if (!details) {
    return null;
  }

  const value = details.problemStatementId;
  return typeof value === "string" && value.length > 0 ? value : null;
};

export async function GET() {
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: JSON_HEADERS, status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("details")
    .eq("event_id", EVENT_ID);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch problem statement availability." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as ProblemStatementCountRow[]) {
    const statementId = getProblemStatementId(row.details);
    if (!statementId) {
      continue;
    }

    counts.set(statementId, (counts.get(statementId) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      statements: PROBLEM_STATEMENTS.map((statement) => {
        const registeredCount = counts.get(statement.id) ?? 0;
        const remaining = Math.max(PROBLEM_STATEMENT_CAP - registeredCount, 0);

        return {
          cap: PROBLEM_STATEMENT_CAP,
          id: statement.id,
          isFull: remaining === 0,
          registeredCount,
          remaining,
          summary: statement.summary,
          title: statement.title,
        };
      }),
    },
    { headers: JSON_HEADERS },
  );
}
