import { z } from "zod";
import Mustache from "mustache";
import type { EGSInfo, CustomerInfo } from "../schemas/index.js";

const template = /* XML */ `
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
export const ZATCAInvoiceTypeSchema = z.enum(["INVOICE", "DEBIT_NOTE", "CREDIT_NOTE"]);
export type ZATCAInvoiceType = z.infer<typeof ZATCAInvoiceTypeSchema>;

export const INVOICE_TYPE_CODES = {
  INVOICE: "388",
  DEBIT_NOTE: "383",
  CREDIT_NOTE: "381",
} as const satisfies Record<ZATCAInvoiceType, string>;

// --- Payment Methods ---
export const ZATCAPaymentMethodSchema = z.enum(["CASH", "CREDIT", "BANK_ACCOUNT", "BANK_CARD"]);
export type ZATCAPaymentMethod = z.infer<typeof ZATCAPaymentMethodSchema>;

export const PAYMENT_METHOD_CODES = {
  CASH: "10",
  CREDIT: "30",
  BANK_ACCOUNT: "42",
  BANK_CARD: "48",
} as const satisfies Record<ZATCAPaymentMethod, string>;

// --- Invoice Codes ---
export const InvoiceCodeSchema = z.enum(["STANDARD", "SIMPLIFIED"]);
export type InvoiceCode = z.infer<typeof InvoiceCodeSchema>;

export const INVOICE_CODE_VALUES = {
  STANDARD: "0100000",
  SIMPLIFIED: "0200000",
} as const satisfies Record<InvoiceCode, string>;

export interface ZATCAInvoiceLineItemDiscount {
  amount: number;
  reason: string;
}

export interface ZATCAInvoiceLineItemTax {
  percentAmount: number;
}

export interface InvoiceLineItem {
  id: string;
  name: string;
  quantity: number;
  taxExclusivePrice: number;
  otherTaxes?: ZATCAInvoiceLineItemTax[];
  discounts?: ZATCAInvoiceLineItemDiscount[];
}

export type ZeroTaxLineItem = InvoiceLineItem & {
  vatPercent: 0;
  vatCategory: {
    code: "O" | "Z" | "E";
    reasonCode?: string;
    reason?: string;
  };
};

export type LineItem = InvoiceLineItem & {
  vatPercent: 0.15 | 0.05;
};

export type ZATCAInvoiceLineItem = LineItem | ZeroTaxLineItem;

export interface ZATCAInvoiceCancellation {
  canceledSerialInvoiceNumber: string;
  paymentMethod: ZATCAPaymentMethod | "10" | "30" | "42" | "48";
  reason: string;
}

/** @deprecated Use ZATCAInvoiceCancellation instead */
export type ZATCAInvoicCancelation = ZATCAInvoiceCancellation;



export interface ZatcaInvoiceBase {
  egsInfo: EGSInfo;
  crnNumber: string;
  customerInfo?: CustomerInfo;
  invoiceCounterNumber: number;
  invoiceSerialNumber: string;
  issueDate: string;
  issueTime: string;
  previousInvoiceHash: string;
  lineItems: ZATCAInvoiceLineItem[];
}

export type CreditDebitInvoice = ZatcaInvoiceBase & {
  invoiceType: "CREDIT_NOTE" | "DEBIT_NOTE" | "381" | "383";
  cancelation: ZATCAInvoiceCancellation;
};

export type CashInvoice = ZatcaInvoiceBase & {
  invoiceType: "INVOICE" | "388";
  actualDeliveryDate?: string;
  latestDeliveryDate?: string;
  paymentMethod?: ZATCAPaymentMethod | "10" | "30" | "42" | "48";
};

export type TaxInvoice = (CashInvoice | CreditDebitInvoice) & {
  invoiceCode: "STANDARD" | "0100000";
  actualDeliveryDate?: string;
};

export type SimplifiedInvoice = (CashInvoice | CreditDebitInvoice) & {
  invoiceCode: "SIMPLIFIED" | "0200000";
};

export type ZATCAInvoiceProps = SimplifiedInvoice | TaxInvoice;

const rendering = (props: ZATCAInvoiceProps): string => {
  // Map string keys to numeric codes before passing to Mustache template
  // Handle both old format (numeric codes) and new format (string keys)
  const invoiceTypeCode = (INVOICE_TYPE_CODES as any)[props.invoiceType] ?? props.invoiceType;
  const invoiceCodeValue = (INVOICE_CODE_VALUES as any)[props.invoiceCode] ?? props.invoiceCode;
  
  const mappedProps = {
    ...props,
    invoiceType: invoiceTypeCode,
    invoiceCode: invoiceCodeValue,
    ...((props as any).paymentMethod
      ? { paymentMethod: (PAYMENT_METHOD_CODES as any)[(props as any).paymentMethod] ?? (props as any).paymentMethod }
      : {}),
  };
  const result = Mustache.render(template, mappedProps);
  return result;
};

export default function populate(props: ZATCAInvoiceProps): string {
  const populated_template = rendering(props);
  return populated_template;
}
