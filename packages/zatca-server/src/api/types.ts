/**
 * A single validation message returned by the ZATCA API.
 * ZATCA groups messages into info, warning, and error categories.
 *
 * @property {string} type - Message type (e.g. `'ERROR'`, `'WARNING'`, `'INFO'`).
 * @property {string} code - ZATCA-specific error/warning code.
 * @property {string} category - Validation category (e.g. `'XSD_VALIDATION'`, `'SIGNATURE_VALIDATION'`).
 * @property {string} message - Human-readable description of the issue.
 * @property {string} status - Status string (e.g. `'PASS'`, `'FAIL'`).
 */
export interface ValidationMessage {
  type: string;
  code: string;
  category: string;
  message: string;
  status: string;
}

/**
 * Raw response body from the ZATCA certificate issuance endpoints.
 * Returned by both the compliance and production CSID endpoints.
 *
 * @property {string} binarySecurityToken - Base64-encoded DER certificate (the CSID).
 * @property {string} secret - API secret to use alongside the certificate for authenticated requests.
 * @property {string} requestID - Unique request identifier. Pass this to `EGS.issueProductionCertificate`
 *   to exchange a compliance CSID for a production CSID.
 */
export interface CertificateResponse {
  binarySecurityToken: string;
  secret: string;
  requestID: string;
}

/**
 * Normalised certificate data returned after a successful CSID issuance.
 * The raw `binarySecurityToken` is decoded and wrapped in PEM headers.
 *
 * @property {string} issued_certificate - PEM-encoded CSID ready for use in signing and API auth.
 * @property {string} api_secret - API secret paired with this certificate.
 * @property {string} request_id - Unique request ID. Required to issue a production CSID from a compliance one.
 */
export interface IssuedCertificate {
  issued_certificate: string;
  api_secret: string;
  request_id: string;
}

/**
 * Response from the ZATCA invoice reporting or clearance endpoints.
 *
 * @property {object} [validationResults] - Structured validation output from ZATCA.
 * @property {string} [reportingStatus] - Present on reporting responses (e.g. `'REPORTED'`).
 * @property {string} [clearanceStatus] - Present on clearance responses (e.g. `'CLEARED'`).
 */
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
