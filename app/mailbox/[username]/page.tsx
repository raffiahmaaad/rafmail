import { MailboxPageClient } from "./mailbox-page-client";
import { redirect } from "next/navigation";

export default async function MailboxPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = (await params).username;
  const decoded = decodeURIComponent(username);

  // Validate username
  if (!decoded || decoded.length < 3) {
    redirect("/");
  }

  return <MailboxPageClient username={decoded} />;
}
