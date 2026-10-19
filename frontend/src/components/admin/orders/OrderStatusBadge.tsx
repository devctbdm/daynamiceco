import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/api';

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  pending:      { label: 'Pending',          className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  processing:   { label: 'Processing',       className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  confirmed:    { label: 'Confirmed',        className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  send_courier: { label: 'Send to Courier',  className: 'bg-violet-100 text-violet-800 hover:bg-violet-100' },
  cancelled:    { label: 'Cancelled',        className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:      { label: 'Paid',      className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  pending:   { label: 'Pending',   className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  failed:    { label: 'Failed',    className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

interface PaymentStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  };
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const key = (status || '').toLowerCase();
  const config = PAYMENT_STATUS_CONFIG[key] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  };
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending',      label: 'Pending' },
  { value: 'processing',   label: 'Processing' },
  { value: 'confirmed',    label: 'Confirmed' },
  { value: 'send_courier', label: 'Send to Courier' },
  { value: 'cancelled',    label: 'Cancelled' },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod:           'Cash on Delivery',
  bkash:         'bKash',
  nagad:         'Nagad',
  sslcommerz:    'SSLCommerz',
  bank_transfer: 'Bank Transfer',
  cash:          'Cash',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
