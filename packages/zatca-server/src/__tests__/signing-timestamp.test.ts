import { generateKeyPairSync } from "node:crypto";

import { buildInvoice } from "../../../zatca-core/src/api";
import { XMLDocument } from "../../../zatca-core/src/parser/index";
import { generateSignedXMLString } from "../signing/index";

const SAMPLE_ZATCA_TEST_CERT_BODY =
  "MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTA1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8DA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";
const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

describe("signing timestamp alignment", () => {
  it("uses invoice's IssueDate and IssueTime for signing timestamp, not current date", () => {
    // Create an invoice with a specific issue date/time
    const issueDate = new Date("2024-03-15T14:30:45Z");
    const invoice = buildInvoice({
      crnNumber: "7032256278",
      egsInfo: {
        branchIndustry: "Software",
        branchName: "Main",
        id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
        model: "IOS",
        name: "SIGN-TEST",
        vatName: "Signing Test Co",
        vatNumber: "311497191800003",
      },
      invoiceCode: "SIMPLIFIED",
      invoiceCounterNumber: 1,
      invoiceSerialNumber: "SIGN-001",
      invoiceType: "INVOICE",
      issueDate,
      lineItems: [
        {
          id: "1",
          name: "P",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
      ],
      paymentMethod: "CASH",
      previousInvoiceHash:
        "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
    });

    const invoiceXml = invoice.getXML();

    // Generate a fresh key pair for this test
    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      privateKeyEncoding: { format: "pem", type: "sec1" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });

    const result = generateSignedXMLString({
      invoice_xml: invoiceXml,
      certificate_string: SAMPLE_CERT_PEM,
      private_key_string: privateKey,
    });

    // Extract the SigningTime from the signed XML using regex
    const match = result.signed_invoice_string.match(
      /<xades:SigningTime>([^<]+)<\/xades:SigningTime>/
    );

    expect(match).not.toBeNull();
    const signingTime = match![1];

    // Expected format: YYYY-MM-DDTHH:mm:ssZ
    // For issueDate = 2024-03-15T14:30:45Z, we expect "2024-03-15T14:30:45Z"
    expect(signingTime).toBe("2024-03-15T14:30:45Z");
  });
});
