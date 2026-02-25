import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { ZATCAInvoicePropsSchema } from "../schemas/index.js";

const validBaseProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    model: "IOS",
    name: "EGS1",
    vatName: "Jaicome Information Technology",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "EGS1-886431145-101",
  invoiceType: "INVOICE",
  lineItems: [
    {
      id: "1",
      name: "TEST ITEM",
      quantity: 2,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  paymentMethod: "CASH",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("ZATCAInvoicePropsSchema date contracts", () => {
  it("accepts Date objects for issueDate and delivery dates", () => {
    const parsed = ZATCAInvoicePropsSchema.parse({
      ...validBaseProps,
      issueDate: new Date("2024-01-15T10:00:00Z"),
      actualDeliveryDate: new Date("2024-01-15T11:00:00Z"),
      latestDeliveryDate: new Date("2024-01-16T11:00:00Z"),
    });

    expect(parsed.issueDate).toBeInstanceOf(Date);
    if ("actualDeliveryDate" in parsed && parsed.actualDeliveryDate) {
      expect(parsed.actualDeliveryDate).toBeInstanceOf(Date);
    }
    if ("latestDeliveryDate" in parsed && parsed.latestDeliveryDate) {
      expect(parsed.latestDeliveryDate).toBeInstanceOf(Date);
    }
  });

  it("rejects string issueDate", () => {
    expect(() =>
      ZATCAInvoicePropsSchema.parse({
        ...validBaseProps,
        issueDate: "2024-01-15",
      })
    ).toThrow(ZodError);
  });

  it("rejects future issueDate", () => {
    expect(() =>
      ZATCAInvoicePropsSchema.parse({
        ...validBaseProps,
        issueDate: new Date("2099-01-01T00:00:00Z"),
      })
    ).toThrow("Issue date cannot be in the future");
  });
});
