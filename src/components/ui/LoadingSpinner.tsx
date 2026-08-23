"use client";

import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`${sizes[size]} text-emerald-600 animate-spin`} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading SpendWise AI...</p>
      </div>
    </div>
  );
}
