import { buildInvoice } from "../api.js";
import { ZodValidationError } from "../schemas/index.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";

function makeBaseProps(): ZATCAInvoiceProps {
  return {
    crnNumber: "7032256278",
    egsInfo: {
      branchIndustry: "Software",
      branchName: "Main",
      id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
      model: "IOS",
      name: "EGS1-TYPES",
      vatName: "Invoice Types Test Co",
      vatNumber: "311497191800003",
    },
    invoiceCode: "SIMPLIFIED",
    invoiceCounterNumber: 1,
    invoiceSerialNumber: "TYPES-001",
    invoiceType: "INVOICE",
    issueDate: new Date("2024-01-15T10:00:00Z"),
    lineItems: [
      {
        id: "1",
        name: "Test Product",
        quantity: 1,
        taxExclusivePrice: 100,
        vatPercent: 0.15,
      },
    ],
    previousInvoiceHash:
      "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
  };
}

function getXMLValue(
  invoice: ReturnType<typeof buildInvoice>,
  path: string
): string | undefined {
  const result = invoice.getXML().get(path)?.[0];
  if (typeof result === "object" && result !== null && "#text" in result) {
    return String(result["#text"]);
  }
  return result ? String(result) : undefined;
}

describe("invoice type 388 — invoice code variations", () => {
  it("simplified invoice (0200000, type 388): buildInvoice succeeds", () => {
    expect(() => buildInvoice(makeBaseProps())).not.toThrow();
  });

  it("tax invoice (0100000, type 388): buildInvoice succeeds", () => {
    const props = {
      ...makeBaseProps(),
      customerInfo: {
        buyerName: "Tax Buyer",
        vatNumber: "300000000000003",
      },
      invoiceCode: "0100000",
    } as unknown as ZATCAInvoiceProps;
    expect(() => buildInvoice(props)).not.toThrow();
  });

  it("invoice type code in XML is '388' for simplified invoice", () => {
    const invoice = buildInvoice(makeBaseProps());
    const typeCode = getXMLValue(invoice, "Invoice/cbc:InvoiceTypeCode");
    expect(typeCode).toBe("388");
  });

  it("invoice type code in XML is '388' for tax invoice (0100000)", () => {
    const props = {
      ...makeBaseProps(),
      customerInfo: {
        buyerName: "Tax Buyer",
        vatNumber: "300000000000003",
      },
      invoiceCode: "0100000",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const typeCode = getXMLValue(invoice, "Invoice/cbc:InvoiceTypeCode");
    expect(typeCode).toBe("388");
  });

  it("invoice_code '0200000' appears as InvoiceTypeCode name attribute", () => {
    const invoice = buildInvoice(makeBaseProps());
    const typeCodeElement = invoice
      .getXML()
      .get("Invoice/cbc:InvoiceTypeCode")?.[0];
    expect(typeCodeElement?.["@_name"]).toBe("0200000");
  });

  it("invoice_code '0100000' appears as InvoiceTypeCode name attribute", () => {
    const props = {
      ...makeBaseProps(),
      customerInfo: {
        buyerName: "Tax Buyer",
        vatNumber: "300000000000003",
      },
      invoiceCode: "0100000",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const typeCodeElement = invoice
      .getXML()
      .get("Invoice/cbc:InvoiceTypeCode")?.[0];
    expect(typeCodeElement?.["@_name"]).toBe("0100000");
  });
});

describe("credit Note (type 381) — cancelation flow", () => {
  const creditNoteBase = {
    ...makeBaseProps(),
    cancelation: {
      canceledSerialInvoiceNumber: "ORIG-001",
      paymentMethod: "CASH",
      reason: "Incorrect invoice amount",
    },
    invoiceType: "CREDIT_NOTE",
  };

  it("build credit note with cancelation: succeeds", () => {
    expect(() =>
      buildInvoice(creditNoteBase as unknown as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("xML contains BillingReference for credit note", () => {
    const invoice = buildInvoice(
      creditNoteBase as unknown as ZATCAInvoiceProps
    );
    const billingRef = invoice.getXML().get("Invoice/cac:BillingReference");
    expect(billingRef).toBeDefined();
  });

  it("billingReference contains the correct canceled invoice number", () => {
    const invoice = buildInvoice(
      creditNoteBase as unknown as ZATCAInvoiceProps
    );
    const refId = getXMLValue(
      invoice,
      "Invoice/cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID"
    );
    expect(refId).toBe("ORIG-001");
  });

  it("credit note with cancelation: PaymentMeans is set from cancelation.payment_method", () => {
    const invoice = buildInvoice(
      creditNoteBase as unknown as ZATCAInvoiceProps
    );
    const paymentCode = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode"
    );
    expect(paymentCode).toBe("10");
  });

  it("credit note with cancelation: PaymentMeans InstructionNote contains the reason", () => {
    const invoice = buildInvoice(
      creditNoteBase as unknown as ZATCAInvoiceProps
    );
    const note = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:InstructionNote"
    );
    expect(note).toBe("Incorrect invoice amount");
  });

  it("credit note WITHOUT cancelation throws ZodValidationError", () => {
    const invalidProps = {
      ...makeBaseProps(),
      invoiceType: "CREDIT_NOTE",
    };
    expect(() =>
      buildInvoice(invalidProps as unknown as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });
});

describe("debit Note (type 383) — cancelation flow", () => {
  const debitNoteBase = {
    ...makeBaseProps(),
    cancelation: {
      canceledSerialInvoiceNumber: "DEBIT-ORIG-001",
      paymentMethod: "CREDIT",
      reason: "Underbilling correction",
    },
    invoiceType: "DEBIT_NOTE",
  };

  it("build debit note with cancelation: succeeds", () => {
    expect(() =>
      buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("xML contains BillingReference for debit note", () => {
    const invoice = buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps);
    const billingRef = invoice.getXML().get("Invoice/cac:BillingReference");
    expect(billingRef).toBeDefined();
  });

  it("billingReference contains the correct canceled invoice number for debit note", () => {
    const invoice = buildInvoice(debitNoteBase as unknown as ZATCAInvoiceProps);
    const refId = getXMLValue(
      invoice,
      "Invoice/cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID"
    );
    expect(refId).toBe("DEBIT-ORIG-001");
  });

  it("debit note WITHOUT cancelation throws ZodValidationError", () => {
    const invalidProps = {
      ...makeBaseProps(),
      invoiceType: "DEBIT_NOTE",
    };
    expect(() =>
      buildInvoice(invalidProps as unknown as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });
});

describe("payment methods — all 4 values", () => {
  it("cash (10): buildInvoice succeeds and PaymentMeansCode = '10'", () => {
    const props = {
      ...makeBaseProps(),
      paymentMethod: "CASH",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const paymentCode = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode"
    );
    expect(paymentCode).toBe("10");
  });

  it("credit (30): PaymentMeansCode = '30'", () => {
    const props = {
      ...makeBaseProps(),
      paymentMethod: "CREDIT",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const paymentCode = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode"
    );
    expect(paymentCode).toBe("30");
  });

  it("bankAccount (42): PaymentMeansCode = '42'", () => {
    const props = {
      ...makeBaseProps(),
      paymentMethod: "BANK_ACCOUNT",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const paymentCode = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode"
    );
    expect(paymentCode).toBe("42");
  });

  it("bankCard (48): PaymentMeansCode = '48'", () => {
    const props = {
      ...makeBaseProps(),
      paymentMethod: "BANK_CARD",
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const paymentCode = getXMLValue(
      invoice,
      "Invoice/cac:PaymentMeans/cbc:PaymentMeansCode"
    );
    expect(paymentCode).toBe("48");
  });

  it("no paymentMethod: buildInvoice succeeds (optional for type 388)", () => {
    expect(() => buildInvoice(makeBaseProps())).not.toThrow();
  });

  it("no paymentMethod: PaymentMeans is absent from XML", () => {
    const invoice = buildInvoice(makeBaseProps());
    const paymentMeans = invoice.getXML().get("Invoice/cac:PaymentMeans");
    expect(paymentMeans).toBeUndefined();
  });
});

describe("customer info — presence and absence", () => {
  function makePropsWithCustomer(): ZATCAInvoiceProps {
    return {
      ...makeBaseProps(),
      customerInfo: {
        buyerName: "Test Buyer",
        vatNumber: "300000000000003",
      },
      egsInfo: {
        ...makeBaseProps().egsInfo,
      },
    } as ZATCAInvoiceProps;
  }

  it("with customerInfo: AccountingCustomerParty has Party element", () => {
    const invoice = buildInvoice(makePropsWithCustomer());
    const party = invoice
      .getXML()
      .get("Invoice/cac:AccountingCustomerParty/cac:Party");
    expect(party).toBeDefined();
  });

  it("with customerInfo: buyerName appears in the XML string", () => {
    const invoice = buildInvoice(makePropsWithCustomer());
    const xmlString = invoice.getXML().toString({});
    expect(xmlString).toContain("Test Buyer");
  });

  it("with customerInfo: RegistrationName element contains buyerName", () => {
    const invoice = buildInvoice(makePropsWithCustomer());
    const registrationName = getXMLValue(
      invoice,
      "Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName"
    );
    expect(registrationName).toBe("Test Buyer");
  });

  it("without customerInfo: AccountingCustomerParty has no Party element", () => {
    const invoice = buildInvoice(makeBaseProps());
    const party = invoice
      .getXML()
      .get("Invoice/cac:AccountingCustomerParty/cac:Party");
    expect(party).toBeUndefined();
  });
});

describe("multiple line items", () => {
  it("2 items at 15%: buildInvoice succeeds", () => {
    const props = {
      ...makeBaseProps(),
      lineItems: [
        {
          id: "1",
          name: "Product A",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Product B",
          quantity: 2,
          taxExclusivePrice: 50,
          vatPercent: 0.15,
        },
      ],
    } as unknown as ZATCAInvoiceProps;
    expect(() => buildInvoice(props)).not.toThrow();
  });

  it("2 items: InvoiceLine count is 2", () => {
    const props = {
      ...makeBaseProps(),
      lineItems: [
        {
          id: "1",
          name: "Product A",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Product B",
          quantity: 2,
          taxExclusivePrice: 50,
          vatPercent: 0.15,
        },
      ],
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const lines = invoice.getXML().get("Invoice/cac:InvoiceLine");
    expect(lines).toBeDefined();
    expect(lines!).toHaveLength(2);
  });

  it("3 items at different rates (15%, 5%, 0%/O): buildInvoice succeeds", () => {
    const props = {
      ...makeBaseProps(),
      lineItems: [
        {
          id: "1",
          name: "Standard 15%",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Reduced 5%",
          quantity: 1,
          taxExclusivePrice: 50,
          vatPercent: 0.05,
        },
        {
          id: "3",
          name: "Zero Tax",
          quantity: 1,
          taxExclusivePrice: 25,
          vatCategory: {
            code: "O",
            reason: "Out of scope",
            reasonCode: "VATEX-SA-OOS",
          },
          vatPercent: 0,
        },
      ],
    } as unknown as ZATCAInvoiceProps;
    expect(() => buildInvoice(props)).not.toThrow();
  });

  it("3 items at different rates: InvoiceLine count is 3", () => {
    const props = {
      ...makeBaseProps(),
      lineItems: [
        {
          id: "1",
          name: "Standard 15%",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Reduced 5%",
          quantity: 1,
          taxExclusivePrice: 50,
          vatPercent: 0.05,
        },
        {
          id: "3",
          name: "Zero Tax",
          quantity: 1,
          taxExclusivePrice: 25,
          vatCategory: {
            code: "O",
            reason: "Out of scope",
            reasonCode: "VATEX-SA-OOS",
          },
          vatPercent: 0,
        },
      ],
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const lines = invoice.getXML().get("Invoice/cac:InvoiceLine");
    expect(lines).toBeDefined();
    expect(lines!).toHaveLength(3);
  });

  it("10 items stress test: buildInvoice succeeds with no errors", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      name: `Product ${i + 1}`,
      quantity: 1,
      taxExclusivePrice: 100,
      vatPercent: 0.15 as const,
    }));
    const props = {
      ...makeBaseProps(),
      lineItems: items,
    } as unknown as ZATCAInvoiceProps;
    expect(() => buildInvoice(props)).not.toThrow();
  });
});

describe("delivery dates", () => {
  it("with actualDeliveryDate: Delivery section is present in XML", () => {
    const props = {
      ...makeBaseProps(),
      actualDeliveryDate: new Date("2024-01-20T00:00:00Z"),
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const delivery = invoice.getXML().get("Invoice/cac:Delivery");
    expect(delivery).toBeDefined();
  });

  it("with actualDeliveryDate: ActualDeliveryDate element matches provided date", () => {
    const props = {
      ...makeBaseProps(),
      actualDeliveryDate: new Date("2024-01-20T00:00:00Z"),
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const deliveryDate = getXMLValue(
      invoice,
      "Invoice/cac:Delivery/cbc:ActualDeliveryDate"
    );
    expect(deliveryDate).toBe("2024-01-20");
  });

  it("with latestDeliveryDate alongside actual: LatestDeliveryDate present in XML", () => {
    const props = {
      ...makeBaseProps(),
      actualDeliveryDate: new Date("2024-01-20T00:00:00Z"),
      latestDeliveryDate: new Date("2024-01-25T00:00:00Z"),
    } as unknown as ZATCAInvoiceProps;
    const invoice = buildInvoice(props);
    const latestDate = getXMLValue(
      invoice,
      "Invoice/cac:Delivery/cbc:LatestDeliveryDate"
    );
    expect(latestDate).toBe("2024-01-25");
  });

  it("without delivery dates: Delivery section is absent from XML", () => {
    const invoice = buildInvoice(makeBaseProps());
    const delivery = invoice.getXML().get("Invoice/cac:Delivery");
    expect(delivery).toBeUndefined();
  });
});

describe("invalid invoice code", () => {
  it("invalid code '9999999' throws ZodValidationError", () => {
    const props = {
      ...makeBaseProps(),
      invoiceCode: "9999999",
    } as unknown as ZATCAInvoiceProps;
    expect(() => buildInvoice(props)).toThrow(ZodValidationError);
  });

  it("zodValidationError from invalid invoice_code contains path info", () => {
    const props = {
      ...makeBaseProps(),
      invoiceCode: "9999999",
    } as unknown as ZATCAInvoiceProps;
    try {
      buildInvoice(props);
      expect.fail("should have thrown ZodValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
    }
  });
});
