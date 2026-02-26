/* eslint-disable eslint/func-style */

import type { Signer, SigningInput } from "./contracts/signer";
import { generatePhaseOneQRFromXml } from "./qr";
import {
  ZATCAInvoicePropsSchema,
  SigningInputSchema,
  ZodValidationError,
} from "./schemas/index";
import type { ZATCAInvoiceProps } from "./zatca-simplified-tax-invoice";
import { ZATCAInvoice } from "./zatca-simplified-tax-invoice";

/**
 * Validates and builds a {@link ZATCAInvoice} from structured props.
 *
 * Runs full Zod schema validation before constructing the invoice. Throws a
 * {@link ZodValidationError} with field-level details if any field is invalid.
 *
 * This is the recommended entry point for creating new invoices.
 *
 * @param props - Structured invoice data. See {@link ZATCAInvoiceProps}.
 * @param signer - Optional signing implementation. Pass a `NodeSigner` from
 *   `@jaicome/zatca-server` if you intend to sign the invoice immediately.
 * @returns A constructed {@link ZATCAInvoice} ready for signing or XML export.
 * @throws {ZodValidationError} If `props` fails schema validation.
 *
 * @example
 * import { buildInvoice, GENESIS_PREVIOUS_INVOICE_HASH } from '@jaicome/zatca-core';
 *
 * const invoice = buildInvoice({
 *   invoiceCode: 'SIMPLIFIED',
 *   invoiceType: 'INVOICE',
 *   egsInfo: { ... },
 *   crnNumber: '1234567890',
 *   invoiceCounterNumber: 1,
 *   invoiceSerialNumber: 'INV-2024-00001',
 *   issueDate: '2024-01-15',
 *   issueTime: '14:30:00Z',
 *   previousInvoiceHash: GENESIS_PREVIOUS_INVOICE_HASH,
 *   lineItems: [{ id: '1', name: 'Item', quantity: 1, taxExclusivePrice: 100, vatPercent: 0.15 }],
 * });
 */
export function buildInvoice(
  props: ZATCAInvoiceProps,
  signer?: Signer
): ZATCAInvoice {
  const result = ZATCAInvoicePropsSchema.safeParse(props);
  if (!result.success) {
    throw new ZodValidationError(result.error.issues);
  }
  return new ZATCAInvoice({ props, signer });
}

/**
 * Parses an existing ZATCA invoice from a raw UBL 2.1 XML string.
 *
 * Use this when you have a previously generated (or received) invoice XML and need
 * to re-sign it, inspect it, or generate its QR code.
 *
 * No schema validation is performed on the XML content.
 *
 * @param xml - Raw UBL 2.1 XML string.
 * @param signer - Optional signing implementation.
 * @returns A {@link ZATCAInvoice} wrapping the parsed XML.
 * @throws {Error} If the XML string cannot be parsed.
 */
export function parseInvoice(xml: string, signer?: Signer): ZATCAInvoice {
  return new ZATCAInvoice({ invoice_xml_str: xml, signer });
}

/**
 * Extracts a {@link SigningInput} from a built invoice, ready to pass to a signer.
 *
 * Useful when you want to separate invoice construction from the signing step,
 * for example to sign on a different server or in a different process.
 *
 * The returned object contains the serialized XML and empty placeholder fields
 * for `invoiceHash` and `privateKeyReference` that the signer will populate.
 *
 * @param invoice - A {@link ZATCAInvoice} instance (from `buildInvoice` or `parseInvoice`).
 * @returns A {@link SigningInput} object validated against the signing schema.
 * @throws {ZodValidationError} If the extracted signing input fails schema validation.
 */
export function prepareSigningInput(invoice: ZATCAInvoice): SigningInput {
  const signingInput: SigningInput = {
    invoiceHash: "",
    invoiceXml: invoice.getXML().toString({}),
    privateKeyReference: "",
  };
  const result = SigningInputSchema.safeParse(signingInput);
  if (!result.success) {
    throw new ZodValidationError(result.error.issues);
  }
  return signingInput;
}

/**
 * Generates a Phase 1 QR code string for a ZATCA simplified invoice.
 *
 * The QR code is TLV-encoded (Tag-Length-Value) and contains the supplier name,
 * VAT registration number, invoice timestamp, invoice total, and VAT total.
 *
 * Phase 1 QR codes are embedded in the invoice XML and printed on the invoice.
 * They do not require a digital signature.
 *
 * @param invoice - A {@link ZATCAInvoice} instance.
 * @returns Base64-encoded TLV QR code string.
 *
 * @see https://zatca.gov.sa for QR code specification details.
 */
export function generatePhaseOneQR(invoice: ZATCAInvoice): string {
  return generatePhaseOneQRFromXml(invoice.getXML());
}
