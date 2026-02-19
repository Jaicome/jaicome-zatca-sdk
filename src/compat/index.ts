/**
 * Compatibility shim for zatca-xml-js users migrating to @jaicome/zatca-core + @jaicome/zatca-server.
 * @deprecated Use @jaicome/zatca-server and @jaicome/zatca-core directly.
 */

// Server-only exports (require @jaicome/zatca-server)
export {
  EGS,
  EGSUnitInfo,
  EGSUnitLocation,
  EGSUnitCustomerInfo,
  ZATCAComplianceStep,
  ComplianceCheckPayload,
  REQUIRED_COMPLIANCE_STEPS,
} from "@jaicome/zatca-server";

// Core exports (from @jaicome/zatca-core)
export {
  ZATCAInvoice,
  ZATCAInvoiceProps,
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
} from "@jaicome/zatca-core";
export { generatePhaseOneQR } from "@jaicome/zatca-core";
