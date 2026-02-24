import { generateKeyPairSync } from "node:crypto";
import {
	buildInvoice,
	prepareSigningInput,
	XMLDocument,
	ZATCAInvoiceTypes,
	ZATCAPaymentMethods,
} from "@jaicome/zatca-core";
import { describe, expect, it } from "vitest";
import {
	cleanUpCertificateString,
	cleanUpPrivateKeyString,
	createInvoiceDigitalSignature,
	generateSignedXMLString,
	getCertificateHash,
	getCertificateInfo,
	getInvoiceHash,
	NodeSigner,
} from "../signing/index.js";

const SAMPLE_ZATCA_TEST_CERT_BODY =
	"MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";
const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

function buildTestInvoiceXml(price = 100): string {
	const invoice = buildInvoice({
		egsInfo: {
			id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
			name: "SIGN-TEST",
			model: "IOS",
			vatName: "Signing Test Co",
			vatNumber: "311497191800003",
			branchName: "Main",
			branchIndustry: "Software",
		},
		crnNumber: "7032256278",
		invoiceCounterNumber: 1,
		invoiceSerialNumber: "SIGN-001",
		issueDate: "2024-01-15",
		issueTime: "10:00:00",
		previousInvoiceHash:
			"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
		lineItems: [{ id: "1", name: "P", quantity: 1, taxExclusivePrice: price, vatPercent: 0.15 }],
		invoiceType: ZATCAInvoiceTypes.INVOICE,
		invoiceCode: "0200000",
		paymentMethod: ZATCAPaymentMethods.CASH,
	});

	return invoice.getXML().toString({});
}

function buildInvoiceForSigning() {
	return buildInvoice({
		egsInfo: {
			id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
			name: "SIGN-TEST",
			model: "IOS",
			vatName: "Signing Test Co",
			vatNumber: "311497191800003",
			branchName: "Main",
			branchIndustry: "Software",
		},
		crnNumber: "7032256278",
		invoiceCounterNumber: 1,
		invoiceSerialNumber: "SIGN-001",
		issueDate: "2024-01-15",
		issueTime: "10:00:00",
		previousInvoiceHash:
			"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
		lineItems: [{ id: "1", name: "P", quantity: 1, taxExclusivePrice: 100, vatPercent: 0.15 }],
		invoiceType: ZATCAInvoiceTypes.INVOICE,
		invoiceCode: "0200000",
		paymentMethod: ZATCAPaymentMethods.CASH,
	});
}

