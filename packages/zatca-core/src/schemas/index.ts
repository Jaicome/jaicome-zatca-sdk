import { z } from "zod";
import type { ZodIssue } from "zod";

import { ZATCAPaymentMethodSchema } from "../templates/simplified-tax-invoice-template.js";

export class ZodValidationError extends Error {
  constructor(public readonly issues: ZodIssue[]) {
    super(
      `Validation failed: ${issues
        .map((i) => `[${i.path.join(".")}] ${i.message}`)
        .join("; ")}`
    );
    this.name = "ZodValidationError";
  }
}

export const EGSLocationSchema = z.object({
  building: z.string().optional(),
  city: z.string().optional(),
  citySubdivision: z.string().optional(),
  plotIdentification: z.string().optional(),
  postalZone: z.string().optional(),
  street: z.string().optional(),
});
export type EGSLocation = z.infer<typeof EGSLocationSchema>;

export const CustomerInfoSchema = z.object({
  additionalStreet: z.string().optional(),
  building: z.string().optional(),
  buyerName: z.string().min(1),
  city: z.string().optional(),
  citySubdivision: z.string().optional(),
  countrySubEntity: z.string().optional(),
  customerCrnNumber: z.string().optional(),
  plotIdentification: z.string().optional(),
  postalZone: z.string().optional(),
  street: z.string().optional(),
  vatNumber: z.string().optional(),
});
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const EGSInfoSchema = z.object({
  branchIndustry: z.string().min(1),
  branchName: z.string().min(1),
  id: z.string().min(1),
  location: EGSLocationSchema.optional(),
  model: z.string().min(1),
  name: z.string().min(1),
  vatName: z.string().min(1),
  vatNumber: z.string().min(1),
});
export type EGSInfo = z.infer<typeof EGSInfoSchema>;

const LineItemDiscountSchema = z.object({
  amount: z.number(),
  reason: z.string(),
});

const LineItemTaxSchema = z.object({
  percentAmount: z.number(),
});

const BaseLineItemSchema = z.object({
  discounts: z.array(LineItemDiscountSchema).optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  otherTaxes: z.array(LineItemTaxSchema).optional(),
  quantity: z.number(),
  taxExclusivePrice: z.number(),
});

const StandardLineItemSchema = BaseLineItemSchema.extend({
  vatPercent: z.union([z.literal(0.15), z.literal(0.05)]),
});

const ZeroTaxLineItemSchema = BaseLineItemSchema.extend({
  vatCategory: z.object({
    code: z.enum(["O", "Z", "E"]),
    reason: z.string().optional(),
    reasonCode: z.string().optional(),
  }),
  vatPercent: z.literal(0),
});

export const ZATCAInvoiceLineItemSchema = z.union([
  StandardLineItemSchema,
  ZeroTaxLineItemSchema,
]);

const ZatcaInvoiceBaseSchema = z.object({
  crnNumber: z.string().min(1),
  customerInfo: CustomerInfoSchema.optional(),
  egsInfo: EGSInfoSchema,
  invoiceCounterNumber: z.number().int().positive(),
  invoiceSerialNumber: z.string().min(1),
  issueDate: z.string().min(1),
  issueTime: z.string().min(1),
  lineItems: z.array(ZATCAInvoiceLineItemSchema).min(1),
  previousInvoiceHash: z.string().min(1),
});

const CancelationSchema = z.object({
  canceledSerialInvoiceNumber: z.string().min(1),
  paymentMethod: z.union([
    ZATCAPaymentMethodSchema,
    z.enum(["10", "30", "42", "48"]),
  ]),
  reason: z.string().min(1),
});

const CashInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  actualDeliveryDate: z.string().optional(),
  invoiceType: z.union([z.literal("INVOICE"), z.literal("388")]),
  latestDeliveryDate: z.string().optional(),
  paymentMethod: z
    .union([ZATCAPaymentMethodSchema, z.enum(["10", "30", "42", "48"])])
    .optional(),
});

const CreditDebitInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  cancelation: CancelationSchema,
  invoiceType: z.union([
    z.literal("DEBIT_NOTE"),
    z.literal("CREDIT_NOTE"),
    z.literal("381"),
    z.literal("383"),
  ]),
});

const CashOrCreditDebitSchema = z.union([
  CashInvoiceSchema,
  CreditDebitInvoiceSchema,
]);

export const ZATCAInvoicePropsSchema = z.union([
  CashOrCreditDebitSchema.and(
    z.object({
      invoiceCode: z.union([z.literal("STANDARD"), z.literal("0100000")]),
    })
  ),
  CashOrCreditDebitSchema.and(
    z.object({
      invoiceCode: z.union([z.literal("SIMPLIFIED"), z.literal("0200000")]),
    })
  ),
]);

export const SigningInputSchema = z.object({
  invoiceHash: z.string(),
  invoiceXml: z.string().min(1),
  privateKeyReference: z.string(),
});
