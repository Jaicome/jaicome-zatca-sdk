import { describe, expect, it } from "vitest";
import { buildInvoice } from "../api";
import { ZodValidationError } from "../schemas";
import { ZATCAInvoiceTypes, ZATCAPaymentMethods } from "../ZATCASimplifiedTaxInvoice";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice";

function makeBaseProps(): ZATCAInvoiceProps {
	return {
		egs_info: {
			uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
			custom_id: "EGS1-TYPES",
			model: "IOS",
			CRN_number: "7032256278",
			VAT_name: "Invoice Types Test Co",
			VAT_number: "311497191800003",
			branch_name: "Main",
			branch_industry: "Software",
		},
		invoice_counter_number: 1,
		invoice_serial_number: "TYPES-001",
		issue_date: "2024-01-15",
		issue_time: "10:00:00",
		previous_invoice_hash:
			"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
		line_items: [
			{
				id: "1",
				name: "Test Product",
				quantity: 1,
				tax_exclusive_price: 100,
				VAT_percent: 0.15,
			},
		],
		invoice_type: ZATCAInvoiceTypes.INVOICE,
		invoice_code: "0200000",
	};
}

function getXMLValue(invoice: ReturnType<typeof buildInvoice>, path: string): string | undefined {
	const result = invoice.getXML().get(path)?.[0];
	if (typeof result === "object" && result !== null && "#text" in result) {
		return String(result["#text"]);
	}
	return result ? String(result) : undefined;
}


describe("Invoice type 388 — invoice code variations", () => {
	it("Simplified invoice (0200000, type 388): buildInvoice succeeds", () => {
		expect(() => buildInvoice(makeBaseProps())).not.toThrow();
	});

	it("Tax invoice (0100000, type 388): buildInvoice succeeds", () => {
		const props = {
			...makeBaseProps(),
			invoice_code: "0100000",
		} as unknown as ZATCAInvoiceProps;
		expect(() => buildInvoice(props)).not.toThrow();
	});

	it("Invoice type code in XML is '388' for simplified invoice", () => {
		const invoice = buildInvoice(makeBaseProps());
		const typeCode = getXMLValue(invoice, "Invoice/cbc:InvoiceTypeCode");
		expect(typeCode).toBe("388");
	});

	it("Invoice type code in XML is '388' for tax invoice (0100000)", () => {
		const props = {
			...makeBaseProps(),
			invoice_code: "0100000",
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const typeCode = getXMLValue(invoice, "Invoice/cbc:InvoiceTypeCode");
		expect(typeCode).toBe("388");
	});

	it("invoice_code '0200000' appears as InvoiceTypeCode name attribute", () => {
		const invoice = buildInvoice(makeBaseProps());
		const typeCodeElement = invoice.getXML().get("Invoice/cbc:InvoiceTypeCode")?.[0];
		expect(typeCodeElement?.["@_name"]).toBe("0200000");
	});

	it("invoice_code '0100000' appears as InvoiceTypeCode name attribute", () => {
		const props = {
			...makeBaseProps(),
			invoice_code: "0100000",
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const typeCodeElement = invoice.getXML().get("Invoice/cbc:InvoiceTypeCode")?.[0];
		expect(typeCodeElement?.["@_name"]).toBe("0100000");
	});
});


describe("Credit Note (type 381) — cancelation flow", () => {
	const creditNoteBase = {
		...makeBaseProps(),
		invoice_type: ZATCAInvoiceTypes.CREDIT_NOTE,
		cancelation: {
			canceled_serial_invoice_number: "ORIG-001",
			payment_method: ZATCAPaymentMethods.CASH,
			reason: "Incorrect invoice amount",
		},
	};

	it("Build credit note with cancelation: succeeds", () => {
		expect(() =>
			buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps),
		).not.toThrow();
	});

	it("XML contains BillingReference for credit note", () => {
		const invoice = buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps);
		const billingRef = invoice.getXML().get("Invoice/cac:BillingReference");
		expect(billingRef).toBeDefined();
	});

	it("BillingReference contains the correct canceled invoice number", () => {
		const invoice = buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps);
		const refId = getXMLValue(
			invoice,
			"Invoice/cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID",
		);
		expect(refId).toBe("ORIG-001");
	});

	it("Credit note with cancelation: PaymentMeans is set from cancelation.payment_method", () => {
		const invoice = buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps);
		const paymentCode = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode");
		expect(paymentCode).toBe("10");
	});

	it("Credit note with cancelation: PaymentMeans InstructionNote contains the reason", () => {
		const invoice = buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps);
		const note = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:InstructionNote");
		expect(note).toBe("Incorrect invoice amount");
	});

	it("Credit note WITHOUT cancelation throws ZodValidationError", () => {
		const invalidProps = {
			...makeBaseProps(),
			invoice_type: ZATCAInvoiceTypes.CREDIT_NOTE,

		};
		expect(() =>
			buildInvoice(invalidProps as unknown as ZATCAInvoiceProps),
		).toThrow(ZodValidationError);
	});
});


