import Decimal from "decimal.js";

import { buildInvoice } from "../api.js";
import { ZATCAInvoice } from "../zatca-simplified-tax-invoice.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";

const ORIGINAL_DECIMAL_ROUNDING = Decimal.rounding;

const BASE_PROPS = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    model: "IOS",
    name: "ROUND-TEST",
    vatName: "Rounding Test Co",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "ROUND-001",
  invoiceType: "INVOICE",
  issueDate: "2024-01-15",
  issueTime: "10:00:00",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
} as const;

const asText = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (value && typeof value === "object" && Object.hasOwn(value, "#text")) {
    const textValue = (value as { "#text": unknown })["#text"];
    return textValue === undefined || textValue === null
      ? undefined
      : String(textValue);
  }
  return undefined;
};

const makeProps = (
  lineItems: ZATCAInvoiceProps["lineItems"],
  overrides: Partial<ZATCAInvoiceProps> = {}
): ZATCAInvoiceProps => ({
  ...BASE_PROPS,
  lineItems,
  paymentMethod: "CASH",
  ...overrides,
});

function buildSingleItemInvoice(
  price: number,
  qty: number,
  vatPercent: 0.15 | 0.05,
  acceptWarning = false
) {
  const props = makeProps([
    {
      id: "1",
      name: "Rounding Item",
      quantity: qty,
      taxExclusivePrice: price,
      vatPercent: vatPercent,
    },
  ]);

  if (acceptWarning) {
    return new ZATCAInvoice({ acceptWarning: true, props });
  }

  return buildInvoice(props);
}

const getTaxAmount = (invoice: ZATCAInvoice): string | undefined => {
  const taxTotals = invoice.getXML().get("Invoice/cac:TaxTotal");
  const firstTaxTotal = taxTotals?.[0] as Record<string, unknown> | undefined;
  return asText(firstTaxTotal?.["cbc:TaxAmount"]);
};

const getTaxSubtotalTaxableAmount = (
  invoice: ZATCAInvoice
): string | undefined => {
  const taxTotals = invoice.getXML().get("Invoice/cac:TaxTotal");
  const firstTaxTotal = taxTotals?.[0] as Record<string, unknown> | undefined;
  const taxSubtotal = firstTaxTotal?.["cac:TaxSubtotal"];

  if (Array.isArray(taxSubtotal)) {
    return asText(
      (taxSubtotal[0] as Record<string, unknown>)?.["cbc:TaxableAmount"]
    );
  }

  return asText(
    (taxSubtotal as Record<string, unknown> | undefined)?.["cbc:TaxableAmount"]
  );
};

const getTaxSubtotalTaxAmount = (invoice: ZATCAInvoice): string | undefined => {
  const taxTotals = invoice.getXML().get("Invoice/cac:TaxTotal");
  const firstTaxTotal = taxTotals?.[0] as Record<string, unknown> | undefined;
  const taxSubtotal = firstTaxTotal?.["cac:TaxSubtotal"];

  if (Array.isArray(taxSubtotal)) {
    return asText(
      (taxSubtotal[0] as Record<string, unknown>)?.["cbc:TaxAmount"]
    );
  }

  return asText(
    (taxSubtotal as Record<string, unknown> | undefined)?.["cbc:TaxAmount"]
  );
};

const getLegalMonetaryField = (
  invoice: ZATCAInvoice,
  field:
    | "cbc:TaxInclusiveAmount"
    | "cbc:TaxExclusiveAmount"
    | "cbc:PayableAmount"
): string | undefined => {
  const total = invoice.getXML().get("Invoice/cac:LegalMonetaryTotal")?.[0] as
    | Record<string, unknown>
    | undefined;
  return asText(total?.[field]);
};

afterEach(() => {
  Decimal.set({ rounding: Decimal.ROUND_HALF_UP });
});

afterAll(() => {
  Decimal.set({ rounding: ORIGINAL_DECIMAL_ROUNDING });
});

