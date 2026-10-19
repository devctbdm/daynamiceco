'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import html2pdf from 'html2pdf.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import {
  Search,
  Filter,
  MoreHorizontal,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  Trash2,
  ArrowUpDown,
  DollarSign,
  Clock,
  FileSpreadsheet,
  Eye,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  invoiceApi,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceStats,
} from '@/lib/api';
import { SiteHeader } from '@/components/site-header';

// --- Company constants (print header) ---
const COMPANY = {
  name: 'Apple-IT-Zone',
  tagline: 'IT Product Seller Company',
  address: 'Dhaka, Bangladesh',
  mobile: '01911059059 - 01721909064',
  service: '01788420417',
  email: 'appleitzonebd@gmail.com',
  web: 'appleitzone.com',
};

const logoUrl = () =>
  typeof window !== 'undefined' ? `${window.location.origin}/Logo.svg` : '';

// --- Utilities ---
const formatCurrency = (amount: number) =>
  `৳${(amount || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatDateTime = (value: Date) =>
  value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const shortOrder = (id: string) => `#${id.slice(-8).toUpperCase()}`;

const preparedName = (inv: Invoice) =>
  typeof inv.preparedBy === 'object' && inv.preparedBy
    ? inv.preparedBy.name
    : 'Admin';

// --- Components ---

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = {
    paid: {
      label: 'Paid',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
    },
    pending: {
      label: 'Pending',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    overdue: {
      label: 'Overdue',
      className:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
    },
    cancelled: {
      label: 'Cancelled',
      className:
        'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800',
      icon: <XCircle className="h-3 w-3 mr-1" />,
    },
  };
  const c = config[status];
  return (
    <Badge
      variant="outline"
      className={`${c.className} flex items-center w-fit`}
    >
      {c.icon}
      {c.label}
    </Badge>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-25" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-30 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-35" />
            <Skeleton className="h-3 w-25" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-25" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-17.5 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-22.5" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-15 ml-auto" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
      </TableCell>
    </TableRow>
  );
}

