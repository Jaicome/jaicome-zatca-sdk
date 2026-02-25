import Mustache from "mustache";
import { z } from "zod";

import type { EGSInfo, CustomerInfo } from "../schemas/index.js";
import { formatDate, formatTime } from "../utils/date.js";

// XML template for simplified tax invoice
const template = `
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"><ext:UBLExtensions>SET_UBL_EXTENSIONS_STRING</ext:UBLExtensions>
    
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>{{{invoiceSerialNumber}}}</cbc:ID>
    <cbc:UUID>{{{egsInfo.id}}}</cbc:UUID>
    <cbc:IssueDate>{{{issueDate}}}</cbc:IssueDate>
    <cbc:IssueTime>{{{issueTime}}}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="{{{invoiceCode}}}">{{{invoiceType}}}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    {{#cancelation}}
    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>{{{cancelation.canceledSerialInvoiceNumber}}}</cbc:ID>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>
    {{/cancelation}}
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>{{{invoiceCounterNumber}}}</cbc:UUID>
    </cac:AdditionalDocumentReference><cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">{{{previousInvoiceHash}}}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    <cac:AdditionalDocumentReference>
        <cbc:ID>QR</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">SET_QR_CODE_DATA</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    <cac:Signature>
        <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
        <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
    </cac:Signature>
    <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">{{{crnNumber}}}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
      {{#egsInfo.location.street}}
        <cbc:StreetName>{{{egsInfo.location.street}}}</cbc:StreetName>
      {{/egsInfo.location.street}}
      {{#egsInfo.location.building}}
        <cbc:BuildingNumber>{{{egsInfo.location.building}}}</cbc:BuildingNumber>
      {{/egsInfo.location.building}}
      {{#egsInfo.location.plotIdentification}}
        <cbc:PlotIdentification>{{{egsInfo.location.plotIdentification}}}</cbc:PlotIdentification>
      {{/egsInfo.location.plotIdentification}}
      {{#egsInfo.location.citySubdivision}}
        <cbc:CitySubdivisionName>{{{egsInfo.location.citySubdivision}}}</cbc:CitySubdivisionName>
      {{/egsInfo.location.citySubdivision}}
      {{#egsInfo.location.city}}
        <cbc:CityName>{{{egsInfo.location.city}}}</cbc:CityName>
      {{/egsInfo.location.city}}
      {{#egsInfo.location.postalZone}}
        <cbc:PostalZone>{{{egsInfo.location.postalZone}}}</cbc:PostalZone>
      {{/egsInfo.location.postalZone}}
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{{{egsInfo.vatNumber}}}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>{{{egsInfo.vatName}}}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
  {{#customerInfo}}
    <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="CRN">{{{customerInfo.customerCrnNumber}}}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PostalAddress>
          {{#customerInfo.street}}
            <cbc:StreetName>{{{customerInfo.street}}}</cbc:StreetName>
          {{/customerInfo.street}}
          {{#customerInfo.additionalStreet}}
            <cbc:AdditionalStreetName>{{{customerInfo.additionalStreet}}}</cbc:AdditionalStreetName>
          {{/customerInfo.additionalStreet}}
          {{#customerInfo.building}}
            <cbc:BuildingNumber>{{{customerInfo.building}}}</cbc:BuildingNumber>
          {{/customerInfo.building}}
          {{#customerInfo.plotIdentification}}
            <cbc:PlotIdentification>{{{customerInfo.plotIdentification}}}</cbc:PlotIdentification>
          {{/customerInfo.plotIdentification}}
          {{#customerInfo.citySubdivision}}
            <cbc:CitySubdivisionName>{{{customerInfo.citySubdivision}}}</cbc:CitySubdivisionName>
          {{/customerInfo.citySubdivision}}
          {{#customerInfo.city}}
            <cbc:CityName>{{{customerInfo.city}}}</cbc:CityName>
          {{/customerInfo.city}}
          {{#customerInfo.postalZone}}
            <cbc:PostalZone>{{{customerInfo.postalZone}}}</cbc:PostalZone>
          {{/customerInfo.postalZone}}
          {{#customerInfo.countrySubEntity}}
            <cbc:CountrySubentity>{{{customerInfo.countrySubEntity}}}</cbc:CountrySubentity>
          {{/customerInfo.countrySubEntity}}
            <cac:Country>
                <cbc:IdentificationCode>SA</cbc:IdentificationCode>
            </cac:Country>
        </cac:PostalAddress>
        {{#customerInfo.vatNumber}}
        <cac:PartyTaxScheme>
          <cbc:CompanyID>{{{customerInfo.vatNumber}}}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>
        {{/customerInfo.vatNumber}}
        <cac:PartyLegalEntity>
            <cbc:RegistrationName>{{{customerInfo.buyerName}}}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
    </cac:Party>
  {{/customerInfo}}
  </cac:AccountingCustomerParty>
  {{#actualDeliveryDate}}
  <cac:Delivery>
    <cbc:ActualDeliveryDate>{{{actualDeliveryDate}}}</cbc:ActualDeliveryDate>
    {{#latestDeliveryDate}}
    <cbc:LatestDeliveryDate>{{{latestDeliveryDate}}}</cbc:LatestDeliveryDate>
    {{/latestDeliveryDate}}
  </cac:Delivery>
  {{/actualDeliveryDate}}
  {{^cancelation}}
  {{#paymentMethod}}
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>{{{paymentMethod}}}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  {{/paymentMethod}}
  {{/cancelation}}
</Invoice>`;

