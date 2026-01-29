import { getSavingsGoals } from "@/app/actions";
import { SavingsClient } from "@/components/SavingsClient";

export const metadata = {
    title: "Money Goals | Notepad Budget",
    description: "Track your sinking funds and future expenses.",
};

export const dynamic = 'force-dynamic';

export default async function SavingsPage() {
    const goals = await getSavingsGoals();
    return <SavingsClient initialGoals={goals} />;
}
