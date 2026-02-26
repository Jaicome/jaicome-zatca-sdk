import { generatePhaseOneQRFromXml } from "@jaicome/zatca-core";
import type { XMLDocument } from "@jaicome/zatca-core";

import { getInvoiceHash } from "../utils/invoice-hash";

/**
 * Input parameters for {@link generateQR}.
 *
 * @property {XMLDocument} invoice_xml - Parsed UBL XML document of the invoice.
 * @property {string} digital_signature - Base64-encoded ECDSA signature over the invoice hash.
 * @property {Buffer} public_key - Raw EC public key bytes from the signing certificate.
 * @property {Buffer} certificate_signature - Raw signature bytes from the signing certificate.
 */
interface QRParams {
  invoice_xml: XMLDocument;
  digital_signature: string;
  public_key: Buffer;
  certificate_signature: Buffer;
}

/**
 * Generates a ZATCA Phase 2 QR code as a base64-encoded TLV string.
 * The QR encodes seller name, VAT number, invoice datetime, totals, hash,
 * digital signature, public key, and certificate signature.
 *
 * @param params - {@link QRParams} containing the invoice XML and cryptographic material.
 * @returns Base64-encoded TLV buffer suitable for embedding in the invoice QR field.
 */
export const generateQR = ({
  invoice_xml,
  digital_signature,
  public_key,
  certificate_signature,
}: QRParams): string => {
  const invoice_hash: string = getInvoiceHash(invoice_xml);

  const seller_name = invoice_xml.get(
    "Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName"
  )?.[0];
  const VAT_number = invoice_xml
    .get(
      "Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID"
    )?.[0]
    .toString();
  const invoice_total = invoice_xml
    .get("Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")?.[0]
    ["#text"].toString();
  const VAT_total = invoice_xml
    .get("Invoice/cac:TaxTotal")?.[0]
    ["cbc:TaxAmount"]["#text"].toString();

  const issue_date = invoice_xml.get("Invoice/cbc:IssueDate")?.[0];
  const issue_time = invoice_xml.get("Invoice/cbc:IssueTime")?.[0];

  const formatted_datetime = new Date(`${issue_date}T${issue_time}`)
    .toISOString()
    .slice(0, 19);

  const qr_tlv = TLV([
    seller_name,
    VAT_number,
    formatted_datetime,
    invoice_total,
    VAT_total,
    invoice_hash,
    Buffer.from(digital_signature),
    public_key,
    certificate_signature,
  ]);

  return qr_tlv.toString("base64");
};

/**
 * @deprecated Use generatePhaseOneQR from @jaicome/zatca-core instead.
 * This function now delegates to the cross-platform implementation in @jaicome/zatca-core.
 */
export const generatePhaseOneQR = ({
  invoice_xml,
}: {
  invoice_xml: XMLDocument;
}): string => generatePhaseOneQRFromXml(invoice_xml);

const TLV = (tags: unknown[]): Buffer => {
  const tlv_tags: Buffer[] = [];
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const tagValueBuffer: Buffer = Buffer.from(tag as Buffer | string);
    const current_tlv_value: Buffer = Buffer.from([
      i + 1,
      tagValueBuffer.byteLength,
      ...tagValueBuffer,
    ]);
    tlv_tags.push(current_tlv_value);
  }
  return Buffer.concat(tlv_tags);
};