// --- Invoice Types ---
/**
 * ZATCA invoice type discriminator.
 *
 * - `INVOICE` — standard sales invoice (type code 388)
 * - `DEBIT_NOTE` — debit note issued to increase a previously issued invoice amount (type code 383)
 * - `CREDIT_NOTE` — credit note issued to reduce or cancel a previously issued invoice amount (type code 381)
 *
 * @see INVOICE_TYPE_CODES for the corresponding UN/CEFACT 1001 numeric codes.
 */
export const ZATCAInvoiceTypeSchema = z.enum([
  "INVOICE",
  "DEBIT_NOTE",
  "CREDIT_NOTE",
]);
export type ZATCAInvoiceType = z.infer<typeof ZATCAInvoiceTypeSchema>;

/**
 * Maps each {@link ZATCAInvoiceType} string key to its UN/CEFACT 1001 numeric code.
 *
 * | Key | Code | Meaning |
 * |---|---|---|
 * | `CREDIT_NOTE` | `381` | Credit note |
 * | `DEBIT_NOTE` | `383` | Debit note |
 * | `INVOICE` | `388` | Tax invoice |
 *
 * Used internally when rendering the `<cbc:InvoiceTypeCode>` XML element.
 */
export const INVOICE_TYPE_CODES = {
  CREDIT_NOTE: "381",
  DEBIT_NOTE: "383",
  INVOICE: "388",
} as const satisfies Record<ZATCAInvoiceType, string>;

// --- Payment Methods ---
/**
 * Payment method accepted for this invoice.
 *
 * - `CASH` — cash payment (code 10)
 * - `CREDIT` — credit / deferred payment (code 30)
 * - `BANK_ACCOUNT` — bank transfer (code 42)
 * - `BANK_CARD` — debit or credit card (code 48)
 *
 * @see PAYMENT_METHOD_CODES for the corresponding UN/CEFACT 4461 numeric codes.
 */
export const ZATCAPaymentMethodSchema = z.enum([
  "CASH",
  "CREDIT",
  "BANK_ACCOUNT",
  "BANK_CARD",
]);
export type ZATCAPaymentMethod = z.infer<typeof ZATCAPaymentMethodSchema>;

/**
 * Maps each {@link ZATCAPaymentMethod} string key to its UN/CEFACT 4461 numeric code.
 *
 * | Key | Code | Meaning |
 * |---|---|---|
 * | `BANK_ACCOUNT` | `42` | Bank transfer |
 * | `BANK_CARD` | `48` | Card payment |
 * | `CASH` | `10` | Cash |
 * | `CREDIT` | `30` | Credit / deferred |
 *
 * Used internally when rendering the `<cbc:PaymentMeansCode>` XML element.
 */
export const PAYMENT_METHOD_CODES = {
  BANK_ACCOUNT: "42",
  BANK_CARD: "48",
  CASH: "10",
  CREDIT: "30",
} as const satisfies Record<ZATCAPaymentMethod, string>;

