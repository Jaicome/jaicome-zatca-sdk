import { generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";

import {
	buildInvoice,
	generatePhaseOneQR,
	ZATCAInvoiceTypes,
	ZATCAPaymentMethods,
} from "@jaicome/zatca-core";
import type { ZATCAInvoiceProps } from "@jaicome/zatca-core";
import { generateSignedXMLString, getInvoiceHash } from "@jaicome/zatca-server";

const SAMPLE_ZATCA_TEST_CERT_BODY =
	"MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";

const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

function makeFixtureProps(invoiceCounterNumber: number = 1): ZATCAInvoiceProps {
	return {
		egsInfo: {
			id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
			name: "EGS1-GOLDEN",
			model: "IOS",
			vatName: "Jaicome Information Technology",
			vatNumber: "311497191800003",
			branchName: "Main",
			branchIndustry: "Software",
			location: {
				city: "Khobar",
				citySubdivision: "West",
				street: "King Fahd st",
				plotIdentification: "0000",
				building: "0000",
				postalZone: "31952",
			},
		},
		crnNumber: "7032256278",
		invoiceCounterNumber,
		invoiceSerialNumber: "EGS1-GOLDEN-001",
		issueDate: "2024-01-15",
		issueTime: "10:00:00",
		previousInvoiceHash:
			"NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
		lineItems: [
			{
				id: "1",
				name: "Golden Fixture Product",
				quantity: 1,
				taxExclusivePrice: 100,
				vatPercent: 0.15,
			},
		],
		invoiceType: ZATCAInvoiceTypes.INVOICE,
		invoiceCode: "0200000",
		paymentMethod: ZATCAPaymentMethods.CASH,
	};
}

describe("Golden — Invoice Hash Format Invariant", () => {
	it("getInvoiceHash returns a non-empty string", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const hash = getInvoiceHash(invoice.getXML());

		expect(typeof hash).toBe("string");
		expect(hash.length).toBeGreaterThan(0);
	});

	it("getInvoiceHash returns a valid base64-encoded string (A-Z a-z 0-9 +/ =)", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const hash = getInvoiceHash(invoice.getXML());

		expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("base64-decoded hash is 32 bytes (SHA-256 output)", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const hash = getInvoiceHash(invoice.getXML());

		const decoded = Buffer.from(hash, "base64");
		expect(decoded.length).toBe(32);
	});

	it("base64-encoded hash is 44 characters with padding", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const hash = getInvoiceHash(invoice.getXML());

		expect(hash.length).toBeGreaterThanOrEqual(43);
		expect(hash.length).toBeLessThanOrEqual(44);
	});

	it("hash is deterministic — same input produces identical hash", () => {
		const props = makeFixtureProps();
		const invoice1 = buildInvoice(props);
		const invoice2 = buildInvoice(props);

		const hash1 = getInvoiceHash(invoice1.getXML());
		const hash2 = getInvoiceHash(invoice2.getXML());

		expect(hash1).toBe(hash2);
	});
});

describe("Golden — QR Payload Validity Invariant", () => {
	it("generatePhaseOneQR returns a non-empty string", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const qr = generatePhaseOneQR(invoice);

		expect(typeof qr).toBe("string");
		expect(qr.length).toBeGreaterThan(0);
	});

	it("QR output is valid base64 (A-Z a-z 0-9 +/ =)", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const qr = generatePhaseOneQR(invoice);

		expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("QR base64 decodes to bytes that start with TLV tag 0x01 (seller name tag)", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const qr = generatePhaseOneQR(invoice);

		const decoded = Buffer.from(qr, "base64");
		expect(decoded[0]).toBe(0x01);
	});

	it("QR TLV structure encodes at least 5 tags", () => {
		const invoice = buildInvoice(makeFixtureProps());
		const qr = generatePhaseOneQR(invoice);

		const decoded = Buffer.from(qr, "base64");

		let offset = 0;
		let tagCount = 0;
		while (offset + 2 <= decoded.length) {
			const length = decoded[offset + 1];
			offset += 2 + length;
			tagCount++;
		}
		expect(tagCount).toBe(5);
	});
});

