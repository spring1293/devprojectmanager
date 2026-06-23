import { getInquiryById } from "@/lib/firestore";
import { notFound } from "next/navigation";
import OpsDetailClient from "./OpsDetailClient";

export const dynamic = "force-dynamic";

export default async function OpsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiryById(id);
  if (!inquiry) notFound();
  return <OpsDetailClient inquiry={inquiry} />;
}
