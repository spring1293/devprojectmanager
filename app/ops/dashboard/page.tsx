import { getInquiries } from "@/lib/firestore";
import OpsDashboardClient from "./OpsDashboardClient";

export const dynamic = "force-dynamic";

export default async function OpsDashboardPage() {
  const inquiries = await getInquiries();
  return <OpsDashboardClient inquiries={inquiries} />;
}
