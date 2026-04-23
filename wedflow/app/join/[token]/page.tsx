import { getInviteByToken } from "@/app/circle/actions";
import JoinClient from "./JoinClient";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  return <JoinClient token={token} invite={invite} />;
}
