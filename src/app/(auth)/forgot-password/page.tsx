"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Mail, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">SpendWise</span>
            <span className="text-lg font-bold text-emerald-600"> AI</span>
          </div>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
              <p className="text-sm text-slate-600 mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
              <Link
                href="/login"
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Forgot password?</h1>
              <p className="text-sm text-slate-600 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
                <Button type="submit" loading={loading} className="w-full">
                  Send Reset Link
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
                  Back to Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
