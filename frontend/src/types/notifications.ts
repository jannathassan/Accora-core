export type NotificationType =
  | 'overdue_invoice'
  | 'cashflow_warning'
  | 'expense_spike'
  | 'revenue_milestone'
  | 'insight'
  | 'general';

export type NotificationSeverity = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  read: boolean;
  action_url: string;
  related_id: string;
  created_at: string;
  updated_at: string;
}