// --- Printable invoice layout ---
function InvoicePrint({ invoice }: { invoice: Invoice }) {
  const th: CSSProperties = {
    border: '1px solid #94a3b8',
    padding: '8px',
    background: '#e2e8f0',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '13px',
  };
  const td: CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '8px',
    verticalAlign: 'top',
    fontSize: '13px',
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        color: '#111',
        fontSize: '13px',
        width: '100%',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          border: '2px solid #1e3a8a',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 18px',
            background: '#f8fafc',
            borderBottom: '2px solid #1e3a8a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={logoUrl()}
              alt="logo"
              style={{ height: '54px', width: '54px', objectFit: 'contain' }}
            />
            <div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#1e3a8a',
                  lineHeight: 1.1,
                }}
              >
                {COMPANY.name}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                {COMPANY.tagline}
              </div>
            </div>
          </div>
          <div
            style={{
              textAlign: 'right',
              fontSize: '12px',
              lineHeight: 1.7,
              color: '#334155',
            }}
          >
            <div>
              <b>Address:</b> {COMPANY.address}
            </div>
            <div>
              <b>Mobile:</b> {COMPANY.mobile}
            </div>
            <div>
              <b>Service:</b> {COMPANY.service}
            </div>
            <div>
              <b>Email:</b> {COMPANY.email}
            </div>
            <div>
              <b>Web:</b> {COMPANY.web}
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: '8px',
            background: '#1e3a8a',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '2px',
          }}
        >
          SALES INVOICE
        </div>
      </div>

      {/* Section 2: Customer + Invoice info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '24px',
          padding: '14px 4px',
          borderBottom: '1px solid #cbd5e1',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              marginBottom: '6px',
              borderBottom: '1px solid #cbd5e1',
              paddingBottom: '4px',
              color: '#1e3a8a',
            }}
          >
            Customer
          </div>
          <div style={{ lineHeight: 1.8 }}>
            <div>
              <b>Customer Name:</b> {invoice.customer.name || '-'}
            </div>
            <div>
              <b>Customer Address:</b> {invoice.customer.address || '-'}
            </div>
            <div>
              <b>Customer Mobile:</b> {invoice.customer.phone || '-'}
            </div>
            <div>
              <b>Attention:</b> {invoice.customer.email || '-'}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              marginBottom: '6px',
              borderBottom: '1px solid #cbd5e1',
              paddingBottom: '4px',
              color: '#1e3a8a',
            }}
          >
            Invoice Info
          </div>
          <div style={{ lineHeight: 1.8 }}>
            <div>
              <b>Invoice No:</b> {invoice.invoiceNumber}
            </div>
            <div>
              <b>Date:</b> {formatDate(invoice.issueDate)}
            </div>
            <div>
              <b>Order Number:</b> {shortOrder(invoice.order)}
            </div>
            <div>
              <b>Prepared By:</b> {preparedName(invoice)}
            </div>
            <div>
              <b>Bill Type:</b> {invoice.status.toUpperCase()}
            </div>
            <div>
              <b>Sales Person:</b> {invoice.salesPerson}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Items table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
        }}
      >
        <thead>
          <tr>
            <th style={th}>SL</th>
            <th style={th}>Product Title</th>
            <th style={th}>S/N</th>
            <th style={th}>Warranty</th>
            <th style={th}>QTY</th>
            <th style={th}>Unit Price</th>
            <th style={th}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 && (
            <tr>
              <td style={td} colSpan={7} align="center">
                No items
              </td>
            </tr>
          )}
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td style={td} align="center">
                {idx + 1}
              </td>
              <td style={td}>{item.name}</td>
              <td style={td}>
                {item.serialNumbers.length > 0 ? (
                  item.serialNumbers.map((sn, i) => (
                    <span key={i}>
                      {sn}
                      {i < item.serialNumbers.length - 1 && <br />}
                    </span>
                  ))
                ) : (
                  '-'
                )}
              </td>
              <td style={td}>{item.warranty || '-'}</td>
              <td style={td} align="center">
                {item.quantity}
              </td>
              <td style={td} align="right">
                {formatCurrency(item.unitPrice)}
              </td>
              <td style={td} align="right">
                {formatCurrency(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section 4: Totals */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '24px',
          marginTop: '12px',
        }}
      >
        <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.8 }}>
          <div>
            <b>Total:</b> {invoice.items.length} item(s)
          </div>
          <div>
            <b>Delivery:</b> {formatCurrency(invoice.deliveryCharge)}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'right', fontSize: '13px', lineHeight: 1.8 }}>
          <div>Subtotal: {formatCurrency(invoice.subtotal)}</div>
          <div>Less Discount: {formatCurrency(invoice.discount)}</div>
          <div>Extra Charge: {formatCurrency(invoice.extraCharge)}</div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1e3a8a',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '6px',
          marginTop: '10px',
          fontSize: '16px',
          fontWeight: 700,
        }}
      >
        <span>Net Payable Amount</span>
        <span>{formatCurrency(invoice.netPayable)}</span>
      </div>

      {/* Note */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '12px',
          background: '#fff7ed',
          lineHeight: 1.6,
        }}
      >
        <b>Note:</b>{' '}
        {invoice.note ||
          'Warranty will be void if any sticker removed, physically damage, water damage and burn case. No warranty for any kind of adapter.'}
      </div>

      {/* Signatures */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '48px',
          fontSize: '13px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #111',
              paddingTop: '6px',
              width: '220px',
            }}
          >
            Customer Signature
          </div>
          <div style={{ marginTop: '22px', color: '#475569' }}>
            Print Date: {formatDateTime(new Date())}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #111',
              paddingTop: '6px',
              width: '220px',
            }}
          >
            Authorized Signature
          </div>
          <div style={{ marginTop: '22px', color: '#475569' }}>
            {invoice.salesPerson}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Detail drawer ---
