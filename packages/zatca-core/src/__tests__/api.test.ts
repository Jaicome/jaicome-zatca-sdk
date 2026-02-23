import { describe, expect, it } from "vitest";
import {
	buildInvoice,
	generatePhaseOneQR,
	parseInvoice,
	prepareSigningInput,
} from "../api.js";
import { ZodValidationError } from "../schemas/index.js";
import { valid_simplified_invoice_xml_sample } from "../samples/index.js";
import { base64ToUint8Array } from "../utils/index.js";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice.js";
import {
	ZATCAInvoiceTypes,
	ZATCAPaymentMethods,
} from "../ZATCASimplifiedTaxInvoice.js";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);

const validInvoiceProps: ZATCAInvoiceProps = {
	egs_info: {
		uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
		custom_id: "EGS2",
		model: "IOS",
		CRN_number: "7032256278",
		VAT_name: "Jaicome Information Technology",
		VAT_number: "311497191800003",
		location: {
			city: "Khobar",
			city_subdivision: "West",
			street: "King Fahd st",
			plot_identification: "0000",
			building: "0000",
			postal_zone: "31952",
		},
		branch_name: "Main",
		branch_industry: "Software",
	},
	invoice_counter_number: 1,
	invoice_serial_number: "EGS1-886431145-101",
	issue_date: issueDate,
	issue_time: issueTime,
	previous_invoice_hash:
		"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
	line_items: [
		{
			id: "1",
			name: "TEST ITEM",
			quantity: 2,
			tax_exclusive_price: 100,
			VAT_percent: 0.15,
			discounts: [{ amount: 5, reason: "discount" }],
		},
	],
	invoice_type: ZATCAInvoiceTypes.INVOICE,
	invoice_code: "0200000",
	payment_method: ZATCAPaymentMethods.CASH,
};

describe("core public api", () => {
	it("buildInvoice creates invoice from props", () => {
		const invoice = buildInvoice(validInvoiceProps);
		const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

		expect(invoiceId).toBe(validInvoiceProps.invoice_serial_number);
	});

	it("buildInvoice throws a graceful error for empty props", () => {
		expect(() =>
			buildInvoice(undefined as unknown as ZATCAInvoiceProps),
		).toThrow(ZodValidationError);
	});

	it("parseInvoice parses XML into ZATCAInvoice", () => {
		const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
		const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

		expect(invoiceId).toBe("SME00062");
	});

	it("prepareSigningInput returns SigningInput contract shape", () => {
		const invoice = buildInvoice(validInvoiceProps);
		const signingInput = prepareSigningInput(invoice);

		expect(signingInput).toEqual({
			invoiceXml: invoice.getXML().toString({}),
			invoiceHash: "",
			privateKeyReference: "",
		});
	});

	it("generatePhaseOneQR returns valid base64 TLV payload", () => {
		const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
		const qr = generatePhaseOneQR(invoice);
		const qrBytes = base64ToUint8Array(qr);

		expect(qr).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
		expect(qrBytes.length).toBeGreaterThan(0);
	});
});
