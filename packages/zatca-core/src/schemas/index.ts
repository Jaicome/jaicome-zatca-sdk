import { z, type ZodIssue } from "zod";
import {
  ZATCAInvoiceTypeSchema,
  ZATCAPaymentMethodSchema,
  InvoiceCodeSchema,
} from "../templates/simplified_tax_invoice_template.js";

export class ZodValidationError extends Error {
  constructor(public readonly issues: ZodIssue[]) {
    super(
      `Validation failed: ${issues
        .map((i) => `[${i.path.join(".")}] ${i.message}`)
        .join("; ")}`,
    );
    this.name = "ZodValidationError";
  }
}

export const EGSLocationSchema = z.object({
  city: z.string().optional(),
  citySubdivision: z.string().optional(),
  street: z.string().optional(),
  plotIdentification: z.string().optional(),
  building: z.string().optional(),
  postalZone: z.string().optional(),
});
export type EGSLocation = z.infer<typeof EGSLocationSchema>;

export const CustomerInfoSchema = z.object({
  city: z.string().optional(),
  citySubdivision: z.string().optional(),
  street: z.string().optional(),
  additionalStreet: z.string().optional(),
  plotIdentification: z.string().optional(),
  building: z.string().optional(),
  postalZone: z.string().optional(),
  countrySubEntity: z.string().optional(),
  buyerName: z.string().min(1),
  customerCrnNumber: z.string().optional(),
  vatNumber: z.string().optional(),
});
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const EGSInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.string().min(1),
  vatName: z.string().min(1),
  vatNumber: z.string().min(1),
  branchName: z.string().min(1),
  branchIndustry: z.string().min(1),
  location: EGSLocationSchema.optional(),
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
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number(),
  taxExclusivePrice: z.number(),
  otherTaxes: z.array(LineItemTaxSchema).optional(),
  discounts: z.array(LineItemDiscountSchema).optional(),
});

const StandardLineItemSchema = BaseLineItemSchema.extend({
  vatPercent: z.union([z.literal(0.15), z.literal(0.05)]),
});

const ZeroTaxLineItemSchema = BaseLineItemSchema.extend({
  vatPercent: z.literal(0),
  vatCategory: z.object({
    code: z.enum(["O", "Z", "E"]),
    reasonCode: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const ZATCAInvoiceLineItemSchema = z.union([
  StandardLineItemSchema,
  ZeroTaxLineItemSchema,
]);

const ZatcaInvoiceBaseSchema = z.object({
  egsInfo: EGSInfoSchema,
  crnNumber: z.string().min(1),
  customerInfo: CustomerInfoSchema.optional(),
  invoiceCounterNumber: z.number().int().positive(),
  invoiceSerialNumber: z.string().min(1),
  issueDate: z.string().min(1),
  issueTime: z.string().min(1),
  previousInvoiceHash: z.string().min(1),
  lineItems: z.array(ZATCAInvoiceLineItemSchema).min(1),
});

const CancelationSchema = z.object({
  canceledSerialInvoiceNumber: z.string().min(1),
  paymentMethod: z.union([ZATCAPaymentMethodSchema, z.enum(["10", "30", "42", "48"])]),
  reason: z.string().min(1),
});

const CashInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  invoiceType: z.union([z.literal("INVOICE"), z.literal("388")]),
  actualDeliveryDate: z.string().optional(),
  latestDeliveryDate: z.string().optional(),
  paymentMethod: z.union([ZATCAPaymentMethodSchema, z.enum(["10", "30", "42", "48"])]).optional(),
});

const CreditDebitInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  invoiceType: z.union([z.literal("DEBIT_NOTE"), z.literal("CREDIT_NOTE"), z.literal("381"), z.literal("383")]),
  cancelation: CancelationSchema,
});

const CashOrCreditDebitSchema = z.union([
  CashInvoiceSchema,
  CreditDebitInvoiceSchema,
]);

export const ZATCAInvoicePropsSchema = z.union([
  CashOrCreditDebitSchema.and(z.object({ invoiceCode: z.union([z.literal("STANDARD"), z.literal("0100000")]) })),
  CashOrCreditDebitSchema.and(z.object({ invoiceCode: z.union([z.literal("SIMPLIFIED"), z.literal("0200000")]) })),
]);

export const SigningInputSchema = z.object({
  invoiceXml: z.string().min(1),
  invoiceHash: z.string(),
  privateKeyReference: z.string(),
});
