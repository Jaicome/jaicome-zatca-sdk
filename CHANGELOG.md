# Changelog

## [Unreleased] — Breaking Release: Package-Only API

### BREAKING CHANGES

This release removes the root `zatca-xml-js` legacy API entirely. There is no deprecation window. The APIs listed below are gone.

#### Root imports removed

Direct imports from `zatca-xml-js` no longer work. The following files have been deleted:

- `src/index.ts` — root barrel export
- `src/compat/index.ts` — compatibility shim
- `src/zatca/` — invoice and signing logic
- `src/parser/` — XML parsing utilities
- `src/logger/` — logging helpers
- `src/samples/` — sample data
- `src/tests/` — test fixtures

The root `package.json` no longer has `main`, `files`, or `typings` fields. The root package is `"private": true` and is not published to npm.

#### Migration mapping

Every symbol that was previously importable from `zatca-xml-js` has a direct replacement in the scoped packages.

| Old Import (REMOVED) | New Import |
|---|---|
| `import { EGS } from "zatca-xml-js"` | `import { EGS } from "@jaicome/zatca-server"` |
| `import { ZATCAInvoice } from "zatca-xml-js"` | `import { ZATCAInvoice } from "@jaicome/zatca-core"` |
| `import { ZATCAInvoiceTypes } from "zatca-xml-js"` | `import { ZATCAInvoiceTypes } from "@jaicome/zatca-core"` |
| `import { ZATCAPaymentMethods } from "zatca-xml-js"` | `import { ZATCAPaymentMethods } from "@jaicome/zatca-core"` |
| `import { generatePhaseOneQR } from "zatca-xml-js"` | `import { generatePhaseOneQR } from "@jaicome/zatca-core"` |
| `import { REQUIRED_COMPLIANCE_STEPS } from "zatca-xml-js"` | `import { REQUIRED_COMPLIANCE_STEPS } from "@jaicome/zatca-server"` |
| `import { ZATCAComplianceStep } from "zatca-xml-js"` | `import { ZATCAComplianceStep } from "@jaicome/zatca-server"` |
| `import { ComplianceCheckPayload } from "zatca-xml-js"` | `import { ComplianceCheckPayload } from "@jaicome/zatca-server"` |
| `import { ZATCAInvoiceLineItem } from "zatca-xml-js"` | `import { ZATCAInvoiceLineItem } from "@jaicome/zatca-core"` |
| `import { ZATCAInvoiceProps } from "zatca-xml-js"` | `import { ZATCAInvoiceProps } from "@jaicome/zatca-core"` |
| `import { EGSUnitInfo } from "zatca-xml-js"` | `import { EGSUnitInfo } from "@jaicome/zatca-core"` or `"@jaicome/zatca-server"` |
| `import { EGSUnitLocation } from "zatca-xml-js"` | `import { EGSUnitLocation } from "@jaicome/zatca-core"` or `"@jaicome/zatca-server"` |
| `import { EGSUnitCustomerInfo } from "zatca-xml-js"` | `import { EGSUnitCustomerInfo } from "@jaicome/zatca-core"` or `"@jaicome/zatca-server"` |
| `import { ... } from "zatca-xml-js/src/compat"` | Use `@jaicome/zatca-core` and `@jaicome/zatca-server` directly |

#### What to install

```bash
npm uninstall zatca-xml-js
npm install @jaicome/zatca-core @jaicome/zatca-server
```

See [docs/MIGRATION.md](docs/MIGRATION.md) for a full walkthrough including the new injected signer pattern.

### New packages

- **`@jaicome/zatca-core`**: Universal invoice logic. Works in Node.js, browsers, and React Native.
- **`@jaicome/zatca-server`**: Node.js signing, EGS on-boarding, and ZATCA HTTP API integration.
