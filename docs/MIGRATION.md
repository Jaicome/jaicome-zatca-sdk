# Migration Guide

This guide explains how to migrate from the legacy `zatca-xml-js` package to the new `@jaicome/zatca` monorepo SDKs. The package is now split into two specialized parts.

1. **@jaicome/zatca-core**: Portable logic for building and parsing invoices. Works in browsers, React Native, and Node.js.
2. **@jaicome/zatca-server**: Node.js specific logic for signing, EGS lifecycle, and ZATCA HTTP API integration.

> **Package-only policy**: The root `zatca-xml-js` legacy API has been removed. Direct imports from `zatca-xml-js` (including `zatca-xml-js/src/` paths) are no longer supported. Only `@jaicome/zatca-core` and `@jaicome/zatca-server` are supported going forward.

## Quick Comparison

### Imports

**Legacy (Old)**
```typescript
import { 
  EGS, 
  EGSUnitInfo, 
  ZATCASimplifiedTaxInvoice 
} from "zatca-xml-js";
```

**New (Core + Server)**
```typescript
// Core logic (Universal)
import { 
  ZATCAInvoice
} from "@jaicome/zatca-core";

// Server logic (Node.js only)
import { 
  EGS, 
  NodeSigner 
} from "@jaicome/zatca-server";
```

## Step-by-Step Migration

### 1. Update Dependencies
Remove the old package and install the new scoped packages.

```bash
npm uninstall zatca-xml-js
npm install @jaicome/zatca-core @jaicome/zatca-server
```

### 2. Rename Invoice Classes
The `ZATCASimplifiedTaxInvoice` class is renamed to `ZATCAInvoice`. It is now part of the core package.

### 3. Adopt the Injected Signer Pattern
In the legacy version, `EGS` handled signing synchronously. The new SDK uses an injected `Signer` pattern. This allows the core package to remain portable while signing happens where the private keys are safe.

**Legacy Signing**
```typescript
const egs = new EGS(egsunit);
const { signed_invoice_string } = egs.signInvoice(invoice);
```

**New Signing (Node.js — server-side path)**
```typescript
import { NodeSigner } from "@jaicome/zatca-server";
import { ZATCAInvoice } from "@jaicome/zatca-core";

const signer = new NodeSigner(certificate_string);
const invoice = new ZATCAInvoice({ props, signer, acceptWarning: true });
const result = await invoice.sign(certificate_string, private_key_string);
// result.signedXml, result.invoiceHash
```

`NodeSigner` implements the `Signer` interface from `@jaicome/zatca-core`. Injecting it at construction time keeps the core package free of Node.js dependencies while still enabling full cryptographic signing on the server.

### 4. Browser and React Native Apps
If you are building a frontend app, you must only import `@jaicome/zatca-core`. 

Do not import `@jaicome/zatca-server` from a browser or React Native app. It uses Node.js `crypto`, `child_process`, and `fs` modules that are unavailable in those environments.

For signing in a browser app, send the unsigned XML to your server. Your server can then use `@jaicome/zatca-server` to sign it and return the result.

## Security Statement
Private key material must never leave the server environment. The `@jaicome/zatca-server` package is designed to handle sensitive cryptographic operations safely in a backend context. Never expose private keys or the server package to client-side code.
