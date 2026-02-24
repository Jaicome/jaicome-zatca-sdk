import { describe, expect, it } from "vitest";
import { buildInvoice, prepareSigningInput } from "../api.js";
import { ZodValidationError } from "../schemas/index.js";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice.js";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice.js";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);

const validProps: ZATCAInvoiceProps = {
	egsInfo: {
		id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
		name: "EGS1",
		model: "IOS",
		vatName: "Jaicome Information Technology",
		vatNumber: "311497191800003",
		branchName: "Main",
		branchIndustry: "Software",
	},
	crnNumber: "7032256278",
	invoiceCounterNumber: 1,
	invoiceSerialNumber: "EGS1-886431145-101",
	issueDate: issueDate,
	issueTime: issueTime,
	previousInvoiceHash:
		"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
	lineItems: [
		{
			id: "1",
			name: "TEST ITEM",
			quantity: 2,
			taxExclusivePrice: 100,
			vatPercent: 0.15,
		},
	],
	invoiceType: "INVOICE",
	invoiceCode: "SIMPLIFIED",
	paymentMethod: "CASH",
};

describe("validation contracts - zatca-core", () => {
	it("buildInvoice succeeds with valid invoice props", () => {
		const invoice = buildInvoice(validProps);
		expect(invoice).toBeDefined();
		expect(invoice.getXML).toBeDefined();
	});

	it("buildInvoice throws ZodValidationError when invoiceSerialNumber is missing", () => {
		const invalid = { ...validProps, invoiceSerialNumber: "" };
		expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(ZodValidationError);
	});

	it("ZodValidationError carries typed issue path for empty invoiceSerialNumber", () => {
		const invalid = { ...validProps, invoiceSerialNumber: "" };
		try {
			buildInvoice(invalid as ZATCAInvoiceProps);
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("invoiceSerialNumber"))).toBe(true);
		}
	});

	it("buildInvoice throws ZodValidationError when vatNumber is empty string", () => {
		const invalid = {
			...validProps,
			egsInfo: { ...validProps.egsInfo, vatNumber: "" },
		};
		expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(ZodValidationError);
	});

	it("buildInvoice throws ZodValidationError when lineItems is empty", () => {
		const invalid = { ...validProps, lineItems: [] };
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
		const invalid = { ...validProps, invoiceSerialNumber: "" };
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
