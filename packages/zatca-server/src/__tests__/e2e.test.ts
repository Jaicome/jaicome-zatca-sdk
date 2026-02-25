import { generateKeyPairSync } from "node:crypto";

import { NodeSigner, EGS, ZodValidationError } from "@jaicome/zatca-server";
import type { EGSInfo } from "@jaicome/zatca-server";

const SAMPLE_ZATCA_TEST_CERT_BODY =
  "MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";

const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

const validEGSUnitInfo: EGSInfo = {
  branchIndustry: "Software",
  branchName: "Main",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  model: "IOS",
  name: "EGS1",
  vatName: "Jaicome Information Technology",
  vatNumber: "311497191800003",
};

describe("@jaicome/zatca-server — end-to-end", () => {
  describe("nodeSigner construction", () => {
    it("constructs without throwing when given a real PEM certificate", () => {
      expect(() => new NodeSigner(SAMPLE_CERT_PEM)).not.toThrow();
    });

    it("constructs with a dynamically generated EC key pair (prime256v1)", () => {
      const { privateKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        privateKeyEncoding: { format: "pem", type: "sec1" },
        publicKeyEncoding: { format: "pem", type: "spki" },
      });
      expectTypeOf(privateKey).toBeString();
      expect(privateKey).toContain("-----BEGIN EC PRIVATE KEY-----");

      expect(() => new NodeSigner(SAMPLE_CERT_PEM)).not.toThrow();
    });

    it("exposes a sign method on the constructed instance", () => {
      const signer = new NodeSigner(SAMPLE_CERT_PEM);
      expectTypeOf(signer.sign).toBeFunction();
    });
  });

  describe("eGS Zod schema validation", () => {
    it("eGS constructor succeeds with valid EGSUnitInfo", () => {
      expect(() => new EGS(validEGSUnitInfo)).not.toThrow();
    });

    it("eGS constructor returns instance with correct uuid", () => {
      const egs = new EGS(validEGSUnitInfo);
      expect(egs.getInfo().id).toBe(validEGSUnitInfo.id);
    });

    it("eGS constructor throws ZodValidationError when uuid is empty", () => {
      const invalid = { ...validEGSUnitInfo, id: "" };
      expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
    });

    it("eGS constructor throws ZodValidationError when VAT_number is empty", () => {
      const invalid = { ...validEGSUnitInfo, vatNumber: "" };
      expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
    });

    it("eGS constructor throws ZodValidationError when VAT_name is missing", () => {
      const invalid = { ...validEGSUnitInfo, vatName: "" };
      expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
    });

    it("zodValidationError carries typed issue path for invalid uuid", () => {
      const invalid = { ...validEGSUnitInfo, id: "" };
      try {
        new EGS(invalid as EGSUnitInfo);
        throw new Error("should have thrown ZodValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodValidationError);
        const zodErr = error as ZodValidationError;
        expect(zodErr.message).toContain("Validation failed");
        expect(zodErr.name).toBe("ZodValidationError");
        const paths = zodErr.issues.map((i) => i.path.join("."));
        expect(paths.some((p) => p.includes("id"))).toBeTruthy();
      }
    });
  });

  describe("signing flow wiring (no network)", () => {
    it("nodeSigner.sign() returns a SignatureResult shape for a built invoice", async () => {
      const { buildInvoice, prepareSigningInput } =
        await import("../../../zatca-core/src/api.js");

      const { privateKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        privateKeyEncoding: { format: "pem", type: "sec1" },
        publicKeyEncoding: { format: "pem", type: "spki" },
      });

      const now = new Date();
      const invoice = buildInvoice({
        crnNumber: "7032256278",
        egsInfo: {
          branchIndustry: "Software",
          branchName: "Main",
          id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
          model: "IOS",
          name: "EGS1",
          vatName: "Jaicome Information Technology",
          vatNumber: "311497191800003",
        },
        invoiceCode: "SIMPLIFIED",
        invoiceCounterNumber: 1,
        invoiceSerialNumber: "EGS1-886431145-101",
        invoiceType: "INVOICE",
        issueDate: now,
        lineItems: [
          {
            id: "1",
            name: "Sample Product",
            quantity: 2,
            taxExclusivePrice: 100,
            vatPercent: 0.15,
          },
        ],
        paymentMethod: "CASH",
        previousInvoiceHash:
          "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
      });

      const signingInput = prepareSigningInput(invoice);
      const signingInputWithKey = {
        ...signingInput,
        privateKeyReference: privateKey,
      };

      const signer = new NodeSigner(SAMPLE_CERT_PEM);
      const result = await signer.sign(signingInputWithKey);

      expect(result).toBeDefined();
      expectTypeOf(result.signedXml).toBeString();
      expect(result.signedXml.length).toBeGreaterThan(0);
      expectTypeOf(result.invoiceHash).toBeString();
      expect(result.invoiceHash.length).toBeGreaterThan(0);
      expectTypeOf(result.signatureValue).toBeString();
      expectTypeOf(result.signingCertificate).toBeString();
    });
  });
});
