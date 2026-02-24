import {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "./ZATCASimplifiedTaxInvoice.js";
import { XMLDocument } from "./parser/index.js";
import Decimal from "decimal.js";

interface CACTaxableAmount {
  taxAmount: number;
  taxableAmount: number;
  exist: boolean;
}

const roundingNumber = (acceptWarning: boolean, number: number): string => {
  try {
    if (!acceptWarning) {
      return new Decimal(number).toFixed(2);
    } else {
      return new Decimal(number).toString();
    }
  } catch (e) {
    throw e;
  }
};

const constructLineItemTotals = (
  lineItem: ZATCAInvoiceLineItem,
  acceptWarning: boolean
) => {
  if (lineItem.quantity < 0) {
    throw new Error(`Invalid line item: quantity must be non-negative, got ${lineItem.quantity}`);
  }
  if (lineItem.taxExclusivePrice < 0) {
    throw new Error(`Invalid line item: tax_exclusive_price must be non-negative, got ${lineItem.taxExclusivePrice}`);
  }
  let lineDiscounts = 0;
  let cacAllowanceCharges: any[] = [];
  let cacClassifiedTaxCategories: any[] = [];
  let cacTaxTotal = {};

  const VAT = {
    "cbc:ID": lineItem.vatPercent ? "S" : lineItem.vatCategory?.code,
    "cbc:Percent": lineItem.vatPercent
      ? (lineItem.vatPercent * 100).toString()
      : 0.0,
    "cac:TaxScheme": {
      "cbc:ID": "VAT",
    },
  };
  cacClassifiedTaxCategories.push(VAT);

  lineItem.discounts?.forEach((discount) => {
    if (discount.amount < 0) {
      throw new Error(`Invalid discount: amount must be non-negative, got ${discount.amount}`);
    }
    lineDiscounts += discount.amount;
    cacAllowanceCharges.push({
      "cbc:ChargeIndicator": "false",
      "cbc:AllowanceChargeReason": discount.reason,
      "cbc:Amount": {
        "@_currencyID": "SAR",
        "#text": new Decimal(discount.amount).toFixed(14),
      },
      "cbc:BaseAmount": {
        "@_currencyID": "SAR",
        "#text": lineItem.taxExclusivePrice,
      },
    });
  });

  lineDiscounts = Number(new Decimal(lineDiscounts).toFixed(14));
  let lineExtensionAmount = new Decimal(
    roundingNumber(
      acceptWarning,
      lineItem.quantity * (lineItem.taxExclusivePrice - lineDiscounts)
    )
  );
  let lineItemTotalTaxes = new Decimal(
    roundingNumber(
      acceptWarning,
      lineExtensionAmount.toNumber() * lineItem.vatPercent
    )
  );

  cacTaxTotal = {
    "cbc:TaxAmount": {
      "@_currencyID": "SAR",
      "#text": new Decimal(lineItemTotalTaxes).toFixed(2),
    },
    "cbc:RoundingAmount": {
      "@_currencyID": "SAR",
      "#text": new Decimal(
        lineExtensionAmount.plus(lineItemTotalTaxes)
      ).toFixed(2),
    },
  };

  return {
    cacAllowanceCharges,
    cacClassifiedTaxCategories,
    cacTaxTotal,
    lineItemTotalTaxes,
    lineDiscounts,
    lineExtensionAmount,
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
  } = constructLineItemTotals(line_item, acceptWarning);

  return {
    lineItemXml: {
      "cbc:ID": lineItem.id,
      "cbc:InvoicedQuantity": {
        "@_unitCode": "PCE",
        "#text": lineItem.quantity,
      },
      "cbc:LineExtensionAmount": {
        "@_currencyID": "SAR",
        "#text": new Decimal(lineExtensionAmount).toFixed(2),
      },
      "cac:TaxTotal": cacTaxTotal,
      "cac:Item": {
        "cbc:Name": lineItem.name,
        "cac:ClassifiedTaxCategory": cacClassifiedTaxCategories,
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          "@_currencyID": "SAR",
          "#text": new Decimal(lineItem.taxExclusivePrice)
            .minus(new Decimal(lineDiscounts))
            .toFixed(14),
        },
        "cac:AllowanceCharge": cacAllowanceCharges,
      },
    },
    lineItemTotals: {
      taxesTotal: lineItemTotalTaxes.toNumber(),
      discounts_total: lineDiscounts,
      extension_amount: lineExtensionAmount.toNumber(),
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
    let zeroTaxObj: {
      [key: string]: {
        totalTaxableAmount: number;
        totalTaxAmount: number;
        reason: string;
        reasonCode: string;
      };
    } = {};

    items.forEach((item) => {
      if (item.vatPercent !== 0) return;
      let totalLineItemDiscount =
        item.discounts?.reduce((p, c) => p + c.amount, 0) || 0;

      const taxableAmount = Number(
        new Decimal(
          (item.taxExclusivePrice - totalLineItemDiscount) * item.quantity
        ).toFixed(2)
      );
      let taxAmount = Number(new Decimal(item.vatPercent * taxableAmount));

      let code = item.vatCategory.code;
      if (code && zeroTaxObj.hasOwnProperty(code)) {
        zeroTaxObj[code].totalTaxAmount += taxAmount;
        zeroTaxObj[code].totalTaxableAmount += taxableAmount;
      } else if (code && !zeroTaxObj.hasOwnProperty(code)) {
        zeroTaxObj[code] = {
          totalTaxAmount: taxAmount,
          totalTaxableAmount: taxableAmount,
          reason: item.vatCategory?.reason || "",
          reasonCode: item.vatCategory?.reasonCode || "",
        };
      } else {
        throw new Error("Zero Tax percent must has vat category code");
      }
    });
    return zeroTaxObj;
  };

  if (withoutTaxItems?.length) {
    const zeroTaxTotals = modifiedZeroTaxSubTotal(withoutTaxItems);
    for (let key in zeroTaxTotals) {
      zeroTaxSubtotal.push({
        "cbc:TaxableAmount": {
          "@_currencyID": "SAR",
          "#text": roundingNumber(
            acceptWarning,
            zeroTaxTotals[key].totalTaxableAmount
          ),
        },
        "cbc:TaxAmount": {
          "@_currencyID": "SAR",
          "#text": new Decimal(zeroTaxTotals[key].totalTaxAmount).toString(),
        },
        "cac:TaxCategory": {
          "cbc:ID": {
            "@_schemeAgencyID": 6,
            "@_schemeID": "UN/ECE 5305",
            "#text": key,
          },
          "cbc:Percent": 0.0,
          "cbc:TaxExemptionReasonCode": zeroTaxTotals[key].reasonCode,
          "cbc:TaxExemptionReason": zeroTaxTotals[key].reason,
          "cac:TaxScheme": {
            "cbc:ID": {
              "@_schemeAgencyID": "6",
              "@_schemeID": "UN/ECE 5153",
              "#text": "VAT",
            },
          },
        },
      });
    }
  }

  const fiveTaxSubTotal: CACTaxableAmount = {
    taxableAmount: 0,
    taxAmount: 0,
    exist: false,
  };
  const fifteenTaxSubTotal: CACTaxableAmount = {
    taxableAmount: 0,
    taxAmount: 0,
    exist: false,
  };

  const addTaxSubtotal = (
    taxableAmount: number,
    taxAmount: number,
    tax_percent: number
  ) => {
    if (tax_percent === 0) return;
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
      lineItem.discounts?.reduce((p, c) => p + c.amount, 0) || 0;

    totalLineItemDiscount = Number(
      new Decimal(totalLineItemDiscount).toFixed(14)
    );
    const taxableAmount = new Decimal(
      roundingNumber(
        acceptWarning,
        (lineItem.taxExclusivePrice - totalLineItemDiscount) *
          lineItem.quantity
      )
    );

    let taxAmount = new Decimal(
      roundingNumber(
        acceptWarning,
        lineItem.vatPercent * taxableAmount.toNumber()
      )
    );

    addTaxSubtotal(
      taxableAmount.toNumber(),
      taxAmount.toNumber(),
      lineItem.vatPercent
    );
    taxesTotal += taxAmount.toNumber();

    lineItem.otherTaxes?.forEach((tax) => {
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
  taxesTotal = parseFloat(new Decimal(taxesTotal).toFixed(2));

  if (fifteenTaxSubTotal.exist) {
    cacTaxSubtotal.push({
      "cbc:TaxableAmount": {
        "@_currencyID": "SAR",
        "#text": roundingNumber(
          acceptWarning,
          fifteenTaxSubTotal.taxableAmount
        ),
      },
      "cbc:TaxAmount": {
        "@_currencyID": "SAR",
        "#text": roundingNumber(acceptWarning, fifteenTaxSubTotal.taxAmount),
      },
      "cac:TaxCategory": {
        "cbc:ID": {
          "@_schemeAgencyID": 6,
          "@_schemeID": "UN/ECE 5305",
          "#text": "S",
        },
        "cbc:Percent": 15,
        "cac:TaxScheme": {
          "cbc:ID": {
            "@_schemeAgencyID": "6",
            "@_schemeID": "UN/ECE 5153",
            "#text": "VAT",
          },
        },
      },
    });
  }
  if (fiveTaxSubTotal.exist) {
    cacTaxSubtotal.push({
      "cbc:TaxableAmount": {
        "@_currencyID": "SAR",
        "#text": roundingNumber(acceptWarning, fiveTaxSubTotal.taxableAmount),
      },
      "cbc:TaxAmount": {
        "@_currencyID": "SAR",
        "#text": new Decimal(fiveTaxSubTotal.taxAmount).toFixed(2),
      },
      "cac:TaxCategory": {
        "cbc:ID": {
          "@_schemeAgencyID": 6,
          "@_schemeID": "UN/ECE 5305",
          "#text": "S",
        },
        "cbc:Percent": 5,
        "cac:TaxScheme": {
          "cbc:ID": {
            "@_schemeAgencyID": "6",
            "@_schemeID": "UN/ECE 5153",
            "#text": "VAT",
          },
        },
      },
    });
  }
  taxesTotal = parseFloat(roundingNumber(acceptWarning, taxesTotal));

  return {
    cacTaxTotal: [
      {
        "cbc:TaxAmount": {
          "@_currencyID": "SAR",
          "#text": new Decimal(taxesTotal).toFixed(2),
        },
        "cac:TaxSubtotal": cacTaxSubtotal.concat(zeroTaxSubtotal),
      },
      {
        "cbc:TaxAmount": {
          "@_currencyID": "SAR",
          "#text": new Decimal(taxesTotal).toFixed(2),
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
  let taxExclusiveAmount = total_lineExtensionAmount;
  let taxInclusiveAmount = new Decimal(taxExclusiveAmount).plus(
    new Decimal(total_tax)
  );
  return {
    "cbc:LineExtensionAmount": {
      "@_currencyID": "SAR",
      "#text": new Decimal(total_lineExtensionAmount).toFixed(2),
    },
    "cbc:TaxExclusiveAmount": {
      "@_currencyID": "SAR",
      "#text": roundingNumber(acceptWarning, taxExclusiveAmount),
    },
    "cbc:TaxInclusiveAmount": {
      "@_currencyID": "SAR",
      "#text": new Decimal(taxInclusiveAmount).toFixed(2),
    },
    "cbc:PrepaidAmount": {
      "@_currencyID": "SAR",
      "#text": 0,
    },
    "cbc:PayableAmount": {
      "@_currencyID": "SAR",
      "#text": new Decimal(taxInclusiveAmount).toFixed(2),
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

  let invoiceLineItems: any[] = [];

  // Validate inputs before computation
  lineItems.forEach((item) => {
    if (item.quantity < 0) {
      throw new Error(`Invalid line item: quantity must be non-negative, got ${item.quantity}`);
    }
    if (item.taxExclusivePrice < 0) {
      throw new Error(`Invalid line item: tax_exclusive_price must be non-negative, got ${item.taxExclusivePrice}`);
    }
  });

  lineItems.forEach((line_item) => {
    lineItem.taxExclusivePrice = Number(
      new Decimal(lineItem.taxExclusivePrice).toFixed(14)
    );
    const { lineItemXml, lineItemTotals } = constructLineItem(
      line_item,
      acceptWarning
    );
    totalTaxes += lineItemTotals.taxesTotal;
    totalExtensionAmount += lineItemTotals.extension_amount;
    totalDiscounts += lineItemTotals.discounts_total;
    invoiceLineItems.push(lineItemXml);
  });

  if (
    (props.invoice_type === "381" || props.invoice_type === "383") &&
    props.cancelation
  ) {
    invoiceXml.set("Invoice/cac:PaymentMeans", false, {
      "cbc:PaymentMeansCode": props.cancelation.payment_method,
      "cbc:InstructionNote": props.cancelation.reason ?? "No note Specified",
    });
  }

  const taxTotalDetails = constructTaxTotal(lineItems, acceptWarning);
  invoiceXml.set("Invoice/cac:TaxTotal", false, taxTotalDetails.cacTaxTotal);

  invoiceXml.set(
    "Invoice/cac:LegalMonetaryTotal",
    true,
    constructLegalMonetaryTotal(
      totalExtensionAmount,
      totalTaxes,
      acceptWarning
    )
  );

  invoiceLineItems.forEach((line_item) => {
    invoiceXml.set("Invoice/cac:InvoiceLine", false, line_item);
  });
};
