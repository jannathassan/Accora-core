import axios from 'axios';
import {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionBatchImportRequest,
  TransactionBatchImportResponse,
  CategoriesResponse,
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceSummary,
  FinancialMetrics,
  BusinessHealthScore,
  CashFlowStatus,
  Forecast,
  SmartAction,
  NextBestMove,
  AIInsight,
  ChatRequest,
  ChatResponse,
  WhatIfRequest,
  WhatIfResult,
  BusinessSummary,
  PLReport,
  ExpenseReport,
  CashFlowReport,
  Notification,
  AppSettings,
} from '../types';



export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const savedWs = localStorage.getItem('accora_workspace');
  if (savedWs) {
    try {
      const ws = JSON.parse(savedWs);
      if (ws?.id) {
        config.headers['X-Workspace-Id'] = ws.id;
      }
    } catch {
      // Ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auto-clear invalid session
      localStorage.removeItem('accora_token');
      localStorage.removeItem('accora_user');
      localStorage.removeItem('accora_workspace');
      localStorage.removeItem('accora_workspaces');
    }
    return Promise.reject(error);
  }
);

export interface SystemHealth {
  status: string;
  service: string;
  tagline: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    connected: boolean;
    error: string | null;
  };
  ai_engine: {
    mode: string;
    external_provider: string | null;
    rules_engine_active: boolean;
  };
}

export const fetchHealth = async (): Promise<SystemHealth> => {
  try {
    const response = await api.get<SystemHealth>('/system/health');
    return response.data;
  } catch {
    const response = await api.get<SystemHealth>('/health');
    return response.data;
  }
};

// ==========================================
// TRANSACTIONS API
// ==========================================

export interface TransactionQueryParams {
  category?: string;
  type?: string;
  month?: string;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
}

export const getTransactions = async (params?: TransactionQueryParams): Promise<Transaction[]> => {
  const response = await api.get<Transaction[]>('/transactions', { params });
  return response.data;
};

export const createTransaction = async (data: TransactionCreate): Promise<Transaction> => {
  const response = await api.post<Transaction>('/transactions', data);
  return response.data;
};

export const updateTransaction = async (id: string, data: TransactionUpdate): Promise<Transaction> => {
  const response = await api.put<Transaction>(`/transactions/${id}`, data);
  return response.data;
};

export const deleteTransaction = async (id: string): Promise<{ ok: boolean; message: string; id: string }> => {
  const response = await api.delete<{ ok: boolean; message: string; id: string }>(`/transactions/${id}`);
  return response.data;
};

export const importTransactionsBatch = async (
  data: TransactionBatchImportRequest
): Promise<TransactionBatchImportResponse> => {
  const response = await api.post<TransactionBatchImportResponse>('/transactions/batch', data);
  return response.data;
};

export const getCategories = async (): Promise<CategoriesResponse> => {
  const response = await api.get<CategoriesResponse>('/transactions/categories');
  return response.data;
};

// ==========================================
// INVOICES API
// ==========================================

