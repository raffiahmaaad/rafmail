import { AddressPageClient } from "./address-page-client";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const address = (await params).address;
  const decoded = decodeURIComponent(address);

  // Simple validation - must contain @
  if (!decoded.includes("@")) {
    redirect("/");
  }

  return <AddressPageClient address={decoded} />;
}
