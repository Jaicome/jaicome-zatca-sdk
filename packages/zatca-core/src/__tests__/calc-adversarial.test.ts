import { buildInvoice } from "../api.js";
import { ZodValidationError } from "../schemas/index.js";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "../zatca-simplified-tax-invoice.js";

type SimplifiedCashInvoiceProps = Extract<
  ZATCAInvoiceProps,
  {
    invoiceType: "INVOICE";
    invoiceCode: "SIMPLIFIED";
  }
>;

function makeProps(
  overrides?: Partial<SimplifiedCashInvoiceProps>
): SimplifiedCashInvoiceProps {
  return {
    crnNumber: "7032256278",
    egsInfo: {
      branchIndustry: "Software",
      branchName: "Main",
      id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
      model: "IOS",
      name: "EGS1-ADV",
      vatName: "Adversarial Test Co",
      vatNumber: "311497191800003",
    },
    invoiceCode: "SIMPLIFIED",
    invoiceCounterNumber: 1,
    invoiceSerialNumber: "ADV-TEST-001",
    invoiceType: "INVOICE",
    issueDate: new Date("2024-01-15T10:00:00Z"),
    lineItems: [
      {
        id: "1",
        name: "Item 1",
        quantity: 1,
        taxExclusivePrice: 100,
        vatPercent: 0.15,
      },
    ],
    paymentMethod: "CASH",
    previousInvoiceHash:
      "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
    ...overrides,
  };
}

function makeLineItem(
  overrides?: Partial<ZATCAInvoiceLineItem>
): ZATCAInvoiceLineItem {
  return {
    id: "1",
    name: "Item 1",
    quantity: 1,
    taxExclusivePrice: 100,
    vatPercent: 0.15,
    ...overrides,
  } as ZATCAInvoiceLineItem;
}

function xmlValueText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text": unknown })["#text"]);
  }
  return "";
}

function queryTexts(
  xml: { get: (path: string) => unknown[] | undefined },
  path: string
): string[] {
  const [root, ...segments] = path.split("/");
  let nodes: unknown[] = xml.get(root) ?? [];

  for (const segment of segments) {
    const nextNodes: unknown[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== "object") {
        continue;
      }
      const value = (node as Record<string, unknown>)[segment];
      if (value !== undefined) {
        nextNodes.push(value);
      }
    }
    nodes = nextNodes.flatMap((node) => (Array.isArray(node) ? node : [node]));
  }

  return nodes.map(xmlValueText);
}

function firstText(
  xml: { get: (path: string) => unknown[] | undefined },
  path: string
): string {
  return queryTexts(xml, path)[0] ?? "";
}

function allText(
  xml: { get: (path: string) => unknown[] | undefined },
  path: string
): string[] {
  return queryTexts(xml, path);
}

describe("single line item - happy path calculations", () => {
  it("15% VAT: qty=1, price=100 -> LineExtension=100.00, Tax=15.00, TaxInclusive=115.00", () => {
    const invoice = buildInvoice(makeProps());
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("100.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("15.00");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("115.00");
  });

  it("5% VAT: qty=1, price=100 -> LineExtension=100.00, Tax=5.00, TaxInclusive=105.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [makeLineItem({ vatPercent: 0.05 })],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("100.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("5.00");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("105.00");
  });

  it("zero VAT with code O: qty=1, price=100 -> LineExtension=100.00, TaxAmount=0", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            vatCategory: {
              code: "O",
              reason: "Out of scope",
              reasonCode: "VATEX-SA-OOS",
            },
            vatPercent: 0,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("100.00");
    expect(
      firstText(xml, "Invoice/cac:TaxTotal/cac:TaxSubtotal/cbc:TaxAmount")
    ).toBe("0");
  });

  it("zero VAT with code Z: qty=1, price=100 -> TaxAmount=0", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            vatCategory: {
              code: "Z",
              reason: "Export",
              reasonCode: "VATEX-SA-32",
            },
            vatPercent: 0,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:TaxTotal/cac:TaxSubtotal/cbc:TaxAmount")
    ).toBe("0");
  });

  it("zero VAT with code E: qty=1, price=100 -> TaxAmount=0", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            vatCategory: {
              code: "E",
              reason: "Exempt",
              reasonCode: "VATEX-SA-29",
            },
            vatPercent: 0,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:TaxTotal/cac:TaxSubtotal/cbc:TaxAmount")
    ).toBe("0");
  });

  it("qty=2, price=100, 15% -> LineExtension=200.00, Tax=30.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [makeLineItem({ quantity: 2 })],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("200.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("30.00");
  });
});

