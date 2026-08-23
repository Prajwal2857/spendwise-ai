"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ArrowRight, ArrowLeft, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useStore } from "@/store/useStore";
import { DEFAULT_CATEGORIES } from "@/lib/utils";
import toast from "react-hot-toast";

const goals = [
  { id: "save-more", label: "Save more money", icon: "💰" },
  { id: "control-spending", label: "Control my spending", icon: "🎯" },
  { id: "track-expenses", label: "Track my expenses", icon: "📊" },
  { id: "emergency-fund", label: "Build an emergency fund", icon: "🛡" },
  { id: "understand-finances", label: "Understand my finances", icon: "🧠" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Food", "Shopping", "Transportation", "Bills & Utilities", "Entertainment",
  ]);
  const { setUser, token } = useStore();
  const router = useRouter();

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFinish = async () => {
    const tkn = token || localStorage.getItem("token");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tkn}`,
        },
        body: JSON.stringify({
          onboardingCompleted: true,
          monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
          preferredCategories: selectedCategories,
        }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        toast.success("Welcome to SpendWise AI! 🎉");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const steps = [
    // Welcome
    {
      title: "Welcome to SpendWise AI",
      subtitle: "Your personal finance companion. Let's set up your account in a few steps.",
      content: (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to SpendWise AI 👋</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            We&apos;ll help you set up your account so you can start tracking your finances
            and getting AI-powered insights in minutes.
          </p>
        </div>
      ),
    },
    // Goal
    {
      title: "What's your main financial goal?",
      subtitle: "This helps us personalize your experience.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGoal(g.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                selectedGoal === g.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="text-sm font-medium text-slate-900">{g.label}</span>
            </button>
          ))}
        </div>
      ),
    },
    // Income
    {
      title: "What's your approximate monthly income?",
      subtitle: "This helps us set better budget recommendations. You can skip this.",
      content: (
        <div className="max-w-md mx-auto space-y-4">
          <Input
            label="Monthly Income (₹)"
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            placeholder="e.g., 50000"
          />
          <div className="flex flex-wrap gap-2">
            {[20000, 30000, 50000, 75000, 100000].map((amount) => (
              <button
                key={amount}
                onClick={() => setMonthlyIncome(amount.toString())}
                className="px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors"
              >
                ₹{amount.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    // Categories
    {
      title: "Which categories do you spend on?",
      subtitle: "Select the categories relevant to you.",
      content: (
        <div className="flex flex-wrap gap-2 max-w-lg mx-auto justify-center">
          {DEFAULT_CATEGORIES.filter((c) => !["Income", "Salary", "Freelance"].includes(c)).map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategories.includes(cat)
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      ),
    },
    // Budget
    {
      title: "You're all set!",
      subtitle: "We'll help you create budgets after you start adding transactions.",
      content: (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re ready to take control of your money. 🎉</h2>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Start by adding your first transaction or importing a CSV file from your bank.
            Your AI insights will improve as you add more data.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleFinish}>
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-slate-500">Step {step + 1} of {steps.length}</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-slate-900 mb-1">{currentStep.title}</h1>
            <p className="text-sm text-slate-500">{currentStep.subtitle}</p>
          </div>
          {currentStep.content}
        </div>
      </div>

      {/* Navigation */}
      {step < steps.length - 1 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
