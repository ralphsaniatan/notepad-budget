"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
    // Hardcoded email for "Single Password" experience
    const email = "family@budget.local";
    const password = formData.get("password") as string;
    const supabase = await createClient();

    // Try to sign in
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // If user doesn't exist (first run), maybe we should create them?
        // For safety in this "scratch" environment, let's try to SignUp if login fails 
        // and it's a specific error, OR we just pre-seed it.
        // Let's assume the user needs to be created once.
        // To make it robust: If login fails with "Invalid login credentials", checking if it exists is hard without admin.
        // However, for this specific request: "you can create the password for me".
        // We will try to SIGN UP first, if that fails (user exists), we SIGN IN.

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            // If sign up failed, it probably means user exists, so return the original Login error
            return { error: "Invalid password." };
        }
        // If sign up succeeded, we are logged in!
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}
