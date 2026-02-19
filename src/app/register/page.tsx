import { redirect } from "next/navigation";
import { getAuthUiState } from "@/lib/auth-ui-state";
import RegisterClient from "./register-client";

export default async function RegisterPage() {
  const { teamId } = await getAuthUiState();

  if (teamId) {
    redirect(`/team/${teamId}`);
  }

  return <RegisterClient />;
}
