/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable eslint-plugin-unicorn/no-array-for-each */

import Decimal from "decimal.js";

import type { XMLDocument } from "./parser/index.js";
import { PAYMENT_METHOD_CODES } from "./templates/simplified-tax-invoice-template.js";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "./templates/simplified-tax-invoice-template.js";

interface CACTaxableAmount {
  taxAmount: number;
  taxableAmount: number;
  exist: boolean;
}

const roundingNumber = (acceptWarning: boolean, number: number): string => {
  if (!acceptWarning) {
    return new Decimal(number).toFixed(2);
  }
  return new Decimal(number).toString();
};

const constructLineItemTotals = (
  lineItem: ZATCAInvoiceLineItem,
  acceptWarning: boolean
) => {
  if (lineItem.quantity < 0) {
    throw new Error(
      `Invalid line item: quantity must be non-negative, got ${lineItem.quantity}`
    );
  }
  if (lineItem.taxExclusivePrice < 0) {
    throw new Error(
      `Invalid line item: tax_exclusive_price must be non-negative, got ${lineItem.taxExclusivePrice}`
    );
  }
  let lineDiscounts = 0;
  const cacAllowanceCharges: any[] = [];
  const cacClassifiedTaxCategories: any[] = [];
  let cacTaxTotal = {};

  const VAT = {
    "cac:TaxScheme": {
      "cbc:ID": "VAT",
    },
    "cbc:ID": lineItem.vatPercent ? "S" : lineItem.vatCategory?.code,
    "cbc:Percent": lineItem.vatPercent
      ? (lineItem.vatPercent * 100).toString()
      : 0,
  };
  cacClassifiedTaxCategories.push(VAT);

  lineItem.discounts?.forEach((discount) => {
    if (discount.amount < 0) {
      throw new Error(
        `Invalid discount: amount must be non-negative, got ${discount.amount}`
      );
    }
    lineDiscounts += discount.amount;
    cacAllowanceCharges.push({
      "cbc:AllowanceChargeReason": discount.reason,
      "cbc:Amount": {
        "#text": new Decimal(discount.amount).toFixed(14),
        "@_currencyID": "SAR",
      },
      "cbc:BaseAmount": {
        "#text": lineItem.taxExclusivePrice,
        "@_currencyID": "SAR",
      },
      "cbc:ChargeIndicator": "false",
    });
  });

  lineDiscounts = Number(new Decimal(lineDiscounts).toFixed(14));
  const lineExtensionAmount = new Decimal(
    roundingNumber(
      acceptWarning,
      lineItem.quantity * (lineItem.taxExclusivePrice - lineDiscounts)
    )
  );
  const lineItemTotalTaxes = new Decimal(
    roundingNumber(
      acceptWarning,
      lineExtensionAmount.toNumber() * lineItem.vatPercent
    )
  );

  cacTaxTotal = {
    "cbc:RoundingAmount": {
      "#text": new Decimal(
        lineExtensionAmount.plus(lineItemTotalTaxes)
      ).toFixed(2),
      "@_currencyID": "SAR",
    },
    "cbc:TaxAmount": {
      "#text": new Decimal(lineItemTotalTaxes).toFixed(2),
      "@_currencyID": "SAR",
    },
  };

  return {
    cacAllowanceCharges,
    cacClassifiedTaxCategories,
    cacTaxTotal,
    lineDiscounts,
    lineExtensionAmount,
    lineItemTotalTaxes,
  };
};

