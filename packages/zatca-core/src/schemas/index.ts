import { z } from "zod";
import type { ZodIssue } from "zod";

import { ZATCAPaymentMethodSchema } from "../templates/simplified-tax-invoice-template.js";

/**
 * Thrown when Zod schema validation fails.
 *
 * Wraps one or more Zod issues into a single `Error` with a human-readable message.
 * Each issue includes the field path and the validation message.
 *
 * @example
 * try {
 *   buildInvoice(invalidProps);
 * } catch (err) {
 *   if (err instanceof ZodValidationError) {
 *     console.error(err.issues); // Array of ZodIssue
 *   }
 * }
 */
export class ZodValidationError extends Error {
  /** The raw Zod issues that caused validation to fail. */
  constructor(public readonly issues: ZodIssue[]) {
    super(
      `Validation failed: ${issues
        .map((i) => `[${i.path.join(".")}] ${i.message}`)
        .join("; ")}`
    );
    this.name = "ZodValidationError";
  }
}

/**
 * Zod schema for {@link EGSLocation}.
 *
 * All fields are optional. ZATCA recommends providing at least `street`, `building`,
 * `city`, and `postalZone` for compliance.
 */
export const EGSLocationSchema = z.object({
  building: z.string().optional(),
  city: z.string().optional(),
  citySubdivision: z.string().optional(),
  plotIdentification: z.string().optional(),
  postalZone: z.string().optional(),
  street: z.string().optional(),
});
/**
 * Physical location of the E-Invoice Generation System (EGS) or supplier branch.
 *
 * Used in the `<cac:PostalAddress>` element of the supplier party.
 */
export type EGSLocation = z.infer<typeof EGSLocationSchema>;

/**
 * Zod schema for {@link CustomerInfo}.
 *
 * `buyerName` is the only required field. All address fields are optional but
 * recommended for standard (B2B) invoices.
 */
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
/**
 * Buyer (customer) information for the invoice.
 *
 * Required for standard (B2B/B2G) invoices. Optional for simplified (B2C) invoices.
 * When provided, the buyer details appear in the `<cac:AccountingCustomerParty>` element.
 */
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

/**
 * Zod schema for {@link EGSInfo}.
 *
 * All fields are required. `vatNumber` must be a valid Saudi VAT registration number
 * (15 digits starting with `3` and ending with `3`).
 */
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
/**
 * E-Invoice Generation System (EGS) information.
 *
 * The EGS is the software or hardware unit that generates and submits invoices.
 * Each EGS unit is registered with ZATCA and has a unique identifier.
 *
 * This data populates the `<cac:AccountingSupplierParty>` element in the invoice XML.
 */
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

/**
 * Zod schema for a single ZATCA invoice line item.
 *
 * Validates either a standard VAT line item (15% or 5%) or a zero/exempt/out-of-scope
 * line item with a required VAT category.
 */
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
  issueDate: z.date().refine((d) => d <= new Date(), {
    message: "Issue date cannot be in the future",
  }),
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
  actualDeliveryDate: z.date().optional(),
  invoiceType: z.union([z.literal("INVOICE"), z.literal("388")]),
  latestDeliveryDate: z.date().optional(),
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

/**
 * Zod schema for the top-level {@link ZATCAInvoiceProps}.
 *
 * Validates the full invoice props object, including the `invoiceCode` discriminator
 * that determines whether this is a simplified or standard invoice.
 *
 * Used internally by `buildInvoice()` before constructing the XML.
 */
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

/**
 * Zod schema for {@link SigningInput}.
 *
 * Validates the data passed to a {@link Signer} implementation.
 * `invoiceXml` must be non-empty; `invoiceHash` and `privateKeyReference` may be
 * empty strings at the preparation stage and are filled in by the signer.
 */
export const SigningInputSchema = z.object({
  invoiceHash: z.string(),
  invoiceXml: z.string().min(1),
  privateKeyReference: z.string(),
});