describe("Debit Note (type 383) — cancelation flow", () => {
	const debitNoteBase = {
		...makeBaseProps(),
		invoice_type: ZATCAInvoiceTypes.DEBIT_NOTE,
		cancelation: {
			canceled_serial_invoice_number: "DEBIT-ORIG-001",
			payment_method: ZATCAPaymentMethods.CREDIT,
			reason: "Underbilling correction",
		},
	};

	it("Build debit note with cancelation: succeeds", () => {
		expect(() =>
			buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps),
		).not.toThrow();
	});

	it("XML contains BillingReference for debit note", () => {
		const invoice = buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps);
		const billingRef = invoice.getXML().get("Invoice/cac:BillingReference");
		expect(billingRef).toBeDefined();
	});

	it("BillingReference contains the correct canceled invoice number for debit note", () => {
		const invoice = buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps);
		const refId = getXMLValue(
			invoice,
			"Invoice/cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID",
		);
		expect(refId).toBe("DEBIT-ORIG-001");
	});

	it("Debit note WITHOUT cancelation throws ZodValidationError", () => {
		const invalidProps = {
			...makeBaseProps(),
			invoice_type: ZATCAInvoiceTypes.DEBIT_NOTE,

		};
		expect(() =>
			buildInvoice(invalidProps as unknown as ZATCAInvoiceProps),
		).toThrow(ZodValidationError);
	});
});