// --- Invoice Codes ---
/**
 * Whether the invoice is a simplified (B2C) or standard (B2B/B2G) invoice.
 *
 * - `SIMPLIFIED` — simplified tax invoice for B2C transactions (code `0200000`)
 * - `STANDARD` — standard tax invoice for B2B or B2G transactions (code `0100000`)
 *
 * @see INVOICE_CODE_VALUES for the corresponding ZATCA invoice subtype codes.
 */
export const InvoiceCodeSchema = z.enum(["STANDARD", "SIMPLIFIED"]);
export type InvoiceCode = z.infer<typeof InvoiceCodeSchema>;

/**
 * Maps each {@link InvoiceCode} string key to its ZATCA invoice subtype code.
 *
 * These codes appear in the `name` attribute of `<cbc:InvoiceTypeCode>` in the UBL XML.
 *
 * | Key | Value | Meaning |
 * |---|---|---|
 * | `SIMPLIFIED` | `0200000` | Simplified tax invoice |
 * | `STANDARD` | `0100000` | Standard tax invoice |
 */
export const INVOICE_CODE_VALUES = {
  SIMPLIFIED: "0200000",
  STANDARD: "0100000",
} as const satisfies Record<InvoiceCode, string>;

/**
 * A monetary discount applied to a single line item.
 */
export interface ZATCAInvoiceLineItemDiscount {
  /** Discount amount in SAR (exclusive of VAT). Must be a positive number. */
  amount: number;
  /** Human-readable reason for the discount (e.g. `'Promotional discount'`). */
  reason: string;
}

/**
 * An additional tax (other than the standard VAT) applied to a line item.
 *
 * Used for special levies or excise taxes that stack on top of the main VAT.
 */
export interface ZATCAInvoiceLineItemTax {
  /** Tax rate as a percentage (e.g. `5` for 5%). */
  percentAmount: number;
}

/**
 * Base shape for a single invoice line item before the VAT type is applied.
 *
 * Extend this with either {@link LineItem} (standard VAT) or {@link ZeroTaxLineItem} (zero/exempt VAT).
 */
export interface InvoiceLineItem {
  /** Unique identifier for this line item within the invoice (e.g. `'1'`, `'2'`). */
  id: string;
  /** Human-readable product or service name. */
  name: string;
  /** Number of units sold. Can be fractional (e.g. `1.5` for 1.5 kg). */
  quantity: number;
  /** Unit price in SAR, excluding VAT. */
  taxExclusivePrice: number;
  /** Additional taxes beyond the standard VAT (e.g. excise tax). Optional. */
  otherTaxes?: ZATCAInvoiceLineItemTax[];
  /** Discounts applied to this line item. Optional. */
  discounts?: ZATCAInvoiceLineItemDiscount[];
}

/**
 * A line item with a zero, exempt, or out-of-scope VAT category.
 *
 * Use this when the item is not subject to the standard 15% or 5% VAT rate.
 * ZATCA requires a category code and, for most categories, a reason.
 *
 * VAT category codes:
 * - `O` — out of scope (not subject to VAT)
 * - `Z` — zero-rated (0% VAT, e.g. basic food items)
 * - `E` — exempt (VAT-exempt supply)
 */
export type ZeroTaxLineItem = InvoiceLineItem & {
  vatPercent: 0;
  vatCategory: {
    code: "O" | "Z" | "E";
    reasonCode?: string;
    reason?: string;
  };
};

/**
 * A line item subject to standard Saudi VAT rates.
 *
 * `vatPercent` must be either `0.15` (15% standard rate) or `0.05` (5% reduced rate).
 */
export type LineItem = InvoiceLineItem & {
  vatPercent: 0.15 | 0.05;
};

/**
 * A single line item on a ZATCA invoice.
 *
 * This is a discriminated union: either a {@link LineItem} (standard/reduced VAT)
 * or a {@link ZeroTaxLineItem} (zero-rated, exempt, or out-of-scope).
 *
 * @example
 * // Standard 15% VAT line item
 * const item: ZATCAInvoiceLineItem = {
 *   id: '1',
 *   name: 'Consulting services',
 *   quantity: 1,
 *   taxExclusivePrice: 1000,
 *   vatPercent: 0.15,
 * };
 */
