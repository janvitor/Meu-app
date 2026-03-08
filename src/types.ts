export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  level: number;
  badges: string; // JSON string
}

export interface Transaction {
  id: number;
  amount: number;
  date: string;
  category_id: number;
  description: string;
  type: TransactionType;
  payment_method?: string;
  source?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface FixedExpense {
  id: number;
  description: string;
  amount: number;
  category_id: number;
  is_paid: boolean;
  due_date?: string;
  category_name?: string;
  category_color?: string;
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  availableCash: number;
  categoryData: { name: string; value: number; color: string }[];
}

export interface BankConnection {
  id: number;
  user_id: number;
  bank_name: string;
  status: 'connected' | 'disconnected';
  last_sync?: string;
}
