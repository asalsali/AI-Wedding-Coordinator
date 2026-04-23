import { redirect } from "next/navigation";
import { getPortalContext } from "@/app/circle/actions";
import PortalClient from "./PortalClient";

export default async function PortalPage() {
  const context = await getPortalContext();

  if (!context) {
    redirect("/sign-in");
  }

  return (
    <PortalClient
      member={context.member}
      coupleName={context.coupleName}
      initialTasks={context.tasks}
      initialConversations={context.conversations}
    />
  );
}