describe("tax calculation precision — standard VAT rates", () => {
  it("single item: 100 * 1 at 15% gives TaxInclusiveAmount 115.00", () => {
    const invoice = buildSingleItemInvoice(100, 1, 0.15);
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).toBe(
      "115.00"
    );
  });

  it("single item: 100.555 at 15% keeps XML totals at 2-decimal monetary fields", () => {
    const invoice = buildSingleItemInvoice(100.555, 1, 0.15);
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).toBe(
      "115.64"
    );
    expect(getLegalMonetaryField(invoice, "cbc:TaxExclusiveAmount")).toMatch(
      /^\d+\.\d{2}$/
    );
    expect(getTaxAmount(invoice)).toMatch(/^\d+\.\d{2}$/);
  });

  it("single item: 1/3 * 3 at 15% never produces NaN", () => {
    const invoice = buildSingleItemInvoice(1 / 3, 3, 0.15);
    expect(getTaxAmount(invoice)).not.toBe("NaN");
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).not.toBe(
      "NaN"
    );
  });

  it("floating point input (0.1 + 0.2) is handled by Decimal.js chain", () => {
    const invoice = buildSingleItemInvoice(0.1 + 0.2, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.05");
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).toBe(
      "0.35"
    );
  });

  it("single item: 100 * 1 at 5% gives TaxInclusiveAmount 105.00", () => {
    const invoice = buildSingleItemInvoice(100, 1, 0.05);
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).toBe(
      "105.00"
    );
  });

  it("quantity multiplication keeps tax amount and payable amount finite", () => {
    const invoice = buildSingleItemInvoice(12.34, 3, 0.15);
    expect(getTaxAmount(invoice)).toBe("5.55");
    expect(getLegalMonetaryField(invoice, "cbc:PayableAmount")).toBe("42.57");
  });
});

describe("zATCA BR-CO-15 — Penny accumulation bug", () => {
  it("documents 8-line divergence: actual line-rounded tax vs expected document-rounded tax", () => {
    const itemCount = 8;
    const price = 130.4348;
    const vat = 0.15;
    const line_items = Array.from({ length: itemCount }, (_, index) => ({
      id: (index + 1).toString(),
      name: `Penny Item ${index + 1}`,
      quantity: 1,
      taxExclusivePrice: price,
      vatPercent: vat as 0.15,
    }));

    const invoice = buildInvoice(makeProps(line_items));
    const actualTax = Number(getTaxAmount(invoice));
    const expectedLineRoundedBySpecExample = 156.4;
    const expectedDocumentRounded = Number(
      new Decimal(price)
        .times(itemCount)
        .times(vat)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2)
    );
    const expectedCurrentImplementation = Number(
      new Decimal(price)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .times(vat)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .times(itemCount)
        .toFixed(2)
    );

    expect(expectedLineRoundedBySpecExample).toBe(156.4);
    expect(expectedDocumentRounded).toBe(156.52);
    expect(actualTax).toBe(expectedCurrentImplementation);
    expect(actualTax).toBe(156.48);
    expect(actualTax).not.toBe(expectedLineRoundedBySpecExample);
    expect(actualTax).not.toBe(expectedDocumentRounded);
  });

  it.skip("still fails: BR-CO-15 document-level rounding with acceptWarning=false", () => {
    const itemCount = 8;
    const price = 130.4348;
    const vat = 0.15;
    const line_items = Array.from({ length: itemCount }, (_, index) => ({
      id: (index + 1).toString(),
      name: `Spec Item ${index + 1}`,
      quantity: 1,
      taxExclusivePrice: price,
      vatPercent: vat as 0.15,
    }));

    const invoice = buildInvoice(makeProps(line_items));
    const actualTax = Number(getTaxAmount(invoice));
    const expectedDocumentRounded = Number(
      new Decimal(price)
        .times(itemCount)
        .times(vat)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2)
    );

    // BR-CO-15 violation: ZATCA spec requires document-level rounding but calc.ts sums line-level rounded values
    expect(actualTax).toBe(expectedDocumentRounded);
  });

  it("20-line variant amplifies divergence against document-level expectation", () => {
    const itemCount = 20;
    const price = 130.4348;
    const vat = 0.15;
    const line_items = Array.from({ length: itemCount }, (_, index) => ({
      id: (index + 1).toString(),
      name: `Amplified Item ${index + 1}`,
      quantity: 1,
      taxExclusivePrice: price,
      vatPercent: vat as 0.15,
    }));

    const invoice = buildInvoice(makeProps(line_items));
    const actualTax = Number(getTaxAmount(invoice));
    const expectedCurrentImplementation = Number(
      new Decimal(price)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .times(vat)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .times(itemCount)
        .toFixed(2)
    );
    const expectedDocumentRounded = Number(
      new Decimal(price)
        .times(itemCount)
        .times(vat)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2)
    );

    expect(actualTax).toBe(expectedCurrentImplementation);
    expect(actualTax).not.toBe(expectedDocumentRounded);
    expect(
      new Decimal(expectedDocumentRounded).minus(actualTax).toFixed(2)
    ).toBe("0.10");
  });

  it("sub-halala: 0.03 at 15% rounds tax to 0.00", () => {
    const invoice = buildSingleItemInvoice(0.03, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.00");
  });

  it("sub-halala: 0.06 at 15% rounds tax to 0.01", () => {
    const invoice = buildSingleItemInvoice(0.06, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.01");
  });

  it("mixed tiny lines still produce numeric totals", () => {
    const invoice = buildInvoice(
      makeProps([
        {
          id: "1",
          name: "Tiny A",
          quantity: 1,
          taxExclusivePrice: 0.03,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Tiny B",
          quantity: 1,
          taxExclusivePrice: 0.06,
          vatPercent: 0.15,
        },
      ])
    );

    expect(getTaxAmount(invoice)).toBe("0.01");
    expect(getLegalMonetaryField(invoice, "cbc:TaxInclusiveAmount")).toBe(
      "0.10"
    );
  });
});

