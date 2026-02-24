export interface ValidationMessage {
  type: string;
  code: string;
  category: string;
  message: string;
  status: string;
}

export interface CertificateResponse {
  binarySecurityToken: string;
  secret: string;
  requestID: string;
}

export interface IssuedCertificate {
  issued_certificate: string;
  api_secret: string;
  request_id: string;
}

export interface InvoiceResponse {
  validationResults?: {
    infoMessages?: ValidationMessage[];
    warningMessages?: ValidationMessage[];
    errorMessages?: ValidationMessage[];
    status?: string;
  };
  reportingStatus?: string;
  clearanceStatus?: string;
}

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
  props: import("@jaicome/zatca-core").ZATCAInvoiceProps;
  status: "pending" | "reported" | "failed";
  serverResponse?: SingleReportResult;
  createdAt: string;
}