export type ZATCAInvoiceLineItem = LineItem | ZeroTaxLineItem;

/**
 * Details required when issuing a credit note or debit note.
 *
 * A credit/debit note must reference the original invoice it corrects.
 */
export interface ZATCAInvoiceCancellation {
  /** Serial number of the original invoice being cancelled or adjusted. */
  canceledSerialInvoiceNumber: string;
  /** Payment method used in the original invoice. Accepts string keys or legacy numeric codes. */
  paymentMethod: ZATCAPaymentMethod | "10" | "30" | "42" | "48";
  /** Human-readable reason for the cancellation or adjustment. */
  reason: string;
}

/** @deprecated Use ZATCAInvoiceCancellation instead */
export type ZATCAInvoicCancelation = ZATCAInvoiceCancellation;

/**
 * Core fields shared by all ZATCA invoice variants.
 *
 * Both simplified (B2C) and standard (B2B/B2G) invoices extend this base.
 */
export interface ZatcaInvoiceBase {
  /**
   * E-Invoice Generation System (EGS) information.
   *
   * The EGS is the software or device that generates and submits invoices to ZATCA.
   * This field identifies the supplier's EGS unit.
   */
  egsInfo: EGSInfo;
  /**
   * Supplier's Commercial Registration Number (CRN).
   *
   * The CRN is issued by the Ministry of Commerce and identifies the legal entity.
   * Appears in the `schemeID="CRN"` attribute of the supplier party identification.
   *
   * @example '1234567890'
   */
  crnNumber: string;
  /** Optional buyer information. Required for standard (B2B) invoices; optional for simplified (B2C). */
  customerInfo?: CustomerInfo;
  /**
   * Invoice Counter Value (ICV, KSA-16).
   *
   * A sequential integer that increments by 1 for each invoice issued by this EGS.
   * Must never be reused or skipped. Starts at 1.
   *
   * @example 42
   */
  invoiceCounterNumber: number;
  /**
   * Human-readable serial number for this invoice (KSA-10).
   *
   * Must follow the format `YYYYMMDDTHHMMSSZ-{EGS_ID}-{ICV}` or a custom scheme
   * agreed with ZATCA. Must be unique per EGS.
   *
   * @example 'INV-2024-00042'
   */
  invoiceSerialNumber: string;
  /**
   * Issue timestamp of the invoice in UTC.
   *
   * Date and time XML fields are derived from this value.
   *
   * @example new Date('2024-01-15T14:30:00Z')
   */
  issueDate: Date;
  /**
   * Previous Invoice Hash (PIH, KSA-13).
   *
   * SHA-256 hash of the previous invoice's canonical XML, base64-encoded.
   * This chains invoices together for tamper detection.
   *
   * For the very first invoice ever issued by this EGS, use the constant
   * `GENESIS_PREVIOUS_INVOICE_HASH` exported from `@jaicome/zatca-core`.
   *
   * @example 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjOTljMmVlNmRmNTM5NTc5OTg0OTk4ODRlOTU4OTY5ZDI='
   */
  previousInvoiceHash: string;
  /** One or more line items on this invoice. At least one item is required. */
  lineItems: ZATCAInvoiceLineItem[];
}

/**
 * A credit note or debit note that references and corrects a prior invoice.
 *
 * Must include a {@link ZATCAInvoiceCancellation} block referencing the original invoice.
 */
export type CreditDebitInvoice = ZatcaInvoiceBase & {
  invoiceType: "CREDIT_NOTE" | "DEBIT_NOTE" | "381" | "383";
  cancelation: ZATCAInvoiceCancellation;
};

/**
 * A standard sales invoice (not a credit/debit note).
 *
 * Optionally includes delivery dates and a payment method.
 */
export type CashInvoice = ZatcaInvoiceBase & {
  /** Invoice type. Use `'INVOICE'` (preferred) or the legacy code `'388'`. */
  invoiceType: "INVOICE" | "388";
  /**
   * Actual delivery date of the goods or services (BT-72).
   *
   * Date value. Optional.
   *
   * @example new Date('2024-01-20T00:00:00Z')
   */
  actualDeliveryDate?: Date;
  /**
   * Latest promised delivery date (BT-73).
   *
   * Date value. Optional. Only relevant when `actualDeliveryDate` is set.
   *
   * @example new Date('2024-01-25T00:00:00Z')
   */
  latestDeliveryDate?: Date;
  /** Payment method for this invoice. Accepts string keys or legacy numeric codes. Optional. */
  paymentMethod?: ZATCAPaymentMethod | "10" | "30" | "42" | "48";
};