describe("edge case inputs", () => {
  it("zero quantity (qty=0, price=100) succeeds and LineExtension=0.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [makeLineItem({ quantity: 0 })],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("0.00");
  });

  it("zero price (qty=5, price=0) succeeds with LineExtension=0.00 and TaxAmount=0.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [makeLineItem({ quantity: 5, taxExclusivePrice: 0 })],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("0.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("0.00");
  });

  it("very large numbers (qty=999999, price=999999.99, 15%) produce stable numeric XML", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            quantity: 999_999,
            taxExclusivePrice: 999_999.99,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("999998990000.01");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe(
      "149999848500.00"
    );
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("1149998838500.01");
  });

  it("floating point trap (0.30000000000000004) is normalized via Decimal.js", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({ taxExclusivePrice: 0.300_000_000_000_000_04 }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("0.30");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("0.05");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("0.35");
  });

  it("very small price (0.001) rounds to 2 decimals", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [makeLineItem({ taxExclusivePrice: 0.001 })],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("0.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("0.00");
  });

  it("negative quantity (qty=-5, price=100, 15%) throws an error", () => {
    expect(() =>
      buildInvoice(
        makeProps({
          lineItems: [makeLineItem({ quantity: -5 })],
        })
      )
    ).toThrow("quantity must be non-negative, got -5");
  });

  it("negative price (qty=1, price=-100, 15%) throws an error", () => {
    expect(() =>
      buildInvoice(
        makeProps({
          lineItems: [makeLineItem({ taxExclusivePrice: -100 })],
        })
      )
    ).toThrow("taxExclusivePrice must be non-negative, got -100");
  });
});

describe("discounts", () => {
  it("single discount (100 - 10) -> LineExtension=90.00, Tax=13.50, TaxInclusive=103.50", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({ discounts: [{ amount: 10, reason: "Promo" }] }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("90.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("13.50");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("103.50");
  });

  it("multiple discounts (10 + 5) from 100 -> LineExtension=85.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            discounts: [
              { amount: 10, reason: "Promo A" },
              { amount: 5, reason: "Promo B" },
            ],
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("85.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("12.75");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("97.75");
  });

  it("discount equals price (100 - 100) -> LineExtension=0.00, Tax=0.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({ discounts: [{ amount: 100, reason: "Full promo" }] }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("0.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("0.00");
  });

  it("discount exceeds price (50 - 100) currently creates negative taxable amounts", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            discounts: [{ amount: 100, reason: "Over-discount bug case" }],
            taxExclusivePrice: 50,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount")
    ).toBe("-50.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("-7.50");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("-57.50");
  });
});

