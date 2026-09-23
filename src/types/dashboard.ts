export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
}

export interface AccountSummary {
  id: number;
  name: string;
  type: string;
  balance: string | number;
  currency: string;
}

export interface RecentTransaction {
  id: number;
  type: "income" | "expense";
  amount: string | number;
  category: string;
  description: string | null;
  transactionDate: string;
  accountId: number;
  account?: {
    id: number;
    name: string;
  };
}

export interface CategorySummary {
  category: string;
  total: number;
}