import type { Signer, SigningInput } from "./contracts/signer";
import { generatePhaseOneQRFromXml } from "./qr";
import type { ZATCAInvoiceProps } from "./ZATCASimplifiedTaxInvoice";
import { ZATCAInvoice } from "./ZATCASimplifiedTaxInvoice";
import { ZATCAInvoicePropsSchema, SigningInputSchema, ZodValidationError } from "./schemas";

export function buildInvoice(
	props: ZATCAInvoiceProps,
	signer?: Signer,
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
		invoiceXml: invoice.getXML().toString({}),
		invoiceHash: "",
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
