"use client";

import Link from "next/link";

export const metadata = {
  title: "Sign In | PREform NCLEX",
  description:
    "Sign in to your Preform NCLEX account to access your learning dashboard, practice questions, and subscription.",
};

export default function SignInPage() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-green">
              Welcome back
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
              Sign in
            </h1>
          </div>

          <div className="mt-12 rounded-xl border border-line bg-white p-6 shadow-sm">
            <form className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Sign in
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              Don&rsquo;t have an account?{" "}
              <Link href="/sign-up" className="text-green hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