/**
 * A standard (B2B/B2G) tax invoice.
 *
 * Standard invoices require full buyer details and are subject to ZATCA clearance
 * before being sent to the buyer.
 *
 * `invoiceCode` must be `'STANDARD'` (or legacy `'0100000'`).
 */
export type TaxInvoice = (CashInvoice | CreditDebitInvoice) & {
  invoiceCode: "STANDARD" | "0100000";
  actualDeliveryDate?: Date;
};

/**
 * A simplified (B2C) tax invoice.
 *
 * Simplified invoices are issued directly to end consumers and are reported to ZATCA
 * within 24 hours of issuance (Phase 2).
 *
 * `invoiceCode` must be `'SIMPLIFIED'` (or legacy `'0200000'`).
 */
export type SimplifiedInvoice = (CashInvoice | CreditDebitInvoice) & {
  invoiceCode: "SIMPLIFIED" | "0200000";
};

/**
 * Top-level props for creating any ZATCA invoice.
 *
 * This is a discriminated union of {@link SimplifiedInvoice} and {@link TaxInvoice}.
 * The `invoiceCode` field determines which variant is active.
 *
 * Pass this to {@link ZATCAInvoice} or the `buildInvoice()` function.
 *
 * @example
 * const props: ZATCAInvoiceProps = {
 *   invoiceCode: 'SIMPLIFIED',
 *   invoiceType: 'INVOICE',
 *   egsInfo: { ... },
 *   crnNumber: '1234567890',
 *   invoiceCounterNumber: 1,
 *   invoiceSerialNumber: 'INV-2024-00001',
 *   issueDate: new Date('2024-01-15T14:30:00Z'),
 *   previousInvoiceHash: GENESIS_PREVIOUS_INVOICE_HASH,
 *   lineItems: [{ id: '1', name: 'Item', quantity: 1, taxExclusivePrice: 100, vatPercent: 0.15 }],
 * };
 */
export type ZATCAInvoiceProps = SimplifiedInvoice | TaxInvoice;

const rendering = (props: ZATCAInvoiceProps): string => {
  // Map string keys to numeric codes before passing to Mustache template
  // Handle both old format (numeric codes) and new format (string keys)
  const invoiceTypeCode =
    (INVOICE_TYPE_CODES as Record<string, string>)[props.invoiceType] ??
    props.invoiceType;
  const invoiceCodeValue =
    (INVOICE_CODE_VALUES as Record<string, string>)[props.invoiceCode] ??
    props.invoiceCode;

  const issueDateStr = formatDate(props.issueDate);
  const issueTimeStr = formatTime(props.issueDate);
  const actualDeliveryDateStr =
    "actualDeliveryDate" in props && props.actualDeliveryDate
      ? formatDate(props.actualDeliveryDate)
      : undefined;
  const latestDeliveryDateStr =
    "latestDeliveryDate" in props && props.latestDeliveryDate
      ? formatDate(props.latestDeliveryDate)
      : undefined;

  const mappedProps = {
    ...props,
    issueDate: issueDateStr,
    issueTime: issueTimeStr,
    ...("actualDeliveryDate" in props && props.actualDeliveryDate
      ? { actualDeliveryDate: actualDeliveryDateStr }
      : {}),
    ...("latestDeliveryDate" in props && props.latestDeliveryDate
      ? { latestDeliveryDate: latestDeliveryDateStr }
      : {}),
    invoiceCode: invoiceCodeValue,
    invoiceType: invoiceTypeCode,
    ...("paymentMethod" in props && props.paymentMethod
      ? {
          paymentMethod:
            (PAYMENT_METHOD_CODES as Record<string, string>)[
              props.paymentMethod
            ] ?? props.paymentMethod,
        }
      : {}),
  };
  const result = Mustache.render(template, mappedProps);
  return result;
};

export default function populate(props: ZATCAInvoiceProps): string {
  const populated_template = rendering(props);
  return populated_template;
}
