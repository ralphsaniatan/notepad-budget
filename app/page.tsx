import { getDashboardData } from "./actions";
import { DashboardClient } from "@/components/DashboardClient";

// Force dynamic because we rely on real-time DB data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const dashboardData = await getDashboardData();

  return <DashboardClient initialData={dashboardData} />;
}
