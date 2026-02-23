# Validation Error Model

The `@jaicome/zatca` SDK uses Zod for input validation. When a function receives data that doesn't match the expected schema, it throws a `ZodValidationError`. This guide explains the structure of this error and how to handle it in your application.

## The ZodValidationError Class

The `ZodValidationError` class extends the standard JavaScript `Error`. It contains the raw Zod issues that caused the validation failure, allowing you to programmatically inspect what went wrong.

### Structure

```typescript
class ZodValidationError extends Error {
  // Array of specific validation issues
  readonly issues: ZodIssue[];
  
  // A human-readable summary of all issues
  readonly message: string;
}
```

Each `ZodIssue` includes:
- `path`: An array of strings/numbers representing the location of the error in the input object.
- `message`: A descriptive message of the validation failure.
- `code`: The Zod error code (e.g., `invalid_type`, `too_small`).

## How to Catch Validation Errors

You can import `ZodValidationError` from either `@jaicome/zatca-core` or `@jaicome/zatca-server` to perform type checks in your catch blocks.

```typescript
import { buildInvoice, ZodValidationError } from "@jaicome/zatca-core";

try {
  const invoice = buildInvoice(invalidProps);
} catch (error) {
  if (error instanceof ZodValidationError) {
    console.error("Validation failed with issues:", error.issues);
    
    // Example: Accessing a specific field error
    const missingField = error.issues.find(i => i.path.includes("invoice_serial_number"));
    if (missingField) {
      console.log("Serial number is required");
    }
  } else {
    // Handle other types of errors
    throw error;
  }
}
```

## Validated Boundaries

Validation automatically triggers at these key entry points in the SDK:

### 1. buildInvoice(props)
- **Package**: `@jaicome/zatca-core`
- **Schema**: `ZATCAInvoicePropsSchema`
- **Purpose**: Ensures the invoice data (simplified or tax, cash or credit/debit) follows ZATCA structural rules before processing.

### 2. prepareSigningInput(invoice)
- **Package**: `@jaicome/zatca-core`
- **Schema**: `SigningInputSchema`
- **Purpose**: Validates the intermediate data structure used for digital signing.

### 3. new EGS(info)
- **Package**: `@jaicome/zatca-server`
- **Schema**: `EGSUnitInfoSchema`
- **Purpose**: Validates the EGS unit configuration (UUID, VAT details, location) upon instantiation.

## Common Error Scenarios

### Missing Required Fields
If you omit a required field like `invoice_counter_number`, the `issues` array will contain:

```json
[
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "undefined",
    "path": ["invoice_counter_number"],
    "message": "Required"
  }
]
```

### Invalid Enum Values
When providing an unsupported invoice type:

```json
[
  {
    "received": "999",
    "code": "invalid_literal",
    "expected": "388",
    "path": ["invoice_type"],
    "message": "Invalid literal value, expected \"388\""
  }
]
```

### Type Mismatch
If a numeric field receives a string:

```json
[
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "string",
    "path": ["line_items", 0, "quantity"],
    "message": "Expected number, received string"
  }
]
```

## Import Paths

### Core Logic
```typescript
import { ZodValidationError } from "@jaicome/zatca-core";
```

### Server-side Logic
```typescript
import { ZodValidationError } from "@jaicome/zatca-server";
```
