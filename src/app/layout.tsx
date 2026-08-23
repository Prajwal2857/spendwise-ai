import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpendWise AI — Know Where Your Money Goes",
  description:
    "One simple dashboard to track income, expenses, subscriptions, budgets, and savings. Get AI-powered insights that help you spend smarter.",
  keywords: [
    "personal finance",
    "budget tracker",
    "expense tracker",
    "money management",
    "spending insights",
    "AI finance",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "12px",
              background: "#1e293b",
              color: "#fff",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
