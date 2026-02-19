import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "crypto";
import {
	NodeSigner,
	EGS,
	ZodValidationError,
} from "@jaicome/zatca-server";
import type { EGSUnitInfo } from "@jaicome/zatca-server";

const SAMPLE_ZATCA_TEST_CERT_BODY =
	"MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";

const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

const validEGSUnitInfo: EGSUnitInfo = {
	uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
	custom_id: "EGS1",
	model: "IOS",
	CRN_number: "7032256278",
	VAT_name: "Jaicome Information Technology",
	VAT_number: "311497191800003",
	branch_name: "Main",
	branch_industry: "Software",
};

describe("@jaicome/zatca-server — end-to-end", () => {
	describe("NodeSigner construction", () => {
		it("constructs without throwing when given a real PEM certificate", () => {
			expect(() => new NodeSigner(SAMPLE_CERT_PEM)).not.toThrow();
		});

		it("constructs with a dynamically generated EC key pair (prime256v1)", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			expect(typeof privateKey).toBe("string");
			expect(privateKey).toContain("-----BEGIN EC PRIVATE KEY-----");

			expect(() => new NodeSigner(SAMPLE_CERT_PEM)).not.toThrow();
		});

		it("exposes a sign method on the constructed instance", () => {
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			expect(typeof signer.sign).toBe("function");
		});
	});

	describe("EGS Zod schema validation", () => {
		it("EGS constructor succeeds with valid EGSUnitInfo", () => {
			expect(() => new EGS(validEGSUnitInfo)).not.toThrow();
		});

		it("EGS constructor returns instance with correct uuid", () => {
			const egs = new EGS(validEGSUnitInfo);
			expect(egs.get().uuid).toBe(validEGSUnitInfo.uuid);
		});

		it("EGS constructor throws ZodValidationError when uuid is empty", () => {
			const invalid = { ...validEGSUnitInfo, uuid: "" };
			expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
		});

		it("EGS constructor throws ZodValidationError when VAT_number is empty", () => {
			const invalid = { ...validEGSUnitInfo, VAT_number: "" };
			expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
		});

		it("EGS constructor throws ZodValidationError when VAT_name is missing", () => {
			const invalid = { ...validEGSUnitInfo, VAT_name: "" };
			expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
		});

		it("ZodValidationError carries typed issue path for invalid uuid", () => {
			const invalid = { ...validEGSUnitInfo, uuid: "" };
			try {
				new EGS(invalid as EGSUnitInfo);
				expect.fail("should have thrown ZodValidationError");
			} catch (err) {
				expect(err).toBeInstanceOf(ZodValidationError);
				const zodErr = err as ZodValidationError;
				expect(zodErr.message).toContain("Validation failed");
				expect(zodErr.name).toBe("ZodValidationError");
				const paths = zodErr.issues.map((i) => i.path.join("."));
				expect(paths.some((p) => p.includes("uuid"))).toBe(true);
			}
		});
	});

	describe("signing flow wiring (no network)", () => {
		it("NodeSigner.sign() returns a SignatureResult shape for a built invoice", async () => {
			const {
				buildInvoice,
				prepareSigningInput,
				ZATCAInvoiceTypes,
				ZATCAPaymentMethods,
			} = await import("@jaicome/zatca-core");

			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});

			const now = new Date();
			const invoice = buildInvoice({
				egs_info: {
					uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
					custom_id: "EGS1",
					model: "IOS",
					CRN_number: "7032256278",
					VAT_name: "Jaicome Information Technology",
					VAT_number: "311497191800003",
					branch_name: "Main",
					branch_industry: "Software",
				},
				invoice_counter_number: 1,
				invoice_serial_number: "EGS1-886431145-101",
				issue_date: now.toISOString().split("T")[0],
				issue_time: now.toISOString().split("T")[1].slice(0, 8),
				previous_invoice_hash:
					"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
				line_items: [
					{
						id: "1",
						name: "Sample Product",
						quantity: 2,
						tax_exclusive_price: 100,
						VAT_percent: 0.15,
					},
				],
				invoice_type: ZATCAInvoiceTypes.INVOICE,
				invoice_code: "0200000",
				payment_method: ZATCAPaymentMethods.CASH,
			});

			const signingInput = prepareSigningInput(invoice);
			const signingInputWithKey = {
				...signingInput,
				privateKeyReference: privateKey,
			};

			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			const result = await signer.sign(signingInputWithKey);

			expect(result).toBeDefined();
			expect(typeof result.signedXml).toBe("string");
			expect(result.signedXml.length).toBeGreaterThan(0);
			expect(typeof result.invoiceHash).toBe("string");
			expect(result.invoiceHash.length).toBeGreaterThan(0);
			expect(typeof result.signatureValue).toBe("string");
			expect(typeof result.signingCertificate).toBe("string");
		});
	});
});
