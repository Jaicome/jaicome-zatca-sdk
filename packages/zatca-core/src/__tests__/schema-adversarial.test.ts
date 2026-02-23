import { describe, expect, it } from "vitest";
import { buildInvoice } from "../api";
import { ZodValidationError } from "../schemas";
import { ZATCAInvoiceTypes, ZATCAPaymentMethods } from "../ZATCASimplifiedTaxInvoice";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice";

type CancelationShape = {
  canceled_serial_invoice_number: string;
  payment_method: ZATCAPaymentMethods;
  reason: string;
};

const validBase: ZATCAInvoiceProps = {
  egs_info: {
    uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    custom_id: "EGS1",
    model: "IOS",
    CRN_number: "7032256278",
    VAT_name: "Test Co",
    VAT_number: "311497191800003",
    branch_name: "Main",
    branch_industry: "Software",
  },
  invoice_counter_number: 1,
  invoice_serial_number: "TEST-001",
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

const creditBase = {
  ...validBase,
  invoice_type: ZATCAInvoiceTypes.CREDIT_NOTE,
  cancelation: {
    canceled_serial_invoice_number: "ORIG-001",
    payment_method: ZATCAPaymentMethods.CASH,
    reason: "Test reason",
  } as CancelationShape,
} as ZATCAInvoiceProps;

describe("EGSUnitInfo — required fields rejection", () => {
  it("rejects empty uuid", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, uuid: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty custom_id", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, custom_id: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty model", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, model: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty CRN_number", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, CRN_number: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty VAT_name", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, VAT_name: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty VAT_number", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, VAT_number: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty branch_name", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, branch_name: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty branch_industry", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, branch_industry: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("ZodValidationError path contains uuid when uuid is empty", () => {
    try {
      buildInvoice({
        ...validBase,
        egs_info: { ...validBase.egs_info, uuid: "" },
      } as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodValidationError);
      const zodErr = err as ZodValidationError;
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("uuid"))).toBe(true);
    }
  });
});

describe("ZATCAInvoiceLineItemSchema — adversarial", () => {
  it("rejects invalid VAT_percent 0.10", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0.10 as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects VAT_percent as string '0.15'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: "0.15" as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects zero VAT without vat_category", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0 as unknown as 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects zero VAT with invalid vat_category code 'X'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0 as unknown as 0.15,
            vat_category: { code: "X" as unknown as "O" },
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("accepts valid 0% VAT with code 'O'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0 as const,
            vat_category: { code: "O" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts valid 0% VAT with code 'Z'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0 as const,
            vat_category: { code: "Z" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts valid 0% VAT with code 'E'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0 as const,
            vat_category: { code: "E" as const },
          },
        ],
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("rejects negative quantity at computation layer (z.number() imposes no sign constraint at schema level)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: -5,
            tax_exclusive_price: 100,
            VAT_percent: 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow("quantity must be non-negative, got -5");
  });

  it("rejects negative price at computation layer (z.number() imposes no sign constraint at schema level)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: -100,
            VAT_percent: 0.15,
          },
        ],
      } as ZATCAInvoiceProps),
    ).toThrow("tax_exclusive_price must be non-negative, got -100");
  });

  it("rejects discount missing required reason field", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [
          {
            id: "1",
            name: "Item",
            quantity: 1,
            tax_exclusive_price: 100,
            VAT_percent: 0.15,
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
      invoice_type: ZATCAInvoiceTypes.DEBIT_NOTE,
      cancelation: {
        canceled_serial_invoice_number: "ORIG-001",
        payment_method: ZATCAPaymentMethods.CASH,
        reason: "Test reason",
      } as CancelationShape,
    } as ZATCAInvoiceProps;
    expect(() => buildInvoice(debitBase)).not.toThrow();
  });

  it("rejects credit note 381 WITHOUT cancelation", () => {
    const invalidCredit = {
      ...validBase,
      invoice_type: ZATCAInvoiceTypes.CREDIT_NOTE,
    };
    expect(() => buildInvoice(invalidCredit as ZATCAInvoiceProps)).toThrow(ZodValidationError);
  });

  it("rejects debit note 383 WITHOUT cancelation", () => {
    const invalidDebit = {
      ...validBase,
      invoice_type: ZATCAInvoiceTypes.DEBIT_NOTE,
    };
    expect(() => buildInvoice(invalidDebit as ZATCAInvoiceProps)).toThrow(ZodValidationError);
  });

  it("rejects invalid invoice_type '999'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoice_type: "999" as unknown as ZATCAInvoiceTypes,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoice_counter_number = 0", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoice_counter_number: 0,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoice_counter_number = -1", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoice_counter_number: -1,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invoice_counter_number = 1.5 (float)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoice_counter_number: 1.5,
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects empty line_items []", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        line_items: [],
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invalid invoice_code '9999999'", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        invoice_code: "9999999" as unknown as "0200000",
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects invalid payment_method '99'", () => {
    const withInvalidPayment = {
      ...validBase,
      payment_method: "99" as unknown as "10",
    };
    expect(() =>
      buildInvoice(withInvalidPayment as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("accepts payment_method '10' (CASH)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        payment_method: "10",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts payment_method '30' (CREDIT)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        payment_method: "30",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts payment_method '42' (BANK_TRANSFER)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        payment_method: "42",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });

  it("accepts payment_method '48' (BANK_CARD)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        payment_method: "48",
      } as ZATCAInvoiceProps),
    ).not.toThrow();
  });
});

describe("CancelationSchema — adversarial", () => {
  const baseCancelation: CancelationShape = {
    canceled_serial_invoice_number: "ORIG-001",
    payment_method: ZATCAPaymentMethods.CASH,
    reason: "Test reason",
  };

  it("rejects empty canceled_serial_invoice_number", () => {
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: { ...baseCancelation, canceled_serial_invoice_number: "" },
      } as ZATCAInvoiceProps),
    ).toThrow(ZodValidationError);
  });

  it("rejects missing payment_method in cancelation", () => {
    const { payment_method: _pm, ...withoutPayment } = baseCancelation;
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

  it("rejects invalid payment_method in cancelation", () => {
    expect(() =>
      buildInvoice({
        ...creditBase,
        cancelation: {
          ...baseCancelation,
          payment_method: "99" as unknown as ZATCAPaymentMethods,
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
      egs_info: { ...validBase.egs_info, uuid: "", VAT_number: "" },
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
      expect(paths.some((p) => p.includes("uuid") || p.includes("VAT_number"))).toBe(true);
    }
  });

  it("ZodValidationError message contains 'Validation failed'", () => {
    const invalid = { ...validBase, invoice_serial_number: "" };
    try {
      buildInvoice(invalid as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (err) {
      const zodErr = err as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
    }
  });

  it("accepts valid props with invoice_code '0100000'", () => {
    const taxInvoice = {
      ...validBase,
      invoice_code: "0100000",
    } as ZATCAInvoiceProps;
    expect(() => buildInvoice(taxInvoice)).not.toThrow();
  });

  it("accepts all 4 valid payment methods on standard invoice", () => {
    const methods: Array<"10" | "30" | "42" | "48"> = ["10", "30", "42", "48"];
    for (const method of methods) {
      expect(() =>
        buildInvoice({ ...validBase, payment_method: method } as ZATCAInvoiceProps),
      ).not.toThrow();
    }
  });
});