const constructLineItem = (
  lineItem: ZATCAInvoiceLineItem,
  acceptWarning: boolean
) => {
  const {
    cacAllowanceCharges,
    cacClassifiedTaxCategories,
    cacTaxTotal,
    lineItemTotalTaxes,
    lineDiscounts,
    lineExtensionAmount,
  } = constructLineItemTotals(lineItem, acceptWarning);

  return {
    lineItemTotals: {
      discountsTotal: lineDiscounts,
      extensionAmount: lineExtensionAmount.toNumber(),
      taxesTotal: lineItemTotalTaxes.toNumber(),
    },
    lineItemXml: {
      "cac:Item": {
        "cac:ClassifiedTaxCategory": cacClassifiedTaxCategories,
        "cbc:Name": lineItem.name,
      },
      "cac:Price": {
        "cac:AllowanceCharge": cacAllowanceCharges,
        "cbc:PriceAmount": {
          "#text": new Decimal(lineItem.taxExclusivePrice)
            .minus(new Decimal(lineDiscounts))
            .toFixed(14),
          "@_currencyID": "SAR",
        },
      },
      "cac:TaxTotal": cacTaxTotal,
      "cbc:ID": lineItem.id,
      "cbc:InvoicedQuantity": {
        "#text": lineItem.quantity,
        "@_unitCode": "PCE",
      },
      "cbc:LineExtensionAmount": {
        "#text": new Decimal(lineExtensionAmount).toFixed(2),
        "@_currencyID": "SAR",
      },
    },
  };
};