describe("signing adversarial coverage", () => {
	describe("cleanUpCertificateString", () => {
		it("removes certificate headers and footers", () => {
			const cleaned = cleanUpCertificateString(SAMPLE_CERT_PEM);
			expect(cleaned).not.toContain("BEGIN CERTIFICATE");
			expect(cleaned).not.toContain("END CERTIFICATE");
		});

		it("returns the same string when no PEM wrappers exist", () => {
			const bodyOnly = "abc123";
			expect(cleanUpCertificateString(bodyOnly)).toBe(bodyOnly);
		});

		it("returns empty for empty string input", () => {
			expect(cleanUpCertificateString("")).toBe("");
		});

		it("extracts known fixture body exactly", () => {
			expect(cleanUpCertificateString(SAMPLE_CERT_PEM)).toBe(SAMPLE_ZATCA_TEST_CERT_BODY);
		});
	});

	describe("cleanUpPrivateKeyString", () => {
		it("removes EC private key wrappers", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});

			const cleaned = cleanUpPrivateKeyString(privateKey);
			expect(cleaned).not.toContain("BEGIN EC PRIVATE KEY");
			expect(cleaned).not.toContain("END EC PRIVATE KEY");
		});

		it("returns unchanged when no wrappers exist", () => {
			expect(cleanUpPrivateKeyString("abc123")).toBe("abc123");
		});

		it("returns empty for empty key", () => {
			expect(cleanUpPrivateKeyString("")).toBe("");
		});
	});

	describe("getInvoiceHash", () => {
		it("returns deterministic hash for identical XML", () => {
			const xml = new XMLDocument(buildTestInvoiceXml());
			const hash1 = getInvoiceHash(xml);
			const hash2 = getInvoiceHash(xml);
			expect(hash1).toBe(hash2);
		});

		it("returns different hash when invoice content changes", () => {
			const hash1 = getInvoiceHash(new XMLDocument(buildTestInvoiceXml(100)));
			const hash2 = getInvoiceHash(new XMLDocument(buildTestInvoiceXml(101)));
			expect(hash1).not.toBe(hash2);
		});

		it("returns base64 encoded data", () => {
			const hash = getInvoiceHash(new XMLDocument(buildTestInvoiceXml()));
			expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it("decodes to 32 bytes (sha256)", () => {
			const hash = getInvoiceHash(new XMLDocument(buildTestInvoiceXml()));
			expect(Buffer.from(hash, "base64")).toHaveLength(32);
		});
	});

	describe("getCertificateHash", () => {
		it("returns non-empty base64 hash for valid body", () => {
			const hash = getCertificateHash(SAMPLE_ZATCA_TEST_CERT_BODY);
			expect(hash.length).toBeGreaterThan(0);
			expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it("returns deterministic hash for same body", () => {
			const hash1 = getCertificateHash(SAMPLE_ZATCA_TEST_CERT_BODY);
			const hash2 = getCertificateHash(SAMPLE_ZATCA_TEST_CERT_BODY);
			expect(hash1).toBe(hash2);
		});

		it("handles empty string input without throwing", () => {
			expect(() => getCertificateHash("")).not.toThrow();
			expect(getCertificateHash("")).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it("certificate hash decodes to 64-char SHA-256 hex text", () => {
			const hash = getCertificateHash(SAMPLE_ZATCA_TEST_CERT_BODY);
			const decoded = Buffer.from(hash, "base64").toString("utf8");
			expect(decoded).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	describe("getCertificateInfo", () => {
		it("returns hash, issuer, serial number, public key, and signature", () => {
			const info = getCertificateInfo(SAMPLE_CERT_PEM);
			expect(typeof info.hash).toBe("string");
			expect(typeof info.issuer).toBe("string");
			expect(typeof info.serial_number).toBe("string");
			expect(Buffer.isBuffer(info.public_key)).toBe(true);
			expect(Buffer.isBuffer(info.signature)).toBe(true);
		});

		it("formats issuer as comma-separated text", () => {
			const info = getCertificateInfo(SAMPLE_CERT_PEM);
			expect(info.issuer).toContain(", ");
		});

		it("returns decimal serial number string", () => {
			const info = getCertificateInfo(SAMPLE_CERT_PEM);
			expect(info.serial_number).toMatch(/^\d+$/);
		});

		it("throws for invalid certificate input", () => {
			expect(() => getCertificateInfo("not-a-certificate")).toThrow();
		});
	});

	describe("createInvoiceDigitalSignature", () => {
		it("valid hash + key returns base64 signature", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			const hash = getInvoiceHash(new XMLDocument(buildTestInvoiceXml()));
			const sig = createInvoiceDigitalSignature(hash, privateKey);
			expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it("same hash + key returns valid signatures across repeated calls", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			const hash = getInvoiceHash(new XMLDocument(buildTestInvoiceXml()));
			const sig1 = createInvoiceDigitalSignature(hash, privateKey);
			const sig2 = createInvoiceDigitalSignature(hash, privateKey);
			expect(sig1).toMatch(/^[A-Za-z0-9+/]+=*$/);
			expect(sig2).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it("throws for invalid private key", () => {
			expect(() => createInvoiceDigitalSignature("aGFzaA==", "not-a-key")).toThrow();
		});

		it("different hashes produce different signatures with same key", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});

			const sig1 = createInvoiceDigitalSignature("aGFzaDE=", privateKey);
			const sig2 = createInvoiceDigitalSignature("aGFzaDI=", privateKey);
			expect(sig1).not.toBe(sig2);
		});
	});

	describe("NodeSigner construction", () => {
		it("constructs with valid PEM certificate", () => {
			expect(() => new NodeSigner(SAMPLE_CERT_PEM)).not.toThrow();
		});

		it("constructs with empty certificate string", () => {
			expect(() => new NodeSigner("")).not.toThrow();
		});

		it("constructs with random string certificate", () => {
			expect(() => new NodeSigner("random-text")).not.toThrow();
		});

		it("exposes sign function", () => {
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			expect(typeof signer.sign).toBe("function");
		});
	});

	describe("NodeSigner.sign", () => {
		it("returns SignatureResult shape for valid input", async () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			const signingInput = {
				...prepareSigningInput(buildInvoiceForSigning()),
				privateKeyReference: privateKey,
			};

			const result = await signer.sign(signingInput);
			expect(typeof result.signedXml).toBe("string");
			expect(typeof result.invoiceHash).toBe("string");
			expect(typeof result.signatureValue).toBe("string");
			expect(typeof result.signingCertificate).toBe("string");
		});

		it("includes ds:SignatureValue in signed XML", async () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			const signingInput = {
				...prepareSigningInput(buildInvoiceForSigning()),
				privateKeyReference: privateKey,
			};

			const result = await signer.sign(signingInput);
			expect(result.signedXml).toContain("<ds:SignatureValue>");
		});

		it("returns signatureValue that matches embedded XML signature", async () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			const signingInput = {
				...prepareSigningInput(buildInvoiceForSigning()),
				privateKeyReference: privateKey,
			};

			const result = await signer.sign(signingInput);
			const match = result.signedXml.match(
				/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/,
			);

			expect(match).not.toBeNull();
			expect(match?.[1]).toBe(result.signatureValue);
		});

		it("rejects when private key is invalid", async () => {
			const signer = new NodeSigner(SAMPLE_CERT_PEM);
			const signingInput = {
				...prepareSigningInput(buildInvoiceForSigning()),
				privateKeyReference: "not-a-key",
			};

			await expect(signer.sign(signingInput)).rejects.toThrow();
		});
	});

	describe("generateSignedXMLString", () => {
		it("returns signed invoice XML, invoice hash, and QR", () => {
			const { privateKey } = generateKeyPairSync("ec", {
				namedCurve: "prime256v1",
				privateKeyEncoding: { type: "sec1", format: "pem" },
				publicKeyEncoding: { type: "spki", format: "pem" },
			});

			const invoiceXml = new XMLDocument(buildTestInvoiceXml());
			const result = generateSignedXMLString({
				invoice_xml: invoiceXml,
				certificate_string: SAMPLE_CERT_PEM,
				private_key_string: privateKey,
			});

			expect(typeof result.signed_invoice_string).toBe("string");
			expect(typeof result.invoice_hash).toBe("string");
			expect(typeof result.qr).toBe("string");
		});

		it("throws when key is invalid", () => {
			const invoiceXml = new XMLDocument(buildTestInvoiceXml());
			expect(() =>
				generateSignedXMLString({
					invoice_xml: invoiceXml,
					certificate_string: SAMPLE_CERT_PEM,
					private_key_string: "invalid-key",
				})
			).toThrow();
		});
	});
});
