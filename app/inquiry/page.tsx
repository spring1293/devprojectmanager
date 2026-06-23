import { getRepositories } from "@/lib/firestore";
import InquiryClient from "./InquiryClient";

export const dynamic = "force-dynamic";

export default async function InquiryPage() {
  const repositories = await getRepositories();
  return <InquiryClient repositories={repositories} />;
}
