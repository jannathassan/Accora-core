export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  industry: string;
  business_type: string;
  country: string;
  currency: string;
  opening_cash_balance: number;
  avg_monthly_revenue: number;
  monthly_fixed_expenses: number;
  monthly_variable_expenses: number;
  loan_balance: number;
  monthly_loan_repayment: number;
  expected_growth_rate: number;
  financial_goals: string;
  onboarding_completed: boolean;
  owner_id: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  active_workspace: Workspace;
  workspaces: Workspace[];
}

export interface UserProfileResponse extends User {
  workspaces: Workspace[];
  active_workspace_id: string | null;
}
