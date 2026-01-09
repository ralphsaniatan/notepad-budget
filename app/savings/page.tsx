import { getSavingsGoals } from "@/app/actions";
import { SavingsClient } from "@/components/SavingsClient";

export const dynamic = 'force-dynamic';

export default async function SavingsPage() {
    const goals = await getSavingsGoals();
    return <SavingsClient initialGoals={goals} />;
}
