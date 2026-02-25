/**
 * ZATCA Constants Module
 *
 * Centralized definitions for all ZATCA code lists, transaction types,
 * and system constants. All values reference official ZATCA specifications
 * and UN/CEFACT code lists.
 */

/**
 * SHA256 of '0', base64 encoded.
 *
 * Used internally by EGS.onboard(). Only needed if doing manual compliance onboarding.
 * This is the genesis hash for the first invoice in a sequence.
 *
 * @see ZATCA E-Invoicing Security Features Implementation Standards
 */
export const GENESIS_PREVIOUS_INVOICE_HASH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

/**
 * Invoice type codes (BT-3) per UN/CEFACT code list 1001
 *
 * Defines the classification of the invoice document type.
 *
 * @see UN/CEFACT Code List 1001
 * @see ZATCA E-Invoicing Implementation Standard (BT-3)
 */
export const InvoiceType = {
  /** Credit Note - reduces amount owed */
  CREDIT_NOTE: "381",
  /** Debit Note - increases amount owed */
  DEBIT_NOTE: "383",
  /** Standard/Commercial Invoice */
  INVOICE: "388",
  /** Prepayment Invoice */
  PREPAYMENT: "386",
} as const;

/**
 * Invoice transaction type code (KSA-2)
 *
 * NNPNESB format (7 positions). Identifies the invoice category and type
 * for ZATCA compliance reporting.
 *
 * @see ZATCA E-Invoicing Implementation Standard (KSA-2)
 */
export const TransactionTypeCode = {
  /** Simplified tax invoice */
  SIMPLIFIED: "0200000",
  /** Tax invoice (standard) */
  TAX_INVOICE: "0100000",
} as const;

/**
 * Payment means codes (BT-81) per UN/CEFACT code list 4461
 *
 * Specifies the method of payment used in the transaction.
 *
 * @see UN/CEFACT Code List 4461
 * @see ZATCA E-Invoicing Implementation Standard (BT-81)
 */
export const PaymentMeans = {
  BANK_ACCOUNT: "42",
  BANK_CARD: "48",
  CASH: "10",
  CREDIT: "30",
  NOT_DEFINED: "1",
} as const;

/**
 * VAT category codes (BT-118/BT-151)
 *
 * Classifies the VAT treatment applied to the invoice line or document.
 *
 * @see ZATCA E-Invoicing Implementation Standard (BT-118, BT-151)
 */
export const VATCategory = {
  /** Exempt from tax */
  EXEMPT: "E",
  /** Not subject to VAT */
  NOT_SUBJECT: "O",
  /** Standard rate 15% */
  STANDARD: "S",
  /** Zero-rated */
  ZERO_RATED: "Z",
} as const;

/**
 * VAT exemption reason codes (BT-121)
 *
 * Provides the legal basis for VAT exemption when applicable.
 * All codes reference Saudi Arabia VAT Law articles.
 *
 * @see ZATCA E-Invoicing Implementation Standard (BT-121)
 * @see Saudi Arabia VAT Law
 */
export const ExemptionReasonCode = {
  /** Financial services (Article 29) */
  VATEX_SA_29: "VATEX-SA-29",
  /** Financial services clause 7 (Article 29 para 7) */
  VATEX_SA_29_7: "VATEX-SA-29-7",
  /** Real estate services (Article 30) */
  VATEX_SA_30: "VATEX-SA-30",
  /** Domestic passenger transport (Article 32) */
  VATEX_SA_32: "VATEX-SA-32",
  /** International passenger transport (Article 33) */
  VATEX_SA_33: "VATEX-SA-33",
  /** Certified goods/services (Article 34-1) */
  VATEX_SA_34_1: "VATEX-SA-34-1",
  VATEX_SA_34_2: "VATEX-SA-34-2",
  VATEX_SA_34_3: "VATEX-SA-34-3",
  VATEX_SA_34_4: "VATEX-SA-34-4",
  VATEX_SA_34_5: "VATEX-SA-34-5",
  /** Exports of goods (Article 35) */
  VATEX_SA_35: "VATEX-SA-35",
  /** Health and Life insurance */
  VATEX_SA_36: "VATEX-SA-36",
  /** Educational services */
  VATEX_SA_EDU: "VATEX-SA-EDU",
  /** Healthcare services */
  VATEX_SA_HEA: "VATEX-SA-HEA",
  /** Military, security services */
  VATEX_SA_MLTRY: "VATEX-SA-MLTRY",
  /** Out of scope */
  VATEX_SA_OOS: "VATEX-SA-OOS",
} as const;

/**
 * Buyer ID scheme codes
 *
 * Identifies the type of identification number used for the buyer/customer.
 *
 * @see ZATCA E-Invoicing Implementation Standard
 */
export const BuyerIdScheme = {
  /** Commercial Registration Number */
  CRN: "CRN",
  /** GCC ID */
  GCC: "GCC",
  /** Iqama */
  IQA: "IQA",
  /** Ministry of Labour */
  MLS: "MLS",
  /** Ministry of Commerce */
  MOM: "MOM",
  /** National ID */
  NAT: "NAT",
  /** Other */
  OTH: "OTH",
  /** Passport */
  PAS: "PAS",
  /** Saudi Arabia Government */
  SAG: "SAG",
  /** Tax Identification Number */
  TIN: "TIN",
  _700: "700",
} as const;
