/**
 * UI Components Index
 * Weekly Vehicle Leasing Platform - Salvage-to-Lux Fleet Management
 *
 * Central export for all reusable UI components
 */

// Toast notifications
export { ToastProvider, useToast, ToastContext } from './Toast';
export type { Toast, ToastType, ToastPosition } from './Toast';

// Data Table with pagination, sorting, filtering
export { DataTable } from './DataTable';
export type {
  Column,
  SortDirection,
  SortState,
  PaginationProps,
  DataTableProps,
} from './DataTable';

// Modal dialogs
export { Modal, ConfirmModal, AlertModal, useModal } from './Modal';
export type { ModalSize, ModalProps, ConfirmModalProps, AlertModalProps } from './Modal';

// Form components
export {
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  FormGroup,
  FormSection,
} from './FormField';

// File upload
export { FileUpload } from './FileUpload';
export type { FileUploadProps, UploadedFile, UploadStatus } from './FileUpload';

// Date picker
export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

// Breadcrumb navigation
export {
  Breadcrumb,
  BreadcrumbContainer,
  generateBreadcrumbsFromPath,
  useBreadcrumbs,
} from './Breadcrumb';
export type { BreadcrumbItem, BreadcrumbProps } from './Breadcrumb';

// Printable invoice
export { PrintableInvoice } from './PrintableInvoice';
export type { PrintableInvoiceProps, InvoiceData, InvoiceLineItem } from './PrintableInvoice';

// Optimized images
export { OptimizedImage, VehicleImage } from './OptimizedImage';

// Theme toggle
export { ThemeProvider, ThemeToggle, useTheme, ThemeContext } from './ThemeToggle';
export type { Theme } from './ThemeToggle';
