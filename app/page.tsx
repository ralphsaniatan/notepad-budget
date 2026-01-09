import { getDashboardData } from "./actions";
import { DashboardClient } from "@/components/DashboardClient";
import { Suspense } from "react";
import { PaperCard } from "@/components/ui/PaperCard";

// Force dynamic because we rely on real-time DB data
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const dashboardData = await getDashboardData();
  return <DashboardClient initialData={dashboardData} />;
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-40">
      {/* Header */}
      <header className="flex justify-between items-center mt-4">
        <div className="h-6 w-32 bg-stone-200 rounded animate-pulse"></div>
        <div className="h-6 w-24 bg-stone-200 rounded animate-pulse"></div>
      </header>

      {/* Hero */}
      <PaperCard className="h-64 bg-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-4 w-24 bg-stone-100 mx-auto rounded"></div>
          <div className="h-16 w-48 bg-stone-100 mx-auto rounded animate-pulse"></div>
        </div>
      </PaperCard>

      {/* List */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 w-full bg-stone-50 rounded animate-pulse"></div>
        ))}
      </div>
    </main>
  )
}
