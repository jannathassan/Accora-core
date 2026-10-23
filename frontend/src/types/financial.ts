export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Transaction {
  id: string;
  workspace_id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  status?: TransactionStatus;
  notes?: string;
}

export interface TransactionUpdate {
  date?: string;
  description?: string;
  category?: string;
  type?: TransactionType;
  amount?: number;
  status?: TransactionStatus;
  notes?: string;
}

export interface TransactionBatchImportRequest {
  transactions: TransactionCreate[];
  skip_duplicates?: boolean;
}

export interface TransactionBatchImportResponse {
  imported_count: number;
  skipped_count: number;
  total_count: number;
  duplicates: string[];
}

export interface CategoriesResponse {
  income: string[];
  expense: string[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_date?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  invoice_number?: string;
  client_name: string;
  client_email?: string;
  items: InvoiceItem[];
  tax_rate: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_date?: string | null;
  notes?: string;
}

export interface InvoiceUpdate {
  invoice_number?: string;
  client_name?: string;
  client_email?: string;
  items?: InvoiceItem[];
  tax_rate?: number;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  paid_date?: string | null;
  notes?: string;
}

export interface InvoiceSummary {
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  count_invoiced: number;
  count_paid: number;
  count_pending: number;
  count_overdue: number;
}
