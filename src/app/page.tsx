"use client";

import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Shield,
  Zap,
  PieChart,
  Brain,
  Target,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Star,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Eye,
  BarChart3,
  Bell,
} from "lucide-react";
import { useState } from "react";

function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-100 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">SpendWise</span>
            <span className="text-lg font-bold text-emerald-600"> AI</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Finance Tracking
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Finally understand{" "}
              <span className="text-emerald-600">where your money goes.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
              Connect your accounts, track every expense, and get simple
              AI-powered insights that help you spend smarter. One dashboard for
              every rupee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-base shadow-lg shadow-emerald-600/25"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-base"
              >
                See How It Works
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Free forever
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No credit card
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                2-minute setup
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/50 to-blue-100/50 rounded-3xl -m-4" />
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-4">
                <div className="text-sm text-slate-500">Good morning, Priya 👋</div>
                <div className="text-lg font-semibold text-slate-900">Here&apos;s your money snapshot</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Balance", value: "₹72,450", color: "text-slate-900" },
                    { label: "Income", value: "₹45,000", color: "text-emerald-600" },
                    { label: "Spent", value: "₹28,430", color: "text-red-600" },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className={`text-lg font-bold ${item.color} tabular-nums`}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-sm font-medium text-emerald-800 mb-1">
                    🧠 Your Month in Plain English
                  </div>
                  <div className="text-sm text-emerald-700">
                    You earned ₹45,000 and spent ₹28,430. Your biggest category
                    was Food (₹7,240). You&apos;re on track to save ₹1.98 lakh this year.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-500 mb-2">Spending Trend</div>
                    <div className="flex items-end gap-1 h-12">
                      {[40, 65, 55, 80, 70, 60, 45].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-emerald-200 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-500 mb-2">Categories</div>
                    <div className="space-y-1.5">
                      {["🍔 Food", "🛍 Shopping", "🚗 Travel"].map((c) => (
                        <div key={c} className="text-xs text-slate-700">{c}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Get plain-English explanations of your spending habits and personalized saving suggestions.",
    },
    {
      icon: PieChart,
      title: "Smart Categorization",
      description: "Transactions are automatically sorted into categories so you know exactly where your money goes.",
    },
    {
      icon: Target,
      title: "Budget Management",
      description: "Set spending limits for each category and get alerts before you go over budget.",
    },
    {
      icon: CreditCard,
      title: "All Accounts, One View",
      description: "Track UPI, cards, wallets, and cash in a single unified dashboard.",
    },
    {
      icon: BarChart3,
      title: "Visual Analytics",
      description: "Beautiful charts and reports that make your financial data easy to understand at a glance.",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Get timely alerts about budget limits, subscription renewals, and unusual spending.",
    },
  ];

  return (
    <section id="features" className="py-20 px-4 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to master your money
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Stop juggling multiple apps and spreadsheets. SpendWise AI gives you
            one clear picture of your finances.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Create your account",
      description: "Sign up in seconds with your email. No bank passwords or UPI PINs needed.",
    },
    {
      step: "02",
      title: "Add your transactions",
      description: "Enter expenses manually or import your bank CSV. We auto-categorize everything.",
    },
    {
      step: "03",
      title: "Get AI insights",
      description: "Our AI analyzes your spending and gives you simple, actionable advice.",
    },
    {
      step: "04",
      title: "Save more money",
      description: "Set budgets, track goals, and watch your savings grow month by month.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            How SpendWise AI works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get started in minutes and start understanding your money today.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [
    {
      icon: Eye,
      title: "One dashboard for every rupee",
      description: "See all your income, expenses, and balances in one place.",
    },
    {
      icon: Brain,
      title: "Stop reading spreadsheets",
      description: "Just ask your money — our AI explains everything in plain language.",
    },
    {
      icon: Target,
      title: "Know what you can spend before you spend it",
      description: "Set budgets and get real-time tracking of your spending limits.",
    },
    {
      icon: IndianRupee,
      title: "Turn goals into measurable progress",
      description: "Whether it's a new laptop or an emergency fund, track your savings journey.",
    },
  ];

  return (
    <section className="py-20 px-4 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Why people love SpendWise AI
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Give users financial clarity without making them understand finance.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="flex gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <b.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {b.title}
                </h3>
                <p className="text-slate-600 text-sm">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="py-20 px-4 lg:px-8 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Shield className="w-4 h-4" />
              Bank-Grade Security
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Your financial data is safe with us
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              We never store banking passwords, UPI PINs, CVVs, or OTPs. Your
              data is encrypted, isolated per user, and protected with
              industry-standard security.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                "AES-256 Encryption",
                "JWT Authentication",
                "Data Isolation",
                "Secure Sessions",
                "Input Validation",
                "Rate Limiting",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8">
            <div className="text-center mb-6">
              <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Privacy First</h3>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-slate-300 leading-relaxed border border-white/10">
              <p className="italic">
                &ldquo;SpendWise AI provides personal budgeting and financial education tools.
                It does not provide personalized investment, tax, or financial
                advice.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: "Priya Sharma",
      role: "College Student",
      text: "I finally know where my food delivery money goes every month. Saved ₹3,000 last month just by seeing the data!",
    },
    {
      name: "Rahul Mehta",
      role: "Software Engineer",
      text: "The AI insights are incredible. It told me I was spending ₹2,000 more on subscriptions than I realized. Cancelled three immediately.",
    },
    {
      name: "Ananya Patel",
      role: "Freelancer",
      text: "As a freelancer with irregular income, this app helps me budget perfectly. The plain-English explanations are a game-changer.",
    },
  ];

  return (
    <section className="py-20 px-4 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Trusted by thousands of users
          </h2>
          <p className="text-lg text-slate-600">
            See what people are saying about SpendWise AI.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-emerald-700">
                    {t.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {t.name}
                  </div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Is SpendWise AI free?",
      a: "Yes! SpendWise AI offers a generous free tier that covers all essential features including transaction tracking, budgets, goals, and AI insights.",
    },
    {
      q: "Do I need to connect my bank account?",
      a: "No. For MVP, you can manually add transactions or import CSV files from your bank. We never ask for bank passwords or UPI PINs.",
    },
    {
      q: "Is my financial data secure?",
      a: "Absolutely. We use AES-256 encryption, JWT authentication, and complete data isolation. We never store sensitive banking credentials.",
    },
    {
      q: "What currencies are supported?",
      a: "Currently we support INR (Indian Rupee). We plan to add more currencies in future updates.",
    },
    {
      q: "Can I export my data?",
      a: "Yes! You can export your transactions and reports as CSV, PDF, or Excel files at any time.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-4 lg:px-8 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-slate-900">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="py-20 px-4 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-600">
            Start free. Upgrade when you need more.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Free</h3>
            <div className="text-4xl font-bold text-slate-900 mb-1">₹0</div>
            <div className="text-sm text-slate-500 mb-6">forever</div>
            <ul className="space-y-3 mb-8">
              {["Unlimited transactions", "5 budgets", "3 savings goals", "AI insights (10/month)", "CSV import", "Mobile app"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block text-center py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
          <div className="p-8 rounded-2xl border-2 border-emerald-500 relative bg-emerald-50/50">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full">
              POPULAR
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Pro</h3>
            <div className="text-4xl font-bold text-slate-900 mb-1">₹199</div>
            <div className="text-sm text-slate-500 mb-6">per month</div>
            <ul className="space-y-3 mb-8">
              {["Everything in Free", "Unlimited budgets", "Unlimited goals", "Unlimited AI insights", "Priority support", "Advanced analytics", "Export to PDF/Excel"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block text-center py-3 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Start Pro Trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 px-4 lg:px-8 bg-emerald-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          Your money is everywhere. Your understanding shouldn&apos;t be.
        </h2>
        <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of users who are taking control of their finances with
          SpendWise AI. It&apos;s free to start.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors text-base shadow-lg"
        >
          Get Started Free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SpendWise AI</span>
            </div>
            <p className="text-sm leading-relaxed">
              Know where your money goes. One simple dashboard for all your finances.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} SpendWise AI. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 max-w-lg text-center md:text-right">
            SpendWise AI provides personal budgeting and financial education tools. It
            does not provide personalized investment, tax, or financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <Benefits />
      <Security />
      <Testimonials />
      <FAQ />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
