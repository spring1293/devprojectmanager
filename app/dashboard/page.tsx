import { getAllBranches } from "@/lib/firestore";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const branches = await getAllBranches();
  return <DashboardClient branches={branches} />;
}