export interface InvoiceQueryParams {
  status?: string;
  client?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export const getInvoices = async (params?: InvoiceQueryParams): Promise<Invoice[]> => {
  const response = await api.get<Invoice[]>('/invoices', { params });
  return response.data;
};

export const getInvoiceSummary = async (): Promise<InvoiceSummary> => {
  const response = await api.get<InvoiceSummary>('/invoices/summary');
  return response.data;
};

export const createInvoice = async (data: InvoiceCreate): Promise<Invoice> => {
  const response = await api.post<Invoice>('/invoices', data);
  return response.data;
};

export const updateInvoice = async (id: string, data: InvoiceUpdate): Promise<Invoice> => {
  const response = await api.put<Invoice>(`/invoices/${id}`, data);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<{ ok: boolean; message: string; id: string }> => {
  const response = await api.delete<{ ok: boolean; message: string; id: string }>(`/invoices/${id}`);
  return response.data;
};

// ==========================================
// ANALYTICS & INTELLIGENCE API
// ==========================================

export const getMetrics = async (months: number = 12): Promise<FinancialMetrics[]> => {
  const response = await api.get<FinancialMetrics[]>('/analytics/metrics', {
    params: { months },
  });
  return response.data;
};

export const getLatestMetrics = async (): Promise<FinancialMetrics | null> => {
  const response = await api.get<FinancialMetrics | null>('/analytics/metrics/latest');
  return response.data;
};

export const getHealthScore = async (): Promise<BusinessHealthScore> => {
  const response = await api.get<BusinessHealthScore>('/analytics/health-score');
  return response.data;
};

export const getCashFlowStatus = async (): Promise<CashFlowStatus> => {
  const response = await api.get<CashFlowStatus>('/analytics/cash-flow-status');
  return response.data;
};

export const getForecast = async (
  metric: string = 'revenue',
  months: number = 3
): Promise<Forecast> => {
  const response = await api.get<Forecast | Forecast[]>('/analytics/forecast', {
    params: { metric, months },
  });
  if (Array.isArray(response.data)) {
    return response.data.find((f) => f.metric === metric) || response.data[0];
  }
  return response.data;
};

export const getSmartActions = async (): Promise<SmartAction[]> => {
  const response = await api.get<SmartAction[]>('/analytics/smart-actions');
  return response.data;
};

export const getNextBestMove = async (): Promise<NextBestMove> => {
  const response = await api.get<NextBestMove>('/analytics/next-best-move');
  return response.data;
};

export interface ReportFilterParams {
  months?: number;
  start_date?: string;
  end_date?: string;
}

export const getBusinessSummary = async (paramsOrMonths?: number | ReportFilterParams): Promise<BusinessSummary> => {
  const params = typeof paramsOrMonths === 'number' ? { months: paramsOrMonths } : paramsOrMonths;
  const response = await api.get<BusinessSummary>('/analytics/reports/summary', { params });
  return response.data;
};

export const getPLReport = async (paramsOrMonths?: number | ReportFilterParams): Promise<PLReport> => {
  const params = typeof paramsOrMonths === 'number' ? { months: paramsOrMonths } : paramsOrMonths;
  const response = await api.get<PLReport>('/analytics/reports/pnl', { params });
  return response.data;
};

export const getExpenseReport = async (paramsOrMonths?: number | ReportFilterParams): Promise<ExpenseReport> => {
  const params = typeof paramsOrMonths === 'number' ? { months: paramsOrMonths } : paramsOrMonths;
  const response = await api.get<ExpenseReport>('/analytics/reports/expenses', { params });
  return response.data;
};

export const getCashFlowReport = async (paramsOrMonths?: number | ReportFilterParams): Promise<CashFlowReport> => {
  const params = typeof paramsOrMonths === 'number' ? { months: paramsOrMonths } : paramsOrMonths;
  const response = await api.get<CashFlowReport>('/analytics/reports/cashflow', { params });
  return response.data;
};


// ==========================================
// AI COPILOT API
// ==========================================

export const chatWithAI = async (data: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/ai/chat', data);
  return response.data;
};

export const getAIInsights = async (): Promise<AIInsight[]> => {
  const response = await api.get<AIInsight[]>('/ai/insights');
  return response.data;
};

export const simulateWhatIf = async (data: WhatIfRequest): Promise<WhatIfResult> => {
  const response = await api.post<WhatIfResult>('/ai/what-if', data);
  return response.data;
};

// ==========================================
// NOTIFICATIONS API
// ==========================================

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/notifications');
  return response.data;
};

export const markNotificationRead = async (id: string): Promise<Notification> => {
  const response = await api.put<Notification>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<{ ok: boolean; updated_count: number }> => {
  const response = await api.put<{ ok: boolean; updated_count: number }>('/notifications/read-all');
  return response.data;
};

// ==========================================
// SETTINGS API
// ==========================================

export const getSettings = async (): Promise<AppSettings> => {
  const response = await api.get<AppSettings>('/settings');
  return response.data;
};

export const updateSettings = async (data: AppSettings): Promise<AppSettings> => {
  const response = await api.put<AppSettings>('/settings', data);
  return response.data;
};