describe("decimal.js global rounding state vulnerability", () => {
  it("baseline with ROUND_HALF_UP produces 0.11 tax for 0.70 * 15%", () => {
    Decimal.set({ rounding: Decimal.ROUND_HALF_UP });
    const invoice = buildSingleItemInvoice(0.7, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.11");
  });

  it("documents that changing Decimal global rounding mutates invoice output", () => {
    Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });
    const invoice = buildSingleItemInvoice(0.7, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.10");
  });

  it.skip("still fails: HALF_EVEN global state changes 0.11 tax to 0.10", () => {
    Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });
    const invoice = buildSingleItemInvoice(0.7, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.11");
  });

  it("cleanup via afterEach restores HALF_UP behavior in following test", () => {
    const invoice = buildSingleItemInvoice(0.7, 1, 0.15);
    expect(getTaxAmount(invoice)).toBe("0.11");
  });
});

describe("acceptWarning flag comparison", () => {
  it("acceptWarning=false keeps tax subtotal taxable amount at 2 decimals", () => {
    const invoice = new ZATCAInvoice({
      acceptWarning: false,
      props: makeProps([
        {
          id: "1",
          name: "Accept Warning Compare",
          quantity: 1,
          taxExclusivePrice: 100.555,
          vatPercent: 0.15,
        },
      ]),
    });

    expect(getTaxSubtotalTaxableAmount(invoice)).toBe("100.56");
    expect(getTaxSubtotalTaxAmount(invoice)).toBe("15.08");
    expect(getLegalMonetaryField(invoice, "cbc:TaxExclusiveAmount")).toBe(
      "100.56"
    );
  });

  it("acceptWarning=true preserves higher precision fields", () => {
    const invoice = new ZATCAInvoice({
      acceptWarning: true,
      props: makeProps([
        {
          id: "1",
          name: "Accept Warning Compare",
          quantity: 1,
          taxExclusivePrice: 100.555,
          vatPercent: 0.15,
        },
      ]),
    });

    expect(getTaxSubtotalTaxableAmount(invoice)).toBe("100.555");
    expect(getTaxSubtotalTaxAmount(invoice)).toBe("15.08325");
    expect(getLegalMonetaryField(invoice, "cbc:TaxExclusiveAmount")).toBe(
      "100.555"
    );
  });

  it("acceptWarning comparison shows concrete XML differences on same input", () => {
    const props = makeProps([
      {
        id: "1",
        name: "Accept Warning Compare",
        quantity: 1,
        taxExclusivePrice: 100.555,
        vatPercent: 0.15,
      },
    ]);

    const strictInvoice = new ZATCAInvoice({ acceptWarning: false, props });
    const warningInvoice = new ZATCAInvoice({ acceptWarning: true, props });

    expect(getTaxSubtotalTaxableAmount(strictInvoice)).toBe("100.56");
    expect(getTaxSubtotalTaxableAmount(warningInvoice)).toBe("100.555");
    expect(getTaxSubtotalTaxAmount(strictInvoice)).toBe("15.08");
    expect(getTaxSubtotalTaxAmount(warningInvoice)).toBe("15.08325");
  });
});

describe("sub-halala edge cases", () => {
  it("0.04 at 5% rounds tax to 0.00", () => {
    const invoice = buildSingleItemInvoice(0.04, 1, 0.05);
    expect(getTaxAmount(invoice)).toBe("0.00");
  });

  it("0.10 at 5% rounds tax to 0.01 under HALF_UP", () => {
    const invoice = buildSingleItemInvoice(0.1, 1, 0.05);
    expect(getTaxAmount(invoice)).toBe("0.01");
  });

  it("0.20 at 5% yields tax 0.01 and payable 0.21", () => {
    const invoice = buildSingleItemInvoice(0.2, 1, 0.05);
    expect(getTaxAmount(invoice)).toBe("0.01");
    expect(getLegalMonetaryField(invoice, "cbc:PayableAmount")).toBe("0.21");
  });
});
