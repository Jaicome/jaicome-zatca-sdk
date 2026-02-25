/* eslint-disable eslint/func-style */

import type { Signer, SigningInput } from "./contracts/signer.js";
import { generatePhaseOneQRFromXml } from "./qr.js";
import {
  ZATCAInvoicePropsSchema,
  SigningInputSchema,
  ZodValidationError,
} from "./schemas/index.js";
import type { ZATCAInvoiceProps } from "./zatca-simplified-tax-invoice.js";
import { ZATCAInvoice } from "./zatca-simplified-tax-invoice.js";

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

export function parseInvoice(xml: string, signer?: Signer): ZATCAInvoice {
  return new ZATCAInvoice({ invoice_xml_str: xml, signer });
}

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

export function generatePhaseOneQR(invoice: ZATCAInvoice): string {
  return generatePhaseOneQRFromXml(invoice.getXML());
}
