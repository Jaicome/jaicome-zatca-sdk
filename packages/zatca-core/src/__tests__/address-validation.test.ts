import { buildInvoice } from "../api";
import { ZodValidationError } from "../schemas/index";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice";

const validBase: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    location: {
      building: "1234",
      city: "Khobar",
      postalZone: "31952",
      street: "King Fahd st",
    },
    model: "IOS",
    name: "EGS1",
    vatName: "Test Co",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "TEST-001",
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

describe("address validation — building field", () => {
  it("rejects building with 2 digits (too short)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: "12",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("rejects building with 5 digits (too long)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: "12345",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("rejects building with alphabetic characters", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: "abcd",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("accepts building with exactly 4 digits", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: "1234",
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("accepts building with 4 zeros", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: "0000",
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("accepts building when omitted (undefined)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            building: undefined,
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });
});

describe("address validation — postalZone field", () => {
  it("rejects postalZone with 4 digits (too short)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: "1234",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("rejects postalZone with 6 digits (too long)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: "123456",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("rejects postalZone with alphabetic characters", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: "abcde",
          },
        },
      } as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("accepts postalZone with exactly 5 digits", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: "12345",
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("accepts postalZone with leading zero", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: "01234",
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });

  it("accepts postalZone when omitted (undefined)", () => {
    expect(() =>
      buildInvoice({
        ...validBase,
        egsInfo: {
          ...validBase.egsInfo,
          location: {
            ...validBase.egsInfo.location,
            postalZone: undefined,
          },
        },
      } as ZATCAInvoiceProps)
    ).not.toThrow();
  });
});
