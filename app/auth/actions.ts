"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
    const email = "ralphsaniatan@gmail.com";
    const password = formData.get("password") as string;
    const supabase = await createClient();

    // 1. Try to Sign In
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Failed:", error.message);
        return { error: "Login failed. Please ensure the user exists in Supabase." };
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
