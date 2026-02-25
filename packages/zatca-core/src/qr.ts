import moment from "moment";

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
  const vatNumber = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID"
  );
  const invoiceTotal = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount"
  );
  const vatTotal = getInvoiceTagValue(
    invoiceXml,
    "Invoice/cac:TaxTotal/cbc:TaxAmount"
  );
  const issueDate = getInvoiceTagValue(invoiceXml, "Invoice/cbc:IssueDate");
  const issueTime = getInvoiceTagValue(invoiceXml, "Invoice/cbc:IssueTime");

  const datetime = `${issueDate} ${issueTime}`;
  const formattedDatetime = moment(datetime).format("YYYY-MM-DDTHH:mm:ss");

  const tlv = concatUint8Arrays(
    encodeTLVTag(1, sellerName),
    encodeTLVTag(2, vatNumber),
    encodeTLVTag(3, formattedDatetime),
    encodeTLVTag(4, invoiceTotal),
    encodeTLVTag(5, vatTotal)
  );

  return uint8ArrayToBase64(tlv);
};
