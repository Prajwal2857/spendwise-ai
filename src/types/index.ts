export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  currency: string;
  role: "user" | "admin";
  onboardingCompleted: boolean;
  monthlyIncome?: number;
  preferredCategories?: string[];
  notificationPreferences: {
    budgetWarnings: boolean;
    subscriptionReminders: boolean;
    spendingAlerts: boolean;
    savingsMilestones: boolean;
  };
  createdAt: string;
}

export interface Account {
  _id: string;
  userId: string;
  accountName: string;
  accountType: "bank" | "credit_card" | "debit_card" | "cash" | "upi" | "other";
  balance: number;
  institution?: string;
  color?: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  accountId?: string;
  merchant: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  paymentMethod: string;
  date: string;
  notes?: string;
  recurring: boolean;
  tags?: string[];
  createdAt: string;
}

export interface Budget {
  _id: string;
  userId: string;
  category: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface SavingsGoal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface Subscription {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: "monthly" | "yearly" | "weekly" | "quarterly";
  renewalDate: string;
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "budget_warning" | "subscription_reminder" | "spending_alert" | "savings_milestone" | "info";
  read: boolean;
  createdAt: string;
}

export interface Insight {
  type: "alert" | "suggestion" | "trend" | "subscription" | "budget";
  icon: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success" | "danger";
}

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  budgetRemaining: number;
  previousMonthExpenses: number;
  spendingByCategory: { name: string; amount: number; percentage: number; emoji: string }[];
  recentTransactions: Transaction[];
  insights: Insight[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
}

export interface CSVImportResult {
  totalFound: number;
  imported: number;
  duplicates: number;
  needsReview: number;
  transactions: Partial<Transaction>[];
}
