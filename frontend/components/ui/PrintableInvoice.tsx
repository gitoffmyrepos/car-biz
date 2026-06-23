'use client';

/**
 * GigWheels - Printable Invoice Component
 * Weekly car rentals for gig drivers
 *
 * Print-friendly invoice display with print button.
 */

import { useCallback, ReactNode } from 'react';
import { clsx } from 'clsx';

// Invoice line item
export interface InvoiceLineItem {
  id: string | number;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

// Invoice data
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  // Customer info
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  // Company info
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  // Items
  lineItems: InvoiceLineItem[];
  // Totals
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  // Additional
  notes?: string;
  terms?: string;
  paymentMethod?: string;
  paymentDate?: string | Date;
}

// Props
export interface PrintableInvoiceProps {
  invoice: InvoiceData;
  showPrintButton?: boolean;
  className?: string;
  logo?: ReactNode;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Format date
const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Status badge styles
const statusStyles = {
  paid: { class: 'status-paid', label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' },
  pending: { class: 'status-pending', label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  overdue: { class: 'status-overdue', label: 'Overdue', bg: 'bg-red-100', text: 'text-red-800' },
  cancelled: { class: 'status-cancelled', label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-800' },
};

/**
 * PrintableInvoice component
 */
export function PrintableInvoice({
  invoice,
  showPrintButton = true,
  className,
  logo,
}: PrintableInvoiceProps) {
  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const status = statusStyles[invoice.status];

  return (
    <div className={clsx('relative', className)}>
      {/* Print button (hidden when printing) */}
      {showPrintButton && (
        <div className="no-print mb-4 flex justify-end">
          <button
            onClick={handlePrint}
            className="print-button inline-flex items-center gap-2 px-4 py-2 bg-gold text-charcoal font-medium rounded-lg hover:bg-gold/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Invoice
          </button>
        </div>
      )}

      {/* Invoice container */}
      <div className="invoice-print bg-white rounded-xl shadow-lg p-8 avoid-page-break">
        {/* Header */}
        <div className="invoice-header flex justify-between items-start pb-6 border-b-2 border-gray-200 mb-6">
          <div>
            {logo || (
              <div className="text-2xl font-bold">
                <span className="text-gold">FX</span>Weekly
              </div>
            )}
            {invoice.companyName && (
              <p className="mt-2 text-sm text-gray-600">{invoice.companyName}</p>
            )}
            {invoice.companyAddress && (
              <p className="text-sm text-gray-600">{invoice.companyAddress}</p>
            )}
            {invoice.companyPhone && (
              <p className="text-sm text-gray-600">{invoice.companyPhone}</p>
            )}
            {invoice.companyEmail && (
              <p className="text-sm text-gray-600">{invoice.companyEmail}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="invoice-title text-3xl font-bold text-charcoal">INVOICE</h1>
            <p className="invoice-number text-lg text-gray-600 mt-1">
              #{invoice.invoiceNumber}
            </p>
            <div className="mt-2">
              <span
                className={clsx(
                  'status-badge inline-block px-3 py-1 rounded-full text-sm font-medium',
                  status.bg,
                  status.text,
                  status.class
                )}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Billing details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="font-medium text-charcoal">{invoice.customerName}</p>
            {invoice.customerEmail && (
              <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {invoice.customerAddress}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div>
                <span className="text-sm text-gray-500">Invoice Date: </span>
                <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Due Date: </span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paymentDate && invoice.status === 'paid' && (
                <div>
                  <span className="text-sm text-gray-500">Payment Date: </span>
                  <span className="font-medium">{formatDate(invoice.paymentDate)}</span>
                </div>
              )}
              {invoice.paymentMethod && (
                <div>
                  <span className="text-sm text-gray-500">Payment Method: </span>
                  <span className="font-medium">{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="invoice-table w-full mb-8">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Qty</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Unit Price</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-3 px-4">{item.description}</td>
                <td className="py-3 px-4 text-center">{item.quantity ?? 1}</td>
                <td className="py-3 px-4 text-right">
                  {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount && invoice.discount > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200 text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax !== undefined && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  Tax {invoice.taxRate ? `(${invoice.taxRate}%)` : ''}
                </span>
                <span className="font-medium">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 text-lg">
              <span className="font-bold text-charcoal">Total</span>
              <span className="invoice-total font-bold text-charcoal">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            {invoice.amountPaid !== undefined && invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(invoice.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 -mx-2 px-2 rounded">
                  <span className="font-bold">Balance Due</span>
                  <span className="font-bold">
                    {formatCurrency(invoice.balanceDue ?? invoice.total - invoice.amountPaid)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="invoice-footer border-t border-gray-200 pt-6 mt-6">
            {invoice.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Terms & Conditions</h4>
                <p className="text-sm text-gray-600">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="invoice-footer text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-200">
          <p>Thank you for your business!</p>
          <p className="mt-1">
            Questions? Contact us at apply@gigwheels.strategybase.io or call (346) 587-1177
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrintableInvoice;
