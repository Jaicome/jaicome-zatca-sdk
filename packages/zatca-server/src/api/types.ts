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
