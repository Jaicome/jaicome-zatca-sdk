import type { XMLDocument } from "./parser/index.js";
import {
  concatUint8Arrays,
  stringToUint8Array,
  uint8ArrayToBase64,
} from "./utils/bytes.js";

const encodeTLVTag = (tag: number, value: string): Uint8Array => {
  const valueBytes = stringToUint8Array(value);
  if (valueBytes.length > 255) {
    throw new Error(`TLV value for tag ${tag} exceeds 255 bytes.`);
  }
  return concatUint8Arrays(
    new Uint8Array([tag, valueBytes.length]),
    valueBytes
  );
};

const getInvoiceTagValue = (invoiceXml: XMLDocument, path: string): string => {
  const normalizeValue = (value: unknown): string => {
    const unwrappedValue = Array.isArray(value) ? value[0] : value;
    if (unwrappedValue === null || unwrappedValue === undefined) {
      return "";
    }
    if (typeof unwrappedValue === "object" && "#text" in unwrappedValue) {
      return String((unwrappedValue as Record<string, unknown>)["#text"] ?? "");
    }
    return String(unwrappedValue);
  };

  const value = invoiceXml.get(path)?.[0];
  if (value === null || value === undefined) {
    const segments = path.split("/");
    if (segments.length < 2) {
      return "";
    }

    let current: unknown = invoiceXml.get(segments[0])?.[0];
    for (let index = 1; index < segments.length; index++) {
      if (Array.isArray(current)) {
        current = current[0];
      }
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        return "";
      }
      current = (current as Record<string, unknown>)[segments[index]];
    }

    return normalizeValue(current);
  }

  return normalizeValue(value);
};

export const generatePhaseOneQRFromXml = (invoiceXml: XMLDocument): string => {
  const sellerName = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName"
  );
  if (!sellerName) {
    throw new Error(
      "QR generation failed: missing required field 'RegistrationName' in invoice XML"
    );
  }

  const vatNumber = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID",
    "CompanyID"
  );
  if (!vatNumber) {
    throw new Error(
      "QR generation failed: missing required field 'CompanyID' in invoice XML"
    );
  }

  const invoiceTotal = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount",
    "TaxInclusiveAmount"
  );
  if (!invoiceTotal) {
    throw new Error(
      "QR generation failed: missing required field 'TaxInclusiveAmount' in invoice XML"
    );
  }

  const vatTotal = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:TaxTotal/cbc:TaxAmount",
    "TaxAmount"
  );
  if (!vatTotal) {
    throw new Error(
      "QR generation failed: missing required field 'TaxAmount' in invoice XML"
    );
  }

  const issueDate = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cbc:IssueDate",
    "IssueDate"
  );
  if (!issueDate) {
    throw new Error(
      "QR generation failed: missing required field 'IssueDate' in invoice XML"
    );
  }

  const issueTime = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cbc:IssueTime",
    "IssueTime"
  );
  if (!issueTime) {
    throw new Error(
      "QR generation failed: missing required field 'IssueTime' in invoice XML"
    );
  }

  const formattedDatetime = new Date(`${issueDate}T${issueTime}`)
    .toISOString()
    .slice(0, 19);

  const tlv = concatUint8Arrays(
    encodeTLVTag(1, sellerName),
    encodeTLVTag(2, vatNumber),
    encodeTLVTag(3, formattedDatetime),
    encodeTLVTag(4, invoiceTotal),
    encodeTLVTag(5, vatTotal)
  );

  return uint8ArrayToBase64(tlv);
};