const constructTaxTotal = (
  lineItems: ZATCAInvoiceLineItem[],
  acceptWarning: boolean
) => {
  const cacTaxSubtotal: any[] = [];
  const zeroTaxSubtotal: any[] = [];

  const withoutTaxItems = lineItems.filter((item) => item.vatPercent === 0);
  const modifiedZeroTaxSubTotal = (items: ZATCAInvoiceLineItem[]) => {
    const zeroTaxObj: Record<
      string,
      {
        totalTaxableAmount: number;
        totalTaxAmount: number;
        reason: string;
        reasonCode: string;
      }
    > = {};

    items.forEach((item) => {
      if (item.vatPercent !== 0) {
        return;
      }
      const totalLineItemDiscount =
        item.discounts?.reduce((p, c) => p + c.amount, 0) || 0;

      const taxableAmount = Number(
        new Decimal(
          (item.taxExclusivePrice - totalLineItemDiscount) * item.quantity
        ).toFixed(2)
      );
      const taxAmount = Number(new Decimal(item.vatPercent * taxableAmount));

      const { code } = item.vatCategory;
      if (code && zeroTaxObj.hasOwnProperty(code)) {
        zeroTaxObj[code].totalTaxAmount += taxAmount;
        zeroTaxObj[code].totalTaxableAmount += taxableAmount;
      } else if (code && !zeroTaxObj.hasOwnProperty(code)) {
        zeroTaxObj[code] = {
          reason: item.vatCategory?.reason || "",
          reasonCode: item.vatCategory?.reasonCode || "",
          totalTaxAmount: taxAmount,
          totalTaxableAmount: taxableAmount,
        };
      } else {
        throw new Error("Zero Tax percent must has vat category code");
      }
    });
    return zeroTaxObj;
  };

  if (withoutTaxItems?.length) {
    const zeroTaxTotals = modifiedZeroTaxSubTotal(withoutTaxItems);
    for (const key in zeroTaxTotals) {
      zeroTaxSubtotal.push({
        "cac:TaxCategory": {
          "cac:TaxScheme": {
            "cbc:ID": {
              "#text": "VAT",
              "@_schemeAgencyID": "6",
              "@_schemeID": "UN/ECE 5153",
            },
          },
          "cbc:ID": {
            "#text": key,
            "@_schemeAgencyID": 6,
            "@_schemeID": "UN/ECE 5305",
          },
          "cbc:Percent": 0,
          "cbc:TaxExemptionReason": zeroTaxTotals[key].reason,
          "cbc:TaxExemptionReasonCode": zeroTaxTotals[key].reasonCode,
        },
        "cbc:TaxAmount": {
          "#text": new Decimal(zeroTaxTotals[key].totalTaxAmount).toString(),
          "@_currencyID": "SAR",
        },
        "cbc:TaxableAmount": {
          "#text": roundingNumber(
            acceptWarning,
            zeroTaxTotals[key].totalTaxableAmount
          ),
          "@_currencyID": "SAR",
        },
      });
    }
  }

  const fiveTaxSubTotal: CACTaxableAmount = {
    exist: false,
    taxAmount: 0,
    taxableAmount: 0,
  };
  const fifteenTaxSubTotal: CACTaxableAmount = {
    exist: false,
    taxAmount: 0,
    taxableAmount: 0,
  };

  const addTaxSubtotal = (
    taxableAmount: number,
    taxAmount: number,
    tax_percent: number
  ) => {
    if (tax_percent === 0) {
      return;
    }
    if (tax_percent === 0.05) {
      fiveTaxSubTotal.taxableAmount += taxableAmount;
      fiveTaxSubTotal.taxAmount += taxAmount;
      fiveTaxSubTotal.exist = true;
    } else if (tax_percent === 0.15) {
      fifteenTaxSubTotal.taxableAmount += taxableAmount;
      fifteenTaxSubTotal.taxAmount += taxAmount;
      fifteenTaxSubTotal.exist = true;
    }
  };

  let taxesTotal = 0;

  lineItems.forEach((line_item) => {
    let totalLineItemDiscount =
      line_item.discounts?.reduce((p, c) => p + c.amount, 0) || 0;

    totalLineItemDiscount = Number(
      new Decimal(totalLineItemDiscount).toFixed(14)
    );
    const taxableAmount = new Decimal(
      roundingNumber(
        acceptWarning,
        (line_item.taxExclusivePrice - totalLineItemDiscount) *
          line_item.quantity
      )
    );

    const taxAmount = new Decimal(
      roundingNumber(
        acceptWarning,
        line_item.vatPercent * taxableAmount.toNumber()
      )
    );

    addTaxSubtotal(
      taxableAmount.toNumber(),
      taxAmount.toNumber(),
      line_item.vatPercent
    );
    taxesTotal += taxAmount.toNumber();

    line_item.otherTaxes?.forEach((tax) => {
      const otherTaxAmount = new Decimal(
        roundingNumber(
          acceptWarning,
          tax.percentAmount * taxableAmount.toNumber()
        )
      );
      addTaxSubtotal(
        taxableAmount.toNumber(),
        otherTaxAmount.toNumber(),
        tax.percentAmount
      );
      taxesTotal += otherTaxAmount.toNumber();
    });
  });

  // BR-CO-15: Apply document-level rounding once after accumulating all line-level VAT amounts
  taxesTotal = Number.parseFloat(new Decimal(taxesTotal).toFixed(2));

  if (fifteenTaxSubTotal.exist) {
    cacTaxSubtotal.push({
      "cac:TaxCategory": {
        "cac:TaxScheme": {
          "cbc:ID": {
            "#text": "VAT",
            "@_schemeAgencyID": "6",
            "@_schemeID": "UN/ECE 5153",
          },
        },
        "cbc:ID": {
          "#text": "S",
          "@_schemeAgencyID": 6,
          "@_schemeID": "UN/ECE 5305",
        },
        "cbc:Percent": 15,
      },
      "cbc:TaxAmount": {
        "#text": roundingNumber(acceptWarning, fifteenTaxSubTotal.taxAmount),
        "@_currencyID": "SAR",
      },
      "cbc:TaxableAmount": {
        "#text": roundingNumber(
          acceptWarning,
          fifteenTaxSubTotal.taxableAmount
        ),
        "@_currencyID": "SAR",
      },
    });
  }
  if (fiveTaxSubTotal.exist) {
    cacTaxSubtotal.push({
      "cac:TaxCategory": {
        "cac:TaxScheme": {
          "cbc:ID": {
            "#text": "VAT",
            "@_schemeAgencyID": "6",
            "@_schemeID": "UN/ECE 5153",
          },
        },
        "cbc:ID": {
          "#text": "S",
          "@_schemeAgencyID": 6,
          "@_schemeID": "UN/ECE 5305",
        },
        "cbc:Percent": 5,
      },
      "cbc:TaxAmount": {
        "#text": new Decimal(fiveTaxSubTotal.taxAmount).toFixed(2),
        "@_currencyID": "SAR",
      },
      "cbc:TaxableAmount": {
        "#text": roundingNumber(acceptWarning, fiveTaxSubTotal.taxableAmount),
        "@_currencyID": "SAR",
      },
    });
  }
  taxesTotal = Number.parseFloat(roundingNumber(acceptWarning, taxesTotal));

  return {
    cacTaxTotal: [
      {
        "cac:TaxSubtotal": cacTaxSubtotal.concat(zeroTaxSubtotal),
        "cbc:TaxAmount": {
          "#text": new Decimal(taxesTotal).toFixed(2),
          "@_currencyID": "SAR",
        },
      },
      {
        "cbc:TaxAmount": {
          "#text": new Decimal(taxesTotal).toFixed(2),
          "@_currencyID": "SAR",
        },
      },
    ],
    taxesTotal,
  };
};

