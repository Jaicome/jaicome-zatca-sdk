import { describe, expect, it } from "vitest";
import { buildInvoice, prepareSigningInput } from "../api";
import { ZodValidationError } from "../schemas";
import { ZATCAInvoiceTypes, ZATCAPaymentMethods } from "../ZATCASimplifiedTaxInvoice";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);

const validProps: ZATCAInvoiceProps = {
	egs_info: {
		uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
		custom_id: "EGS1",
		model: "IOS",
		CRN_number: "7032256278",
		VAT_name: "Jaicome Information Technology",
		VAT_number: "311497191800003",
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
		},
	],
	invoice_type: ZATCAInvoiceTypes.INVOICE,
	invoice_code: "0200000",
	payment_method: ZATCAPaymentMethods.CASH,
};

describe("validation contracts - zatca-core", () => {
	it("buildInvoice succeeds with valid invoice props", () => {
		const invoice = buildInvoice(validProps);
		expect(invoice).toBeDefined();
		expect(invoice.getXML).toBeDefined();
	});

	it("buildInvoice throws ZodValidationError when invoice_serial_number is missing", () => {
		const invalid = { ...validProps, invoice_serial_number: "" };
		expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(ZodValidationError);
	});

	it("ZodValidationError carries typed issue path for empty invoice_serial_number", () => {
		const invalid = { ...validProps, invoice_serial_number: "" };
		try {
			buildInvoice(invalid as ZATCAInvoiceProps);
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("invoice_serial_number"))).toBe(true);
		}
	});

	it("buildInvoice throws ZodValidationError when VAT_number is empty string", () => {
		const invalid = {
			...validProps,
			egs_info: { ...validProps.egs_info, VAT_number: "" },
		};
		expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(ZodValidationError);
	});

	it("buildInvoice throws ZodValidationError when line_items is empty", () => {
		const invalid = { ...validProps, line_items: [] };
		expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(ZodValidationError);
	});

	it("prepareSigningInput returns valid SigningInput for a built invoice", () => {
		const invoice = buildInvoice(validProps);
		const signingInput = prepareSigningInput(invoice);
		expect(typeof signingInput.invoiceXml).toBe("string");
		expect(signingInput.invoiceXml.length).toBeGreaterThan(0);
		expect(typeof signingInput.invoiceHash).toBe("string");
		expect(typeof signingInput.privateKeyReference).toBe("string");
	});

	it("ZodValidationError message includes field path info", () => {
		const invalid = { ...validProps, invoice_serial_number: "" };
		try {
			buildInvoice(invalid as ZATCAInvoiceProps);
			expect.fail("should have thrown");
		} catch (err) {
			const zodErr = err as ZodValidationError;
			expect(zodErr.message).toContain("Validation failed");
			expect(zodErr.name).toBe("ZodValidationError");
		}
	});
});
