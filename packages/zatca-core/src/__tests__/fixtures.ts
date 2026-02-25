/**
 * Shared test fixtures for ZATCA invoice testing.
 * Extracted from existing test files to prevent duplication across 17 test files.
 * All fixtures are validated against current Zod schemas.
 */

import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  EGSInfo,
  CustomerInfo,
} from "../zatca-simplified-tax-invoice.js";

/**
 * Sample seller/EGS information used across tests.
 * Represents a typical E-Invoice Generation System unit.
 */
export const SAMPLE_SELLER: EGSInfo = {
  branchIndustry: "Software",
  branchName: "Main",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  location: {
    building: "0000",
    city: "Khobar",
    citySubdivision: "West",
    plotIdentification: "0000",
    postalZone: "31952",
    street: "King Fahd st",
  },
  model: "IOS",
  name: "EGS1",
  vatName: "Jaicome Information Technology",
  vatNumber: "311497191800003",
};

/**
 * Sample single line item with standard VAT (15%).
 */
export const SAMPLE_LINE_ITEM: ZATCAInvoiceLineItem = {
  id: "1",
  name: "Sample Product",
  quantity: 2,
  taxExclusivePrice: 100,
  vatPercent: 0.15,
};

/**
 * Sample array of line items with mixed VAT rates.
 */
export const SAMPLE_LINE_ITEMS: ZATCAInvoiceLineItem[] = [
  {
    id: "1",
    name: "Product A",
    quantity: 2,
    taxExclusivePrice: 100,
    vatPercent: 0.15,
  },
  {
    id: "2",
    name: "Product B",
    quantity: 1,
    taxExclusivePrice: 50,
    vatPercent: 0.05,
  },
  {
    id: "3",
    name: "Exempt Service",
    quantity: 1,
    taxExclusivePrice: 25,
    vatPercent: 0,
    vatCategory: {
      code: "Z",
      reason: "Supply of a qualifying means of transport",
      reasonCode: "VATEX-SA-34-4",
    },
  },
];

/**
 * Sample customer information for invoices with buyer details.
 */
export const SAMPLE_CUSTOMER_INFO: CustomerInfo = {
  building: "00",
  buyerName: "Sample Buyer",
  city: "Jeddah",
  citySubdivision: "Downtown",
  customerCrnNumber: "7052156278",
  postalZone: "21442",
  street: "Main Street",
  vatNumber: "311498192800003",
};

/**
 * Sample simplified invoice props (most common use case).
 */
export const SAMPLE_INVOICE_PROPS: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: SAMPLE_SELLER,
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "EGS1-886431145-101",
  invoiceType: "INVOICE",
  issueDate: new Date("2024-01-15T10:00:00Z"),
  lineItems: [SAMPLE_LINE_ITEM],
  paymentMethod: "CASH",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

/**
 * Sample credit note props for testing cancelation flow.
 */
export const SAMPLE_CREDIT_NOTE_PROPS: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: SAMPLE_SELLER,
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 2,
  invoiceSerialNumber: "EGS1-886431145-102",
  invoiceType: "CREDIT_NOTE",
  issueDate: new Date("2024-01-16T11:00:00Z"),
  lineItems: [SAMPLE_LINE_ITEM],
  cancelation: {
    canceledSerialInvoiceNumber: "EGS1-886431145-101",
    paymentMethod: "CASH",
    reason: "Incorrect invoice amount",
  },
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

/**
 * Sample test certificate (base64 body without PEM wrappers).
 * Used for signing and certificate validation tests.
 * This is a real ZATCA test certificate from the compliance environment.
 */
export const SAMPLE_CERTIFICATE =
  "MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";

/**
 * Sample private key (base64 body without PEM wrappers).
 * Used for signing tests. This is a test key from the compliance environment.
 * NOTE: This is a test key only — never use in production.
 */
export const SAMPLE_PRIVATE_KEY =
  "MHcCAQEEICl5vABwcOCWdes2nGZWl5g6XSR/cJTdz8BCSFeJqrkvoAoGCCqGSM49AwEHoUQDQgAEIcniQmOeLledoIt8BURtgzZ/TroHlTDeJAUcX+XNiVxJJhq0FibNaT4f9jg3yDbC70AQqWNP4k6ARj6WlEnq3Q==";