function InvoiceDetailDrawer({
  invoice,
  onRefetch,
  onEdit,
  onClose,
}: {
  invoice: Invoice | null;
  onRefetch: () => void;
  onEdit: (invoice: Invoice) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isMobile = useIsMobile();
  const invoiceContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoice) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [invoice]);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      onClose();
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    setCancelling(true);
    try {
      await invoiceApi.update(invoice._id, { status: 'cancelled' });
      toast.success(`Invoice ${invoice.invoiceNumber} cancelled`);
      onClose();
      onRefetch();
    } catch {
      toast.error('Failed to cancel invoice');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    if (invoiceContentRef.current) {
      const printContent = invoiceContentRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Invoice</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (invoiceContentRef.current && invoice) {
      const element = invoiceContentRef.current;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 20px; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        const iframeElement = iframeDoc.body;
        const opt = {
          margin: 10,
          filename: `${invoice.invoiceNumber}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
          },
          jsPDF: {
            unit: 'mm' as const,
            format: 'a4' as const,
            orientation: 'portrait' as const,
          },
        };
        html2pdf()
          .set(opt)
          .from(iframeElement)
          .save()
          .then(() => {
            document.body.removeChild(iframe);
          })
          .catch((error: unknown) => {
            console.error('PDF generation failed:', error);
            document.body.removeChild(iframe);
            alert('PDF generation failed. Please use the print dialog to save as PDF.');
            window.print();
          });
      }, 500);
    }
  };

  if (!invoice) return null;

  const canCancel = invoice.status === 'pending' || invoice.status === 'overdue';

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="max-h-[96vh]">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto px-6 py-6">
          <DrawerHeader className="text-left px-0 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-2xl">
                {invoice.invoiceNumber}
              </DrawerTitle>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <DrawerDescription>
              Issued on {formatDate(invoice.issueDate)}
            </DrawerDescription>
          </DrawerHeader>

          <div ref={invoiceContentRef} className="rounded-lg border p-4">
            <InvoicePrint invoice={invoice} />
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => onEdit(invoice)}
              >
                <Pencil className="h-4 w-4" /> Edit Invoice
              </Button>
              {canCancel && (
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  <Trash2 className="h-4 w-4" />
                  {cancelling ? 'Cancelling...' : 'Cancel Invoice'}
                </Button>
              )}
            </div>
          </div>

          <DrawerFooter className="px-0 pt-6">
            <DrawerClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full">
              Close
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// --- Edit dialog ---
type EditFormItem = {
  _id: string;
  product: string;
  name: string;
  quantity: string;
  unitPrice: string;
  warranty: string;
  serialNumbers: string;
};

type EditForm = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  discount: string;
  deliveryCharge: string;
  extraCharge: string;
  note: string;
  salesPerson: string;
  items: EditFormItem[];
};

function EditInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSave,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm({
        customerName: invoice.customer.name || '',
        customerPhone: invoice.customer.phone || '',
        customerEmail: invoice.customer.email || '',
        customerAddress: invoice.customer.address || '',
        issueDate: invoice.issueDate.slice(0, 10),
        dueDate: invoice.dueDate.slice(0, 10),
        status: invoice.status,
        discount: String(invoice.discount ?? 0),
        deliveryCharge: String(invoice.deliveryCharge ?? 0),
        extraCharge: String(invoice.extraCharge ?? 0),
        note: invoice.note || '',
        salesPerson: invoice.salesPerson || 'Apple-it-zone',
        items: invoice.items.map((it) => ({
          _id: it._id,
          product: it.product,
          name: it.name,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          warranty: it.warranty || '',
          serialNumbers: (it.serialNumbers || []).join('\n'),
        })),
      });
    }
  }, [invoice, open]);

  if (!form || !invoice) return null;

  const set = (patch: Partial<EditForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setItem = (idx: number, patch: Partial<EditFormItem>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
          }
        : f
    );

  const handleSubmit = async () => {
    if (!form || !invoice) return;
    setSaving(true);
    try {
      await onSave({
        customer: {
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail,
          address: form.customerAddress,
        },
        issueDate: new Date(form.issueDate).toISOString(),
        dueDate: new Date(form.dueDate).toISOString(),
        status: form.status,
        discount: Number(form.discount) || 0,
        deliveryCharge: Number(form.deliveryCharge) || 0,
        extraCharge: Number(form.extraCharge) || 0,
        note: form.note,
        salesPerson: form.salesPerson,
        items: form.items.map((it) => ({
          _id: it._id,
          product: it.product,
          name: it.name,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          warranty: it.warranty,
          serialNumbers: it.serialNumbers
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Update customer, items (serial numbers & warranty), charges and
            status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer */}
          <div className="space-y-3">
            <h4 className="font-semibold">Customer</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => set({ customerName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input
                  value={form.customerPhone}
                  onChange={(e) => set({ customerPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Email (Attention)</Label>
                <Input
                  value={form.customerEmail}
                  onChange={(e) => set({ customerEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input
                  value={form.customerAddress}
                  onChange={(e) => set({ customerAddress: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Invoice meta */}
          <div className="space-y-3">
            <h4 className="font-semibold">Invoice</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => set({ issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set({ status: v as InvoiceStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sales Person</Label>
                <Input
                  value={form.salesPerson}
                  onChange={(e) => set({ salesPerson: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <h4 className="font-semibold">Items</h4>
            {form.items.map((item, idx) => (
              <div
                key={item._id || idx}
                className="space-y-3 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item {idx + 1}</span>
                  {form.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() =>
                        setForm((f) =>
                          f
                            ? { ...f, items: f.items.filter((_, i) => i !== idx) }
                            : f
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Product Title</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => setItem(idx, { name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => setItem(idx, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Price (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItem(idx, { unitPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Amount</Label>
                    <Input
                      disabled
                      value={formatCurrency(
                        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Warranty</Label>
                  <Input
                    placeholder="e.g. 1 Year Manufacturer Warranty"
                    value={item.warranty}
                    onChange={(e) => setItem(idx, { warranty: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Serial Number(s) - one per line (e.g. 3 routers = 3 SNs)
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="SN-0001&#10;SN-0002&#10;SN-0003"
                    value={item.serialNumbers}
                    onChange={(e) =>
                      setItem(idx, { serialNumbers: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        items: [
                          ...f.items,
                          {
                            _id: `new_${Date.now()}`,
                            product: '',
                            name: '',
                            quantity: '1',
                            unitPrice: '0',
                            warranty: '',
                            serialNumbers: '',
                          },
                        ],
                      }
                    : f
                )
              }
            >
              + Add Item
            </Button>
          </div>

          {/* Totals */}
          <div className="space-y-3">
            <h4 className="font-semibold">Charges</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Discount (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discount}
                  onChange={(e) => set({ discount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Delivery Charge (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.deliveryCharge}
                  onChange={(e) => set({ deliveryCharge: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Extra Charge (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.extraCharge}
                  onChange={(e) => set({ extraCharge: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : 'Save Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function InvoiceManagementPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalOutstanding: 0,
    totalPaid: 0,
    totalOverdue: 0,
    cancelledCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>(
    'all'
  );
  const [sortConfig, setSortConfig] = useState<{
    key: 'invoiceNumber' | 'issueDate';
    direction: 'asc' | 'desc';
  }>({
    key: 'issueDate',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const itemsPerPage = 5;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [list, statRes] = await Promise.all([
        invoiceApi.getAll({ limit: 500 }),
        invoiceApi.getStats(),
      ]);
      setInvoices(list.data.invoices);
      setStats(statRes.data.stats);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter & Sort
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customer.name.toLowerCase().includes(q) ||
          inv.customer.email.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchQuery, statusFilter, sortConfig]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / itemsPerPage)
  );
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openDetailDrawer = (invoice: Invoice) => {
    setDetailInvoice(null);
    setTimeout(() => setDetailInvoice(invoice), 0);
  };

  const handleSort = (key: 'invoiceNumber' | 'issueDate') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await invoiceApi.syncFromOrders();
      toast.success(
        data.created > 0
          ? `${data.created} invoice(s) created from orders`
          : 'All orders already have invoices'
      );
      await fetchData();
    } catch {
      toast.error('Failed to sync invoices from orders');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatus = async (
    inv: Invoice,
    status: InvoiceStatus
  ) => {
    if (status === inv.status) return;
    try {
      await invoiceApi.update(inv._id, { status });
      toast.success(`${inv.invoiceNumber} marked as ${status}`);
      await fetchData();
      setDetailInvoice((prev) =>
        prev && prev._id === inv._id ? { ...prev, status } : prev
      );
    } catch {
      toast.error('Failed to update invoice status');
    }
  };

  const handleDelete = (inv: Invoice) => {
    setDeleteTarget(inv);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoiceApi.remove(deleteTarget._id);
      toast.success(`Invoice ${deleteTarget.invoiceNumber} deleted`);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (detailInvoice?._id === deleteTarget._id) setDetailInvoice(null);
      await fetchData();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const handleSaveEdit = async (payload: Record<string, unknown>) => {
    if (!editInvoice) return;
    try {
      const { data } = await invoiceApi.update(editInvoice._id, payload);
      toast.success(`Invoice ${data.invoice.invoiceNumber} updated`);
      setEditInvoice(null);
      setDetailInvoice((prev) =>
        prev && prev._id === data.invoice._id ? data.invoice : prev
      );
      await fetchData();
    } catch {
      toast.error('Failed to save invoice');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Invoice',
      'Customer',
      'Email',
      'Date',
      'Status',
      'Subtotal',
      'Discount',
      'Delivery',
      'Extra',
      'Net Payable',
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filteredInvoices.map((inv) =>
      [
        inv.invoiceNumber,
        inv.customer.name,
        inv.customer.email,
        inv.issueDate,
        inv.status,
        inv.subtotal,
        inv.discount,
        inv.deliveryCharge,
        inv.extraCharge,
        inv.netPayable,
      ]
        .map((v) => escape(String(v)))
        .join(',')
    );
    const csv = [headers.map((h) => escape(h)).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredInvoices.length} invoices to CSV`);
  };

  const statsCards = [
    {
      title: 'Total Paid',
      value: formatCurrency(stats.totalPaid),
      change: 'All time revenue',
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(stats.totalOutstanding),
      change: 'Awaiting payment',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Overdue',
      value: formatCurrency(stats.totalOverdue),
      change: 'Requires action',
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    },
    {
      title: 'Cancelled',
      value: stats.cancelledCount.toString(),
      change: 'Failed or refunded',
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-950/30',
    },
  ];

  return (
    <> 
    <SiteHeader />
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">
            Generate, edit and print invoices from customer orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSync}
            disabled={syncing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Orders'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statsCards.map((stat, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices, customers..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as InvoiceStatus | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-35">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportCSV}
                disabled={filteredInvoices.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('invoiceNumber')}
                        >
                          Invoice
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={() => handleSort('issueDate')}
                        >
                          Date
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Net Payable</TableHead>
                      <TableHead className="w-12.5"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))
                    ) : paginatedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                            <p>No invoices found</p>
                            <p className="text-sm">
                              Click &quot;Sync from Orders&quot; to generate
                              invoices.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInvoices.map((invoice) => (
                        <TableRow key={invoice._id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{invoice.invoiceNumber}</span>
                              <span className="text-xs text-muted-foreground">
                                {invoice.items.length} items
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {invoice.customer.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {invoice.customer.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {invoice.customer.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invoice.issueDate)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                invoice.status === 'overdue'
                                  ? 'text-red-600 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              {formatDate(invoice.dueDate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.netPayable)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="group/btn inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDetailDrawer(invoice)}
                                >
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setEditInvoice(invoice)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>
                                    Change Status
                                  </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                {invoice.status !== 'paid' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateStatus(invoice, 'paid')
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />{' '}
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {invoice.status !== 'pending' &&
                                  invoice.status !== 'overdue' && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUpdateStatus(invoice, 'pending')
                                      }
                                    >
                                      <Clock className="h-4 w-4 mr-2" /> Mark
                                      as Pending
                                    </DropdownMenuItem>
                                  )}
                                {invoice.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateStatus(invoice, 'cancelled')
                                    }
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" /> Mark
                                    as Cancelled
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(invoice)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="m-0">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-30 mb-2" />
                        <Skeleton className="h-4 w-45" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-45" />
                        <Skeleton className="h-8 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedInvoices.map((invoice) => (
                    <Card
                      key={invoice._id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <CardDescription>
                          Due {formatDate(invoice.dueDate)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10">
                              {invoice.customer.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {invoice.customer.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.customer.email}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Net Payable
                          </span>
                          <span className="text-xl font-bold">
                            {formatCurrency(invoice.netPayable)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => openDetailDrawer(invoice)}
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => setEditInvoice(invoice)}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {!loading && filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}{' '}
                of {filteredInvoices.length} invoices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <InvoiceDetailDrawer
        key={detailInvoice?._id || 'drawer'}
        invoice={detailInvoice}
        onRefetch={fetchData}
        onEdit={setEditInvoice}
        onClose={() => setDetailInvoice(null)}
      />

      {/* Edit Dialog */}
      <EditInvoiceDialog
        invoice={editInvoice}
        open={!!editInvoice}
        onOpenChange={(open) => !open && setEditInvoice(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice{' '}
              {deleteTarget?.invoiceNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
