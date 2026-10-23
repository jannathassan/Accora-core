export interface BusinessSettings {
  business_name: string;
  industry: string;
  business_type: string;
  country: string;
  currency: string;
  fiscal_year_start: string;
  business_start_date: string;
  employee_count: number;
  opening_cash_balance: number;
  avg_monthly_revenue: number;
  monthly_fixed_expenses: number;
  monthly_variable_expenses: number;
  loan_balance: number;
  monthly_loan_repayment: number;
  expected_growth_rate: number;
  financial_goals: string;
  tax_rate: number;
}

export interface UserPreferences {
  date_format: string;
  default_view: string;
}

export interface AIPreferences {
  proactive_insights: boolean;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive' | string;
  forecast_horizon_months: number;
  email_alerts: boolean;
}

export interface AppSettings {
  business: BusinessSettings;
  preferences: UserPreferences;
  ai_preferences: AIPreferences;
}