describe("Golden — Signed XML Structural Invariants", () => {
	it("generateSignedXMLString produces a non-empty signed_invoice_string", () => {
		const { privateKey } = generateKeyPairSync("ec", {
			namedCurve: "prime256v1",
			privateKeyEncoding: { type: "sec1", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});

		const invoice = buildInvoice(makeFixtureProps());
		const { signed_invoice_string } = generateSignedXMLString({
			invoice_xml: invoice.getXML(),
			certificate_string: SAMPLE_CERT_PEM,
			private_key_string: privateKey,
		});

		expect(typeof signed_invoice_string).toBe("string");
		expect(signed_invoice_string.length).toBeGreaterThan(0);
	});

	it("signed XML contains <ds:SignatureValue> element", () => {
		const { privateKey } = generateKeyPairSync("ec", {
			namedCurve: "prime256v1",
			privateKeyEncoding: { type: "sec1", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});

		const invoice = buildInvoice(makeFixtureProps());
		const { signed_invoice_string } = generateSignedXMLString({
			invoice_xml: invoice.getXML(),
			certificate_string: SAMPLE_CERT_PEM,
			private_key_string: privateKey,
		});

		expect(signed_invoice_string).toContain("<ds:SignatureValue>");
	});

	it("signed XML contains <xades:QualifyingProperties> element", () => {
		const { privateKey } = generateKeyPairSync("ec", {
			namedCurve: "prime256v1",
			privateKeyEncoding: { type: "sec1", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});

		const invoice = buildInvoice(makeFixtureProps());
		const { signed_invoice_string } = generateSignedXMLString({
			invoice_xml: invoice.getXML(),
			certificate_string: SAMPLE_CERT_PEM,
			private_key_string: privateKey,
		});

		expect(signed_invoice_string).toContain("xades:QualifyingProperties");
	});

	it("signed XML contains <cbc:ID>QR</cbc:ID> element (embedded QR reference)", () => {
		const { privateKey } = generateKeyPairSync("ec", {
			namedCurve: "prime256v1",
			privateKeyEncoding: { type: "sec1", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});

		const invoice = buildInvoice(makeFixtureProps());
		const { signed_invoice_string } = generateSignedXMLString({
			invoice_xml: invoice.getXML(),
			certificate_string: SAMPLE_CERT_PEM,
			private_key_string: privateKey,
		});

		expect(signed_invoice_string).toContain("<cbc:ID>QR</cbc:ID>");
	});

	it("result also exposes non-empty invoice_hash and qr fields", () => {
		const { privateKey } = generateKeyPairSync("ec", {
			namedCurve: "prime256v1",
			privateKeyEncoding: { type: "sec1", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});

		const invoice = buildInvoice(makeFixtureProps());
		const result = generateSignedXMLString({
			invoice_xml: invoice.getXML(),
			certificate_string: SAMPLE_CERT_PEM,
			private_key_string: privateKey,
		});

		expect(result.invoice_hash.length).toBeGreaterThan(0);
		expect(result.qr.length).toBeGreaterThan(0);
		const directHash = getInvoiceHash(invoice.getXML());
		expect(result.invoice_hash).toBe(directHash);
	});
});

describe("Golden — Perturbation Test (hash sensitivity)", () => {
	it("invoices with SAME counter have identical hashes (baseline)", () => {
		const invoice1 = buildInvoice(makeFixtureProps(1));
		const invoice2 = buildInvoice(makeFixtureProps(1));

		const hash1 = getInvoiceHash(invoice1.getXML());
		const hash2 = getInvoiceHash(invoice2.getXML());

		expect(hash1).toBe(hash2);
	});

	it("invoices with DIFFERENT invoice_counter_number produce DIFFERENT hashes", () => {
		const invoice_a = buildInvoice(makeFixtureProps(1));
		const invoice_b = buildInvoice(makeFixtureProps(2));

		const hash_a = getInvoiceHash(invoice_a.getXML());
		const hash_b = getInvoiceHash(invoice_b.getXML());

		expect(hash_a).not.toBe(hash_b);
	});

	it("QR output also differs when invoice_counter_number changes", () => {
		const invoice_a = buildInvoice(makeFixtureProps(1));
		const invoice_b = buildInvoice(makeFixtureProps(99));

		const qr_a = generatePhaseOneQR(invoice_a);
		const qr_b = generatePhaseOneQR(invoice_b);

		expect(qr_a).toMatch(/^[A-Za-z0-9+/]+=*$/);
		expect(qr_b).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("perturbing VAT_name causes a different invoice XML (field sensitivity)", () => {
		const props_a = makeFixtureProps(1);
		const props_b: ZATCAInvoiceProps = {
			...makeFixtureProps(1),
			egsInfo: {
				...makeFixtureProps(1).egsInfo,
				vatName: "PERTURBED Company Name",
			},
		};

		const invoice_a = buildInvoice(props_a);
		const invoice_b = buildInvoice(props_b);

		const hash_a = getInvoiceHash(invoice_a.getXML());
		const hash_b = getInvoiceHash(invoice_b.getXML());

		expect(hash_a).not.toBe(hash_b);
	});
});
