# Notepad Budget - Setup Guide

This guide will help you configure the external services required for the Notepad Budget app.

## 1. Supabase (Database)

1.  **Create a Project:**
    *   Go to [Supabase](https://supabase.com/) and create a new project.
    *   Give it a name (e.g., "Notepad Budget") and set a secure database password.

2.  **Get API Keys:**
    *   Once the project is created, go to **Project Settings** (gear icon) -> **API**.
    *   Find the **Project URL** and the **anon / public** key.

3.  **Configure Environment Variables:**
    *   In the root of the project, rename `.env.local.example` to `.env.local` (or create it if it doesn't exist).
    *   Add the following variables:

    NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wYfHqMW4lv8V2tjs6Vvazg_9JguqMbC
    ```

4.  **Configure Authentication (Important):**
    *   Go to **Authentication** -> **Providers** -> **Email**.
    *   **Disable** "Confirm email". (This is required for "Guest Mode" and immediate family signups).
    *   Click **Save**.

## 2. GitHub (Version Control)

1.  **Initialize Repository:**
    *   Open your terminal in the project root.
    *   Run: `git init`
    *   Run: `git add .`
    *   Run: `git commit -m "Initial commit"`

2.  **Push to GitHub:**
    *   Create a new repository on GitHub (do not initialize with README/gitignore).
    *   Copy the commands under "…or push an existing repository from the command line".
    *   They will look like this:
        ```bash
        git remote add origin https://github.com/yourusername/notepad-budget.git
        git branch -M main
        git push -u origin main
        ```

## 3. Vercel (Deployment)

1.  **Connect Repo:**
    *   Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
    *   Select your `notepad-budget` GitHub repository and click **Import**.

2.  **Configure Environment Variables:**
    *   On the **Configure Project** screen, find the **Environment Variables** section.
    *   Add the SAME variables from your `.env.local`:
        *   `NEXT_PUBLIC_SUPABASE_URL`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3.  **Deploy:**
    *   Click **Deploy**. Vercel will build your app and give you a live URL.
