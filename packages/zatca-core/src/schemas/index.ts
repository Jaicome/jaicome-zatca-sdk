import { z, type ZodIssue } from "zod";

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

export const EGSUnitLocationSchema = z.object({
  city: z.string().optional(),
  city_subdivision: z.string().optional(),
  street: z.string().optional(),
  plot_identification: z.string().optional(),
  building: z.string().optional(),
  postal_zone: z.string().optional(),
});

export const EGSUnitCustomerInfoSchema = z.object({
  city: z.string().optional(),
  city_subdivision: z.string().optional(),
  street: z.string().optional(),
  additional_street: z.string().optional(),
  plot_identification: z.string().optional(),
  building: z.string().optional(),
  postal_zone: z.string().optional(),
  country_sub_entity: z.string().optional(),
  buyer_name: z.string().min(1),
  customer_crn_number: z.string().optional(),
  vat_number: z.string().optional(),
});

export const EGSUnitInfoSchema = z.object({
  uuid: z.string().min(1),
  custom_id: z.string().min(1),
  model: z.string().min(1),
  CRN_number: z.string().min(1),
  VAT_name: z.string().min(1),
  VAT_number: z.string().min(1),
  branch_name: z.string().min(1),
  branch_industry: z.string().min(1),
  location: EGSUnitLocationSchema.optional(),
  customer_info: EGSUnitCustomerInfoSchema.optional(),
  private_key: z.string().optional(),
  csr: z.string().optional(),
  compliance_certificate: z.string().optional(),
  compliance_api_secret: z.string().optional(),
  production_certificate: z.string().optional(),
  production_api_secret: z.string().optional(),
});

const LineItemDiscountSchema = z.object({
  amount: z.number(),
  reason: z.string(),
});

const LineItemTaxSchema = z.object({
  percent_amount: z.number(),
});

const BaseLineItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number(),
  tax_exclusive_price: z.number(),
  other_taxes: z.array(LineItemTaxSchema).optional(),
  discounts: z.array(LineItemDiscountSchema).optional(),
});

const StandardLineItemSchema = BaseLineItemSchema.extend({
  VAT_percent: z.union([z.literal(0.15), z.literal(0.05)]),
});

const ZeroTaxLineItemSchema = BaseLineItemSchema.extend({
  VAT_percent: z.literal(0),
  vat_category: z.object({
    code: z.enum(["O", "Z", "E"]),
    reason_code: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const ZATCAInvoiceLineItemSchema = z.union([
  StandardLineItemSchema,
  ZeroTaxLineItemSchema,
]);

const ZatcaInvoiceBaseSchema = z.object({
  egs_info: EGSUnitInfoSchema,
  invoice_counter_number: z.number().int().positive(),
  invoice_serial_number: z.string().min(1),
  issue_date: z.string().min(1),
  issue_time: z.string().min(1),
  previous_invoice_hash: z.string().min(1),
  line_items: z.array(ZATCAInvoiceLineItemSchema).min(1),
});

const CancelationSchema = z.object({
  canceled_serial_invoice_number: z.string().min(1),
  payment_method: z.enum(["10", "30", "42", "48"]),
  reason: z.string().min(1),
});

const CashInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  invoice_type: z.literal("388"),
  actual_delivery_date: z.string().optional(),
  latest_delivery_date: z.string().optional(),
  payment_method: z.enum(["10", "30", "42", "48"]).optional(),
});

const CreditDebitInvoiceSchema = ZatcaInvoiceBaseSchema.extend({
  invoice_type: z.union([z.literal("383"), z.literal("381")]),
  cancelation: CancelationSchema,
});

const CashOrCreditDebitSchema = z.union([
  CashInvoiceSchema,
  CreditDebitInvoiceSchema,
]);

export const ZATCAInvoicePropsSchema = z.union([
  CashOrCreditDebitSchema.and(z.object({ invoice_code: z.literal("0100000") })),
  CashOrCreditDebitSchema.and(z.object({ invoice_code: z.literal("0200000") })),
]);

export const SigningInputSchema = z.object({
  invoiceXml: z.string().min(1),
  invoiceHash: z.string(),
  privateKeyReference: z.string(),
});
