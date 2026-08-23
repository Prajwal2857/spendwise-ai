import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Food: "🍔",
    Shopping: "🛍",
    Transportation: "🚗",
    Housing: "🏠",
    "Bills & Utilities": "💡",
    Entertainment: "🎬",
    Healthcare: "💊",
    Education: "🎓",
    Travel: "✈️",
    Subscriptions: "💳",
    "Mobile/Internet": "📱",
    Investments: "💰",
    Other: "📦",
    Income: "💵",
    Salary: "💼",
    Freelance: "💻",
  };
  return emojis[category] || "📦";
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Food: "#FF6B6B",
    Shopping: "#4ECDC4",
    Transportation: "#45B7D1",
    Housing: "#96CEB4",
    "Bills & Utilities": "#FFEAA7",
    Entertainment: "#DDA0DD",
    Healthcare: "#98D8C8",
    Education: "#7EC8E3",
    Travel: "#FFB347",
    Subscriptions: "#C9B1FF",
    "Mobile/Internet": "#87CEEB",
    Investments: "#90EE90",
    Other: "#D3D3D3",
    Income: "#4CAF50",
    Salary: "#2E7D32",
    Freelance: "#1565C0",
  };
  return colors[category] || "#D3D3D3";
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Transportation",
  "Housing",
  "Bills & Utilities",
  "Entertainment",
  "Healthcare",
  "Education",
  "Travel",
  "Subscriptions",
  "Mobile/Internet",
  "Investments",
  "Other",
  "Income",
  "Salary",
  "Freelance",
];

export const PAYMENT_METHODS = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Cash",
  "Bank Transfer",
  "Wallet",
  "Other",
];