const constructLegalMonetaryTotal = (
  total_lineExtensionAmount: number,
  total_tax: number,
  acceptWarning: boolean
) => {
  const taxExclusiveAmount = total_lineExtensionAmount;
  const taxInclusiveAmount = new Decimal(taxExclusiveAmount).plus(
    new Decimal(total_tax)
  );
  return {
    "cbc:LineExtensionAmount": {
      "#text": new Decimal(total_lineExtensionAmount).toFixed(2),
      "@_currencyID": "SAR",
    },
    "cbc:PayableAmount": {
      "#text": new Decimal(taxInclusiveAmount).toFixed(2),
      "@_currencyID": "SAR",
    },
    "cbc:PrepaidAmount": {
      "#text": 0,
      "@_currencyID": "SAR",
    },
    "cbc:TaxExclusiveAmount": {
      "#text": roundingNumber(acceptWarning, taxExclusiveAmount),
      "@_currencyID": "SAR",
    },
    "cbc:TaxInclusiveAmount": {
      "#text": new Decimal(taxInclusiveAmount).toFixed(2),
      "@_currencyID": "SAR",
    },
  };
};

export const Calc = (
  lineItems: ZATCAInvoiceLineItem[],
  props: ZATCAInvoiceProps,
  invoiceXml: XMLDocument,
  acceptWarning: boolean
) => {
  let totalTaxes: number = 0;
  let totalExtensionAmount: number = 0;
  let totalDiscounts: number = 0;

  const invoiceLineItems: any[] = [];

  // Validate inputs before computation
  lineItems.forEach((item) => {
    if (item.quantity < 0) {
      throw new Error(
        `Invalid line item: quantity must be non-negative, got ${item.quantity}`
      );
    }
    if (item.taxExclusivePrice < 0) {
      throw new Error(
        `Invalid line item: taxExclusivePrice must be non-negative, got ${item.taxExclusivePrice}`
      );
    }
  });

  lineItems.forEach((line_item) => {
    line_item.taxExclusivePrice = Number(
      new Decimal(line_item.taxExclusivePrice).toFixed(14)
    );
    const { lineItemXml, lineItemTotals } = constructLineItem(
      line_item,
      acceptWarning
    );
    totalTaxes += lineItemTotals.taxesTotal;
    totalExtensionAmount += lineItemTotals.extensionAmount;
    totalDiscounts += lineItemTotals.discountsTotal;
    invoiceLineItems.push(lineItemXml);
  });

  // Handle both old format (numeric codes like "381", "383") and new format (string keys like "CREDIT_NOTE", "DEBIT_NOTE")
  if (
    (props.invoiceType === "CREDIT_NOTE" ||
      props.invoiceType === "DEBIT_NOTE" ||
      props.invoiceType === "381" ||
      props.invoiceType === "383") &&
    props.cancelation
  ) {
    const paymentMethodCode =
      (PAYMENT_METHOD_CODES as any)[props.cancelation.paymentMethod] ??
      props.cancelation.paymentMethod;
    invoiceXml.set("Invoice/cac:PaymentMeans", false, {
      "cbc:InstructionNote": props.cancelation.reason ?? "No note Specified",
      "cbc:PaymentMeansCode": paymentMethodCode,
    });
  }

  const taxTotalDetails = constructTaxTotal(lineItems, acceptWarning);
  invoiceXml.set("Invoice/cac:TaxTotal", false, taxTotalDetails.cacTaxTotal);

  invoiceXml.set(
    "Invoice/cac:LegalMonetaryTotal",
    true,
    constructLegalMonetaryTotal(totalExtensionAmount, totalTaxes, acceptWarning)
  );

  invoiceLineItems.forEach((line_item) => {
    invoiceXml.set("Invoice/cac:InvoiceLine", false, line_item);
  });
};
