import { describe, expect, it } from "vitest";
import { buildInvoice } from "../api.js";
import { ZodValidationError } from "../schemas/index.js";
import { ZATCAInvoiceTypes, ZATCAPaymentMethods } from "../ZATCASimplifiedTaxInvoice.js";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice.js";

type CancelationShape = {
  canceledSerialInvoiceNumber: string;
  paymentMethod: ZATCAPaymentMethods;
  reason: string;
};

const validBase: ZATCAInvoiceProps = {
  egsInfo: {
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    name: "EGS1",
    model: "IOS",
    vatName: "Test Co",
    vatNumber: "311497191800003",
    branchName: "Main",
    branchIndustry: "Software",
  },
  crnNumber: "7032256278",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "TEST-001",
  issueDate: "2024-01-15",
  issueTime: "10:00:00",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
  lineItems: [
    {
      id: "1",
      name: "Test Product",
      quantity: 1,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  invoiceType: ZATCAInvoiceTypes.INVOICE,
  invoiceCode: "0200000",
};

const creditBase = {
  ...validBase,
  invoiceType: ZATCAInvoiceTypes.CREDIT_NOTE,
  cancelation: {
    canceledSerialInvoiceNumber: "ORIG-001",
    paymentMethod: ZATCAPaymentMethods.CASH,
    reason: "Test reason",
  } as CancelationShape,
} as ZATCAInvoiceProps;

describe("EGSInfo — required fields rejection", () => {
  it("rejects empty id", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, id: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty name", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, name: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty model", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, model: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty crnNumber", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        crnNumber: "",
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty vatName", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, vatName: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty vatNumber", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, vatNumber: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty branchName", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, branchName: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty branchIndustry", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, branchIndustry: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("ZodValidationError path contains id when id is empty", () => {
    try {
      buildInvoice({
        ...validBase,
        egsInfo: { ...validBase.egsInfo, id: "" },
      } as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodValidationError);
      const zodErr = err as ZodValidationError;
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("id"))).toBe(true);
    }
  });
});

describe("ZATCAInvoiceLineItemSchema — adversarial", () => {
  it("rejects invalid vatPercent 0.10", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0.10 as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects vatPercent as string '0.15'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: "0.15" as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects zero VAT without vatCategory", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0 as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects zero VAT with invalid vatCategory code 'X'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0 as unknown as 0.15,
            vatCategory: { code: "X" as unknown as "O" },
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("accepts valid 0% VAT with code 'O'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0 as const,
            vatCategory: { code: "O" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts valid 0% VAT with code 'Z'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0 as const,
            vatCategory: { code: "Z" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts valid 0% VAT with code 'E'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0 as const,
            vatCategory: { code: "E" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("rejects negative quantity at computation layer (z.number() imposes no sign constraint at schema level)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: -5,
            taxExclusivePrice: 100,
            vatPercent: 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow("quantity must be non-negative, got -5");
  });

  it("rejects negative price at computation layer (z.number() imposes no sign constraint at schema level)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: -100,
            vatPercent: 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow("taxExclusivePrice must be non-negative, got -100");
  });

  it("rejects discount missing required reason field", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0.15,
            discounts: [{ amount: 10 } as unknown as { amount: number; reason: string }],
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });
});

describe("ZATCAInvoicePropsSchema — invoice type discriminated union", () => {
  it("accepts valid invoice type 388", () => {
    expect(() => buildInvoice(validBase)).not.toThrow();
  });

  it("accepts valid credit note 381 WITH cancelation", () => {
    expect(() => buildInvoice(creditBase)).not.toThrow();
  });

  it("accepts valid debit note 383 WITH cancelation", () => {
    const debitBase = {
      ...validBase,
      invoiceType: ZATCAInvoiceTypes.DEBIT_NOTE,
      cancelation: {
        canceledSerialInvoiceNumber: "ORIG-001",
        paymentMethod: ZATCAPaymentMethods.CASH,
        reason: "Test reason",
      } as CancelationShape,
    } as ZATCAInvoiceProps;
    expect(() => buildInvoice(debitBase)).not.toThrow();
  });

  it("rejects credit note 381 WITHOUT cancelation", () => {
    const invalidCredit = {
      ...validBase,
      invoiceType: ZATCAInvoiceTypes.CREDIT_NOTE,
    };
    expect(() => buildInvoice(invalidCredit as ZATCAInvoiceProps)).toThrow(ZodValidationError);
  });

  it("rejects debit note 383 WITHOUT cancelation", () => {
    const invalidDebit = {
      ...validBase,
      invoiceType: ZATCAInvoiceTypes.DEBIT_NOTE,
    };
    expect(() => buildInvoice(invalidDebit as ZATCAInvoiceProps)).toThrow(ZodValidationError);
  });

  it("rejects invalid invoiceType '999'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoiceType: "999" as unknown as ZATCAInvoiceTypes,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoiceCounterNumber = 0", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoiceCounterNumber: 0,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoiceCounterNumber = -1", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoiceCounterNumber: -1,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoiceCounterNumber = 1.5 (float)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoiceCounterNumber: 1.5,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty lineItems []", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        lineItems: [],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invalid invoiceCode '9999999'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoiceCode: "9999999" as unknown as "0200000",
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invalid paymentMethod '99'", () => {
    const withInvalidPayment = {
      ...validBase,
      paymentMethod: "99" as unknown as "10",
    };
    expect(() =>
      buildInvoice(withInvalidPayment as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("accepts paymentMethod '10' (CASH)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        paymentMethod: "10",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts paymentMethod '30' (CREDIT)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        paymentMethod: "30",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts paymentMethod '42' (BANK_TRANSFER)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        paymentMethod: "42",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts paymentMethod '48' (BANK_CARD)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        paymentMethod: "48",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });
});

describe("CancelationSchema — adversarial", () => {
  const baseCancelation: CancelationShape = {
    canceledSerialInvoiceNumber: "ORIG-001",
    paymentMethod: ZATCAPaymentMethods.CASH,
    reason: "Test reason",
  };

  it("rejects empty canceledSerialInvoiceNumber", () => {
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: { ...baseCancelation, canceledSerialInvoiceNumber: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects missing paymentMethod in cancelation", () => {
    const { paymentMethod: _pm, ...withoutPayment } = baseCancelation;
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: withoutPayment as unknown as CancelationShape,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty reason in cancelation", () => {
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: { ...baseCancelation, reason: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invalid paymentMethod in cancelation", () => {
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: {
          ...baseCancelation,
          paymentMethod: "99" as unknown as ZATCAPaymentMethods,
        },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });
});

describe("buildInvoice validation integration", () => {
  it("throws ZodValidationError when called with undefined", () => {
    expect(() =>
      buildInvoice(undefined as unknown as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("returns object with getXML method for valid props", () => {
    const invoice = buildInvoice(validBase);
    expect(invoice).toBeDefined();
    expect(typeof invoice.getXML).toBe("function");
  });

  it("ZodValidationError has correct name property", () => {
    try {
      buildInvoice(undefined as unknown as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodValidationError);
      const zodErr = err as ZodValidationError;
      expect(zodErr.name).toBe("ZodValidationError");
    }
  });

  it("ZodValidationError has issues array with field paths", () => {
    const invalid = {
      ...validBase,
      egsInfo: { ...validBase.egsInfo, id: "", vatNumber: "" },
    };
    try {
      buildInvoice(invalid as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodValidationError);
      const zodErr = err as ZodValidationError;
      expect(Array.isArray(zodErr.issues)).toBe(true);
      expect(zodErr.issues.length).toBeGreaterThan(0);
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("id") || p.includes("vatNumber"))).toBe(true);
    }
  });

  it("ZodValidationError message contains 'Validation failed'", () => {
    const invalid = { ...validBase, invoiceSerialNumber: "" };
    try {
      buildInvoice(invalid as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      const zodErr = err as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
    }
  });

  it("accepts valid props with invoiceCode '0100000'", () => {
    const taxInvoice = {
      ...validBase,
      invoiceCode: "0100000",
    } as ZATCAInvoiceProps;
    expect(() => buildInvoice(taxInvoice)).not.toThrow();
  });

  it("accepts all 4 valid payment methods on standard invoice", () => {
    const methods: Array<"10" | "30" | "42" | "48"> = ["10", "30", "42", "48"];
    for (const method of methods) {
      expect(() =>
        buildInvoice({ ...validBase, paymentMethod: method } as ZATCAInvoiceProps),
      ).not.toThrow();
    }
  });
});
