import { createClient } from "@/lib/supabase-server";
import { CategoriesClient } from "@/components/CategoriesClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CategoriesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please log in.</div>;
    }

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-32">
            <header className="flex items-center gap-4 mt-4">
                <Link href="/" className="text-stone-400 hover:text-stone-900 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="font-bold text-stone-900 tracking-tight text-xl">Manage Categories</h1>
            </header>

            <CategoriesClient initialCategories={categories || []} />
        </main>
    );
}