describe("zero-tax items - validation errors", () => {
  it("zero VAT without vat_category throws ZodValidationError", () => {
    const props = makeProps({
      lineItems: [
        {
          id: "1",
          name: "Zero VAT item",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0,
        } as unknown as ZATCAInvoiceLineItem,
      ],
    });
    expect(() => buildInvoice(props)).toThrow(ZodValidationError);
  });

  it("zero VAT with invalid vat_category.code='X' throws ZodValidationError", () => {
    const props = makeProps({
      lineItems: [
        {
          id: "1",
          name: "Invalid category",
          quantity: 1,
          taxExclusivePrice: 100,
          vatCategory: {
            code: "X",
          },
          vatPercent: 0,
        } as unknown as ZATCAInvoiceLineItem,
      ],
    });
    expect(() => buildInvoice(props)).toThrow(ZodValidationError);
  });

  it("zero VAT with valid vat_category across multiple items groups by category code", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            id: "1",
            vatCategory: {
              code: "O",
              reason: "Out of scope",
              reasonCode: "RC1",
            },
            vatPercent: 0,
          }),
          makeLineItem({
            id: "2",
            quantity: 2,
            taxExclusivePrice: 10,
            vatCategory: {
              code: "O",
              reason: "Out of scope",
              reasonCode: "RC1",
            },
            vatPercent: 0,
          }),
          makeLineItem({
            id: "3",
            taxExclusivePrice: 30,
            vatCategory: {
              code: "Z",
              reason: "Zero rate",
              reasonCode: "RC2",
            },
            vatPercent: 0,
          }),
        ],
      })
    );
    const xml = invoice.getXML();
    const categoryIds = allText(
      xml,
      "Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:ID"
    );
    const taxable = allText(
      xml,
      "Invoice/cac:TaxTotal/cac:TaxSubtotal/cbc:TaxableAmount"
    );

    expect(categoryIds.join(",")).toBe("O,Z");
    expect(taxable.join(",")).toBe("120.00,30.00");
  });
});

describe("multiple line items", () => {
  it("2 items at 15% -> TaxTotal sums to 30.00", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            id: "1",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0.15,
          }),
          makeLineItem({
            id: "2",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0.15,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("30.00");
  });

  it("3 items at 15%, 5%, 0%/O -> 3 tax subtotal categories", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({ id: "1", vatPercent: 0.15 }),
          makeLineItem({ id: "2", vatPercent: 0.05 }),
          makeLineItem({
            id: "3",
            vatCategory: { code: "O", reason: "Out", reasonCode: "OUT" },
            vatPercent: 0,
          }),
        ],
      })
    );
    const xml = invoice.getXML();
    const percents = allText(
      xml,
      "Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:Percent"
    );

    expect(percents.join(",")).toBe("15,5,0");
  });

  it("invoice with empty line_items throws ZodValidationError", () => {
    expect(() => buildInvoice(makeProps({ lineItems: [] }))).toThrow(
      ZodValidationError
    );
  });

  it("lineExtensionAmount values preserve per-line exact totals", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({ id: "1", quantity: 2, taxExclusivePrice: 10 }),
          makeLineItem({ id: "2", quantity: 3, taxExclusivePrice: 20 }),
        ],
      })
    );
    const xml = invoice.getXML();
    const extensions = allText(
      xml,
      "Invoice/cac:InvoiceLine/cbc:LineExtensionAmount"
    );

    expect(extensions.join(",")).toBe("20.00,60.00");
  });

  it("taxExclusiveAmount equals sum of line extensions for multiple lines", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            id: "1",
            quantity: 2,
            taxExclusivePrice: 10,
            vatPercent: 0.15,
          }),
          makeLineItem({
            id: "2",
            quantity: 3,
            taxExclusivePrice: 20,
            vatPercent: 0.05,
          }),
        ],
      })
    );
    const xml = invoice.getXML();

    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount")
    ).toBe("80.00");
    expect(firstText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount")).toBe("6.00");
    expect(
      firstText(xml, "Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")
    ).toBe("86.00");
  });

  it("both Invoice/cac:TaxTotal nodes carry same total tax amount", () => {
    const invoice = buildInvoice(
      makeProps({
        lineItems: [
          makeLineItem({
            id: "1",
            quantity: 1,
            taxExclusivePrice: 200,
            vatPercent: 0.15,
          }),
        ],
      })
    );
    const xml = invoice.getXML();
    const taxTotals = allText(xml, "Invoice/cac:TaxTotal/cbc:TaxAmount");

    expect(taxTotals.join(",")).toBe("30.00,30.00");
  });
});
