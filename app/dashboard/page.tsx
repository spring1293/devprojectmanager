import { getAllBranches, getInquiries, getRepositories } from "@/lib/firestore";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [branches, inquiries, repositories] = await Promise.all([
    getAllBranches(),
    getInquiries(),
    getRepositories(),
  ]);
  return (
    <DashboardClient
      branches={branches}
      inquiries={inquiries}
      repositories={repositories}
    />
  );
}
