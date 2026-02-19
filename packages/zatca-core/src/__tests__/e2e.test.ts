import { describe, expect, it } from "vitest";
import {
	buildInvoice,
	parseInvoice,
	prepareSigningInput,
	generatePhaseOneQR,
	ZodValidationError,
	ZATCAInvoiceTypes,
	ZATCAPaymentMethods,
	valid_simplified_invoice_xml_sample,
} from "@jaicome/zatca-core";
import type { ZATCAInvoiceProps } from "@jaicome/zatca-core";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);

const validSampleProps: ZATCAInvoiceProps = {
	egs_info: {
		uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
		custom_id: "EGS1",
		model: "IOS",
		CRN_number: "7032256278",
		VAT_name: "Jaicome Information Technology",
		VAT_number: "311497191800003",
		branch_name: "Main",
		branch_industry: "Software",
		location: {
			city: "Khobar",
			city_subdivision: "West",
			street: "King Fahd st",
			plot_identification: "0000",
			building: "0000",
			postal_zone: "31952",
		},
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
			name: "Sample Product",
			quantity: 2,
			tax_exclusive_price: 100,
			VAT_percent: 0.15,
		},
	],
	invoice_type: ZATCAInvoiceTypes.INVOICE,
	invoice_code: "0200000",
	payment_method: ZATCAPaymentMethods.CASH,
};

describe("@jaicome/zatca-core — end-to-end pipeline", () => {
	it("buildInvoice returns a ZATCAInvoice with non-empty XML", () => {
		const invoice = buildInvoice(validSampleProps);

		expect(invoice).toBeDefined();
		const xml = invoice.getXML().toString({});
		expect(typeof xml).toBe("string");
		expect(xml.length).toBeGreaterThan(0);
		expect(xml).toContain("Invoice");
	});

	it("prepareSigningInput returns a SigningInput with non-empty invoiceXml", () => {
		const invoice = buildInvoice(validSampleProps);
		const signingInput = prepareSigningInput(invoice);

		expect(signingInput).toBeDefined();
		expect(typeof signingInput.invoiceXml).toBe("string");
		expect(signingInput.invoiceXml.length).toBeGreaterThan(0);
		expect(signingInput).toHaveProperty("invoiceHash");
		expect(signingInput).toHaveProperty("privateKeyReference");
	});

	it("generatePhaseOneQR returns a non-empty base64 string from sample XML", () => {
		const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
		const qr = generatePhaseOneQR(invoice);

		expect(typeof qr).toBe("string");
		expect(qr.length).toBeGreaterThan(0);
		expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("parseInvoice parses XML string and returns a ZATCAInvoice", () => {
		const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
		const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

		expect(invoice).toBeDefined();
		expect(invoiceId).toBe("SME00062");
	});

	it("full pipeline: buildInvoice → prepareSigningInput → generatePhaseOneQR", () => {
		const invoice = buildInvoice(validSampleProps);
		const xml = invoice.getXML().toString({});
		expect(xml.length).toBeGreaterThan(0);

		const signingInput = prepareSigningInput(invoice);
		expect(signingInput.invoiceXml.length).toBeGreaterThan(0);

		const qr = generatePhaseOneQR(invoice);
		expect(qr.length).toBeGreaterThan(0);
		expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("parseInvoice round-trip: buildInvoice XML can be re-parsed", () => {
		const invoice = buildInvoice(validSampleProps);
		const xmlString = invoice.getXML().toString({});

		const reparsed = parseInvoice(xmlString);
		expect(reparsed).toBeDefined();
		const reparsedXml = reparsed.getXML().toString({});
		expect(reparsedXml.length).toBeGreaterThan(0);
	});

	it("buildInvoice throws ZodValidationError for invalid (empty) props", () => {
		expect(() =>
			buildInvoice(undefined as unknown as ZATCAInvoiceProps),
		).toThrow(ZodValidationError);
	});

	it("buildInvoice throws ZodValidationError when invoice_serial_number is empty", () => {
		const invalidProps = { ...validSampleProps, invoice_serial_number: "" };
		expect(() =>
			buildInvoice(invalidProps as ZATCAInvoiceProps),
		).toThrow(ZodValidationError);
	});

	it("ZodValidationError includes field path info for invalid invoice", () => {
		const invalidProps = { ...validSampleProps, invoice_serial_number: "" };
		try {
			buildInvoice(invalidProps as ZATCAInvoiceProps);
			expect.fail("should have thrown ZodValidationError");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			expect(zodErr.message).toContain("Validation failed");
			expect(zodErr.name).toBe("ZodValidationError");
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("invoice_serial_number"))).toBe(true);
		}
	});
});
