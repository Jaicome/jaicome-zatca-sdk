# ZATCA SDK Method Availability Matrix

This matrix inventories public exports for `@jaicome/zatca-core` and `@jaicome/zatca-server`.

Legend:
- `core-only`: exported from `@jaicome/zatca-core` only.
- `server-only`: exported from `@jaicome/zatca-server` only.
- `shared-contract`: cross-package contract symbols shared by both packages (or used by both surfaces).

| Symbol | Package | Classification | Runtime (Node/Browser/RN) | Legacy mapping | Notes | Validated |
| --- | --- | --- | --- | --- | --- | --- |
| `buildInvoice` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Core API builder | ✅ |
| `parseInvoice` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Core API parser | ❌ |
| `prepareSigningInput` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Produces `SigningInput` contract | ✅ |
| `generatePhaseOneQR` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `generatePhaseOneQR` | Core invoice instance helper | ❌ |
| `Calc` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Invoice line/tax calculator | ❌ |
| `RuntimeCapabilities` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export | ❌ |
| `DEFAULT_RUNTIME_CAPABILITIES` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Runtime capability defaults | ❌ |
| `SignatureResult` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export | ❌ |
| `SignedInvoiceArtifacts` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export | ❌ |
| `Signer` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export implemented by `NodeSigner` | ❌ |
| `SigningInput` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export consumed by signers | ❌ |
| `setLogging` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Logger toggle | ❌ |
| `log` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Logger helper | ❌ |
| `XMLObject` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export | ❌ |
| `XMLQueryResult` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Type export | ❌ |
| `XMLDocument` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Shared XML abstraction used by server signing | ❌ |
| `generatePhaseOneQRFromXml` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | XML-based phase one QR | ❌ |
| `valid_simplified_invoice_xml_sample` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Sample XML constant | ❌ |
| `ZATCAPaymentMethods` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAPaymentMethods` | Enum export | ❌ |
| `ZATCAInvoiceTypes` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoiceTypes` | Enum export | ❌ |
| `ZATCAInvoiceLineItemDiscount` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoiceLineItemDiscount` | Type export | ❌ |
| `ZATCAInvoiceLineItemTax` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoiceLineItemTax` | Type export | ❌ |
| `ZATCAInvoiceLineItem` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoiceLineItem` | Type export | ❌ |
| `ZATCAInvoicCancelation` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoicCancelation` | Type export (legacy spelling preserved) | ❌ |
| `EGSUnitLocation` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `EGSUnitLocation` | Type export mirrored in server | ❌ |
| `EGSUnitCustomerInfo` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `EGSUnitCustomerInfo` | Type export mirrored in server | ❌ |
| `EGSUnitInfo` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `EGSUnitInfo` | Type export mirrored in server | ❌ |
| `ZATCAInvoiceProps` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCAInvoiceProps` | Type export | ❌ |
| `defaultUBLExtensionsSignedPropertiesForSigning` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Signature template helper | ❌ |
| `defaultUBLExtensionsSignedProperties` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Signature template helper | ❌ |
| `defaultUBLExtensions` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Signature template helper | ❌ |
| `uint8ArrayToBase64` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `base64ToUint8Array` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `utf8ToUint8Array` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `stringToUint8Array` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `uint8ArrayToUtf8` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `uint8ArrayToString` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `uint8ArrayToHex` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `hexToUint8Array` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `concatUint8Arrays` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Portable bytes utility | ❌ |
| `ZATCAInvoice` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `ZATCASimplifiedTaxInvoice` | Class rename in new package API | ❌ |
| `ZodValidationError` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Typed Zod validation error class (carries `.issues[]`) | ❌ |
| `ZATCAInvoicePropsSchema` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Zod schema for invoice creation payload | ❌ |
| `ZATCAInvoiceLineItemSchema` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Zod schema for invoice line items | ❌ |
| `EGSUnitInfoSchema` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Zod schema for EGS unit config | ❌ |
| `EGSUnitLocationSchema` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Zod schema for EGS unit location | ❌ |
| `EGSUnitCustomerInfoSchema` | `@jaicome/zatca-core` | `core-only` | `yes/yes/yes` | `NEW` | Zod schema for EGS customer info | ❌ |
| `SigningInputSchema` | `@jaicome/zatca-core` | `shared-contract` | `yes/yes/yes` | `NEW` | Zod schema for signing input validation | ❌ |
| `getPureInvoiceString` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `getInvoiceHash` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `getCertificateHash` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `createInvoiceDigitalSignature` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `getCertificateInfo` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `cleanUpCertificateString` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `cleanUpPrivateKeyString` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Server signing utility | ❌ |
| `GenerateSignedXMLStringParams` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Type export | ❌ |
| `SignedXMLResult` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Type export | ❌ |
| `generateSignedXMLString` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Main server signing API | ❌ |
| `NodeSigner` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `NEW` | `Signer` implementation for Node | ❌ |
| `generateQR` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `NEW` | Full phase-two QR utility | ❌ |
| `generatePhaseOneQR` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `generatePhaseOneQR` | Legacy-compatible server QR helper | ❌ |
| `EGSUnitLocation` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `EGSUnitLocation` | Type export | ❌ |
| `EGSUnitCustomerInfo` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `EGSUnitCustomerInfo` | Type export | ❌ |
| `EGSUnitInfo` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `EGSUnitInfo` | Type export | ❌ |
| `ZATCAComplianceStep` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `ZATCAComplianceStep` | Type export | ❌ |
| `ComplianceCheckPayload` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `ComplianceCheckPayload` | Type export | ❌ |
| `REQUIRED_COMPLIANCE_STEPS` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `REQUIRED_COMPLIANCE_STEPS` | Constant export | ❌ |
| `EGS` | `@jaicome/zatca-server` | `server-only` | `yes/no/no` | `EGS` | Class export | ✅ |
| `ZodValidationError` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `NEW` | Re-exported from @jaicome/zatca-core | ❌ |
| `EGSUnitInfoSchema` | `@jaicome/zatca-server` | `shared-contract` | `yes/no/no` | `NEW` | Re-exported from @jaicome/zatca-core | ❌ |
