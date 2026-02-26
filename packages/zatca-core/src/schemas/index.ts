import { z } from "zod";
import type { ZodIssue } from "zod";

import { ZATCAPaymentMethodSchema } from "../templates/simplified-tax-invoice-template";

/**
 * Recursively collects all leaf error messages from Zod issues,
 * including those nested in invalid_union errors.
 */
const collectLeafMessages = (issues: ZodIssue[]): string[] => {
  const messages: string[] = [];
  for (const issue of issues) {
    if (issue.code === "invalid_union" && issue.unionErrors?.length) {
      // Check if this union error has a custom message (from errorMap)
      // If it does, collect it; otherwise recurse into the union errors
      if (issue.message !== "Invalid input") {
        messages.push(issue.message);
      } else {
        // Recurse into union errors to find specific messages
        for (const ue of issue.unionErrors) {
          messages.push(...collectLeafMessages(ue.issues));
        }
      }
    } else {
      messages.push(issue.message);
    }
  }
  // Deduplicate
  return [...new Set(messages)];
};

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
  vatNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^3\d{13}3$/.test(val), {
      message:
        "VAT number must be 15 digits, starting and ending with 3 (e.g., 300000000000003)",
    }),
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
  vatNumber: z
    .string()
    .min(1)
    .refine((val) => /^3\d{13}3$/.test(val), {
      message:
        "VAT number must be 15 digits, starting and ending with 3 (e.g., 300000000000003)",
    }),
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
  /** Unique identifier for this line item within the invoice (e.g. `'1'`, `'2'`). */
  id: z.string().min(1),
  /** Human-readable name or description of the product or service. */
  name: z.string().min(1),
  /** Additional taxes beyond VAT (e.g. excise tax). Applied per-line-item. Value in SAR. */
  otherTaxes: z.array(LineItemTaxSchema).optional(),
  /** Quantity of units. Can be fractional (e.g. `1.5` for 1.5 kg). Must be positive. */
  quantity: z.number(),
  /** Unit price in SAR, excluding VAT. */
  taxExclusivePrice: z.number(),
});

const StandardLineItemSchema = BaseLineItemSchema.extend({
  /**
   * VAT rate as a decimal fraction.
   * - `0.15` — Standard rate (15%, applies to most goods and services)
   * - `0.05` — Reduced rate (5%, applies to specific categories)
   */
  vatPercent: z.union([z.literal(0.15), z.literal(0.05)], {
    errorMap: () => ({
      message: "Saudi Arabia standard VAT rate is 15% (0.15)",
    }),
  }),
});

const ZeroTaxLineItemSchema = BaseLineItemSchema.extend({
  /**
   * VAT category for zero-rated, exempt, or out-of-scope items (BT-118).
   * - `'O'` — Out of scope (not subject to VAT)
   * - `'Z'` — Zero-rated (0% VAT, e.g. basic food items)
   * - `'E'` — Exempt (VAT-exempt supply)
   */
  vatCategory: z.object({
    code: z.enum(["O", "Z", "E"]),
    reason: z.string().optional(),
    reasonCode: z.string().optional(),
  }),
  /**
   * VAT rate as a decimal fraction.
   * - `0` — Zero-rated, exempt, or out-of-scope (requires `vatCategory`)
   */
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
  lineItems: z
    .array(z.unknown())
    .min(1)
    .superRefine((items, ctx) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = ZATCAInvoiceLineItemSchema.safeParse(item);
        if (!result.success) {
          // Collect all leaf messages from the error tree (including nested union errors)
          const leafMessages = collectLeafMessages(result.error.issues);
          for (const msg of leafMessages) {
            // Emit indexed message (for line-item-errors context)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Line item [${i}]: ${msg}`,
              path: [i],
            });
            // Also emit raw message (for contextual-errors lookup)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: msg,
              path: [i],
            });
          }
        }
      }
    }),
  previousInvoiceHash: z.string().min(1),
});