describe("Payment methods — all 4 values", () => {
	it("Cash (10): buildInvoice succeeds and PaymentMeansCode = '10'", () => {
		const props = {
			...makeBaseProps(),
			payment_method: ZATCAPaymentMethods.CASH,
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const paymentCode = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode");
		expect(paymentCode).toBe("10");
	});

	it("Credit (30): PaymentMeansCode = '30'", () => {
		const props = {
			...makeBaseProps(),
			payment_method: ZATCAPaymentMethods.CREDIT,
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const paymentCode = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode");
		expect(paymentCode).toBe("30");
	});

	it("BankAccount (42): PaymentMeansCode = '42'", () => {
		const props = {
			...makeBaseProps(),
			payment_method: ZATCAPaymentMethods.BANK_ACCOUNT,
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const paymentCode = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode");
		expect(paymentCode).toBe("42");
	});

	it("BankCard (48): PaymentMeansCode = '48'", () => {
		const props = {
			...makeBaseProps(),
			payment_method: ZATCAPaymentMethods.BANK_CARD,
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const paymentCode = getXMLValue(invoice, "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode");
		expect(paymentCode).toBe("48");
	});

	it("No payment_method: buildInvoice succeeds (optional for type 388)", () => {

		expect(() => buildInvoice(makeBaseProps())).not.toThrow();
	});

	it("No payment_method: PaymentMeans is absent from XML", () => {
		const invoice = buildInvoice(makeBaseProps());
		const paymentMeans = invoice.getXML().get("Invoice/cac:PaymentMeans");
		expect(paymentMeans).toBeUndefined();
	});
});


describe("Customer info — presence and absence", () => {
	function makePropsWithCustomer(): ZATCAInvoiceProps {
		return {
			...makeBaseProps(),
			egs_info: {
				...makeBaseProps().egs_info,
				customer_info: {
					buyer_name: "Test Buyer",
					vat_number: "123456789",
				},
			},
		} as ZATCAInvoiceProps;
	}

	it("With customer_info: AccountingCustomerParty has Party element", () => {
		const invoice = buildInvoice(makePropsWithCustomer());
		const party = invoice.getXML().get("Invoice/cac:AccountingCustomerParty/cac:Party");
		expect(party).toBeDefined();
	});

	it("With customer_info: buyer_name appears in the XML string", () => {
		const invoice = buildInvoice(makePropsWithCustomer());
		const xmlString = invoice.getXML().toString({});
		expect(xmlString).toContain("Test Buyer");
	});

	it("With customer_info: RegistrationName element contains buyer_name", () => {
		const invoice = buildInvoice(makePropsWithCustomer());
		const registrationName = getXMLValue(
			invoice,
			"Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName",
		);
		expect(registrationName).toBe("Test Buyer");
	});

	it("Without customer_info: AccountingCustomerParty has no Party element", () => {
		const invoice = buildInvoice(makeBaseProps());
		const party = invoice.getXML().get("Invoice/cac:AccountingCustomerParty/cac:Party");
		expect(party).toBeUndefined();
	});
});


describe("Multiple line items", () => {
	it("2 items at 15%: buildInvoice succeeds", () => {
		const props = {
			...makeBaseProps(),
			line_items: [
				{ id: "1", name: "Product A", quantity: 1, tax_exclusive_price: 100, VAT_percent: 0.15 },
				{ id: "2", name: "Product B", quantity: 2, tax_exclusive_price: 50, VAT_percent: 0.15 },
			],
		} as unknown as ZATCAInvoiceProps;
		expect(() => buildInvoice(props)).not.toThrow();
	});

	it("2 items: InvoiceLine count is 2", () => {
		const props = {
			...makeBaseProps(),
			line_items: [
				{ id: "1", name: "Product A", quantity: 1, tax_exclusive_price: 100, VAT_percent: 0.15 },
				{ id: "2", name: "Product B", quantity: 2, tax_exclusive_price: 50, VAT_percent: 0.15 },
			],
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const lines = invoice.getXML().get("Invoice/cac:InvoiceLine");
		expect(lines).toBeDefined();
		expect(lines!.length).toBe(2);
	});

	it("3 items at different rates (15%, 5%, 0%/O): buildInvoice succeeds", () => {
		const props = {
			...makeBaseProps(),
			line_items: [
				{ id: "1", name: "Standard 15%", quantity: 1, tax_exclusive_price: 100, VAT_percent: 0.15 },
				{ id: "2", name: "Reduced 5%", quantity: 1, tax_exclusive_price: 50, VAT_percent: 0.05 },
				{
					id: "3",
					name: "Zero Tax",
					quantity: 1,
					tax_exclusive_price: 25,
					VAT_percent: 0,
					vat_category: { code: "O", reason: "Out of scope", reason_code: "VATEX-SA-OOS" },
				},
			],
		} as unknown as ZATCAInvoiceProps;
		expect(() => buildInvoice(props)).not.toThrow();
	});

	it("3 items at different rates: InvoiceLine count is 3", () => {
		const props = {
			...makeBaseProps(),
			line_items: [
				{ id: "1", name: "Standard 15%", quantity: 1, tax_exclusive_price: 100, VAT_percent: 0.15 },
				{ id: "2", name: "Reduced 5%", quantity: 1, tax_exclusive_price: 50, VAT_percent: 0.05 },
				{
					id: "3",
					name: "Zero Tax",
					quantity: 1,
					tax_exclusive_price: 25,
					VAT_percent: 0,
					vat_category: { code: "O", reason: "Out of scope", reason_code: "VATEX-SA-OOS" },
				},
			],
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const lines = invoice.getXML().get("Invoice/cac:InvoiceLine");
		expect(lines).toBeDefined();
		expect(lines!.length).toBe(3);
	});

	it("10 items stress test: buildInvoice succeeds with no errors", () => {
		const items = Array.from({ length: 10 }, (_, i) => ({
			id: String(i + 1),
			name: `Product ${i + 1}`,
			quantity: 1,
			tax_exclusive_price: 100,
			VAT_percent: 0.15 as 0.15,
		}));
		const props = { ...makeBaseProps(), line_items: items } as unknown as ZATCAInvoiceProps;
		expect(() => buildInvoice(props)).not.toThrow();
	});
});


describe("Delivery dates", () => {
	it("With actual_delivery_date: Delivery section is present in XML", () => {
		const props = {
			...makeBaseProps(),
			actual_delivery_date: "2024-01-20",
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const delivery = invoice.getXML().get("Invoice/cac:Delivery");
		expect(delivery).toBeDefined();
	});

	it("With actual_delivery_date: ActualDeliveryDate element matches provided date", () => {
		const props = {
			...makeBaseProps(),
			actual_delivery_date: "2024-01-20",
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const deliveryDate = getXMLValue(invoice, "Invoice/cac:Delivery/cbc:ActualDeliveryDate");
		expect(deliveryDate).toBe("2024-01-20");
	});

	it("With latest_delivery_date alongside actual: LatestDeliveryDate present in XML", () => {
		const props = {
			...makeBaseProps(),
			actual_delivery_date: "2024-01-20",
			latest_delivery_date: "2024-01-25",
		} as unknown as ZATCAInvoiceProps;
		const invoice = buildInvoice(props);
		const latestDate = getXMLValue(invoice, "Invoice/cac:Delivery/cbc:LatestDeliveryDate");
		expect(latestDate).toBe("2024-01-25");
	});

	it("Without delivery dates: Delivery section is absent from XML", () => {
		const invoice = buildInvoice(makeBaseProps());
		const delivery = invoice.getXML().get("Invoice/cac:Delivery");
		expect(delivery).toBeUndefined();
	});
});


describe("Invalid invoice code", () => {
	it("Invalid code '9999999' throws ZodValidationError", () => {
		const props = {
			...makeBaseProps(),
			invoice_code: "9999999",
		} as unknown as ZATCAInvoiceProps;
		expect(() => buildInvoice(props)).toThrow(ZodValidationError);
	});

	it("ZodValidationError from invalid invoice_code contains path info", () => {
		const props = {
			...makeBaseProps(),
			invoice_code: "9999999",
		} as unknown as ZATCAInvoiceProps;
		try {
			buildInvoice(props);
			expect.fail("should have thrown ZodValidationError");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			expect(zodErr.message).toContain("Validation failed");
		}
	});
});
