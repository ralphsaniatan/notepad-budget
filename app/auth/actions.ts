"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
    let email = formData.get("email") as string; // User might enter "Ralph"
    const password = formData.get("password") as string;
    const supabase = await createClient();

    // UNTESTED: Username Resolution
    // If no '@', assume it's a username and look up the real email
    if (!email.includes('@')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .ilike('username', email)
            .single();

        if (profile?.email) {
            email = profile.email;
        } else {
            return { error: "Username not found. Please try your email." };
        }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signUp(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;
    const supabase = await createClient();

    const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: displayName,
            }
        }
    });

    if (error) {
        return { error: error.message };
    }

    // Insert into Public Profile (for Username Login)
    if (authData.user) {
        await supabase.from('profiles').insert({
            id: authData.user.id,
            username: displayName,
            email: email
        });
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function loginAsGuest() {
    const supabase = await createClient();
    const timestamp = Date.now();
    const email = `guest_${timestamp}@budget.local`;
    const password = `guest_${timestamp}_pwd`; // Simple random password

    // Auto-signup and login
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                is_guest: true,
                full_name: "Guest User"
            }
        }
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signOut() {
    const supabase = await createClient();

    // Check if guest and wipe data
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.user_metadata?.is_guest) {
        console.log("Wiping Guest Data for:", user.id);

        // Parallel Delete
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', user.id),
            supabase.from('months').delete().eq('user_id', user.id),
            supabase.from('categories').delete().eq('user_id', user.id),
            supabase.from('debts').delete().eq('user_id', user.id),
            supabase.from('savings_goals').delete().eq('user_id', user.id),
        ]);
    }

    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}