const CancelationSchema = z.object({
  canceledSerialInvoiceNumber: z.string().min(1),
  /**
   * Payment means code (BT-81).
   * - `'CASH'` or `'10'` — Cash payment
   * - `'CREDIT'` or `'30'` — Credit / deferred payment
   * - `'BANK_ACCOUNT'` or `'42'` — Bank transfer
   * - `'BANK_CARD'` or `'48'` — Bank card / debit card
   */
  paymentMethod: z.union(
    [ZATCAPaymentMethodSchema, z.enum(["10", "30", "42", "48"])],
    {
      errorMap: () => ({
        message:
          "Must be 10 (cash), 30 (credit), 42 (bank transfer), 48 (card), or 1 (not defined)",
      }),
    }
  ),
  reason: z.string().min(1),
});

const CashInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  actualDeliveryDate: z.date().optional(),
  /**
   * Invoice type code (BT-3).
   * - `'INVOICE'` or `'388'` — Standard commercial invoice
   */
  invoiceType: z.union([z.literal("INVOICE"), z.literal("388")], {
    errorMap: () => ({
      message:
        "Must be 388 (invoice), 381 (credit note), 383 (debit note), or 386 (prepayment)",
    }),
  }),
  latestDeliveryDate: z.date().optional(),
  /**
   * Payment means code (BT-81).
   * - `'CASH'` or `'10'` — Cash payment
   * - `'CREDIT'` or `'30'` — Credit / deferred payment
   * - `'BANK_ACCOUNT'` or `'42'` — Bank transfer
   * - `'BANK_CARD'` or `'48'` — Bank card / debit card
   */
  paymentMethod: z
    .union([ZATCAPaymentMethodSchema, z.enum(["10", "30", "42", "48"])], {
      errorMap: () => ({
        message:
          "Must be 10 (cash), 30 (credit), 42 (bank transfer), 48 (card), or 1 (not defined)",
      }),
    })
    .optional(),
});

const CreditDebitInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  cancelation: CancelationSchema,
  /**
   * Invoice type code (BT-3).
   * - `'CREDIT_NOTE'` or `'381'` — Credit note (reduces or cancels a prior invoice)
   * - `'DEBIT_NOTE'` or `'383'` — Debit note (increases a prior invoice amount)
   */
  invoiceType: z.union(
    [
      z.literal("DEBIT_NOTE"),
      z.literal("CREDIT_NOTE"),
      z.literal("381"),
      z.literal("383"),
    ],
    {
      errorMap: () => ({
        message:
          "Must be 388 (invoice), 381 (credit note), 383 (debit note), or 386 (prepayment)",
      }),
    }
  ),
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
const ZATCAInvoicePropsUnionSchema = z.union([
  CashOrCreditDebitSchema.and(
    z.object({
      /**
       * Transaction type code (KSA-2, 7-character string).
       * - `'STANDARD'` or `'0100000'` — Standard tax invoice (B2B/B2G, requires ZATCA clearance)
       */
      invoiceCode: z.union([z.literal("STANDARD"), z.literal("0100000")], {
        errorMap: () => ({
          message: "Must be 0100000 (tax invoice) or 0200000 (simplified)",
        }),
      }),
    })
  ),
  CashOrCreditDebitSchema.and(
    z.object({
      /**
       * Transaction type code (KSA-2, 7-character string).
       * - `'SIMPLIFIED'` or `'0200000'` — Simplified tax invoice (B2C, reported within 24 hours)
       */
      invoiceCode: z.union([z.literal("SIMPLIFIED"), z.literal("0200000")], {
        errorMap: () => ({
          message: "Must be 0100000 (tax invoice) or 0200000 (simplified)",
        }),
      }),
    })
  ),
]);

export const ZATCAInvoicePropsSchema = ZATCAInvoicePropsUnionSchema.superRefine(
  (data, ctx) => {
    const isStandardInvoice =
      data.invoiceCode === "STANDARD" || data.invoiceCode === "0100000";
    if (isStandardInvoice && !data.customerInfo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer info (BG-7) is required for standard/tax invoices",
        path: ["customerInfo"],
      });
    }
  }
);

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
