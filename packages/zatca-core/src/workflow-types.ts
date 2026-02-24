import type { ZATCAInvoiceProps } from "./templates/simplified_tax_invoice_template.js";

// --- Workflow Result Types ---

export type OnboardResult = {
  previousInvoiceHash: string;
  invoiceCounterStart: number;
};

export type SingleReportResult = {
  invoiceSerialNumber: string;
  success: boolean;
  invoiceHash: string;
  reportingStatus?: string;
  clearanceStatus?: string;
  error?: string;
};

export type BatchReportResult = SingleReportResult[];

export interface ClientInvoiceRecord {
  invoiceSerialNumber: string;
  invoiceCounterNumber: number;
  previousInvoiceHash: string;
  props: ZATCAInvoiceProps;
  status: "pending" | "reported" | "failed";
  serverResponse?: SingleReportResult;
  createdAt: string;
}
