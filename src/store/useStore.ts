import { create } from "zustand";
import { User, Transaction, Budget, SavingsGoal, Subscription, Notification } from "@/types";

interface AppState {
  user: User | null;
  token: string | null;
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  subscriptions: Subscription[];
  notifications: Notification[];
  unreadNotifications: number;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  setGoals: (goals: SavingsGoal[]) => void;
  addGoal: (goal: SavingsGoal) => void;
  updateGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  removeGoal: (id: string) => void;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadNotifications: (count: number) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  transactions: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  notifications: [],
  unreadNotifications: 0,
  isLoading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    set({ token });
  },
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
  setBudgets: (budgets) => set({ budgets }),
  addBudget: (budget) =>
    set((state) => ({ budgets: [budget, ...state.budgets] })),
  updateBudget: (id, updates) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),
  removeBudget: (id) =>
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    })),
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) =>
    set((state) => ({ goals: [goal, ...state.goals] })),
  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    })),
  removeGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),
  setSubscriptions: (subscriptions) => set({ subscriptions }),
  addSubscription: (sub) =>
    set((state) => ({ subscriptions: [sub, ...state.subscriptions] })),
  updateSubscription: (id, updates) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeSubscription: (id) =>
    set((state) => ({
      subscriptions: state.subscriptions.filter((s) => s.id !== id),
    })),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem("token");
    set({
      user: null,
      token: null,
      transactions: [],
      budgets: [],
      goals: [],
      subscriptions: [],
      notifications: [],
      unreadNotifications: 0,
    });
  },
}));
