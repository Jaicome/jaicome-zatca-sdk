import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import API, { ApiError, NetworkError, TimeoutError } from "../api/index.js";

const fakeCsr =
	"-----BEGIN CERTIFICATE REQUEST-----\nFAKE_CSR_CONTENT\n-----END CERTIFICATE REQUEST-----";

const mockFetch = vi.fn();

beforeEach(() => {
	globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
	vi.clearAllMocks();
	mockFetch.mockReset();
});


describe("API class shape", () => {
	it("compliance() returns object with issueCertificate and checkInvoiceCompliance", () => {
		const api = new API("development");
		const comp = api.compliance();
		expect(typeof comp.issueCertificate).toBe("function");
		expect(typeof comp.checkInvoiceCompliance).toBe("function");
	});

	it("production() returns object with issueCertificate, reportInvoice, clearanceInvoice", () => {
		const api = new API("development");
		const prod = api.production();
		expect(typeof prod.issueCertificate).toBe("function");
		expect(typeof prod.reportInvoice).toBe("function");
		expect(typeof prod.clearanceInvoice).toBe("function");
	});
});


describe("NetworkError on fetch failure", () => {
	it("returns Err with _tag NetworkError when fetch throws a connection error", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

		const api = new API("development");
		const result = await api.compliance().issueCertificate(fakeCsr, "123456");

		expect(result.isErr()).toBe(true);
		if (!result.isErr()) throw new Error("Expected Err");
		expect(result.error._tag).toBe("NetworkError");
	});
});


describe("TimeoutError on AbortError", () => {
	it("returns Err with _tag TimeoutError when fetch throws an AbortError", async () => {
		const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
		mockFetch.mockRejectedValueOnce(abortErr);

		const api = new API("development");
		const result = await api.compliance().issueCertificate(fakeCsr, "123456");

		expect(result.isErr()).toBe(true);
		if (!result.isErr()) throw new Error("Expected Err");
		expect(result.error._tag).toBe("TimeoutError");
	});
});


describe("ApiError on non-2xx response", () => {
	it("returns Err with _tag ApiError and exposes validationErrors on 400 response", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			statusText: "Bad Request",
			text: async () =>
				JSON.stringify({
					validationResults: {
						errorMessages: [
							{
								type: "ERROR",
								code: "XSD_FAIL",
								category: "XSD",
								message: "Invalid XML",
								status: "ERROR",
							},
						],
					},
				}),
		});

		const api = new API("development");
		const result = await api.compliance().issueCertificate(fakeCsr, "123456");

		expect(result.isErr()).toBe(true);
		if (!result.isErr()) throw new Error("Expected Err");
		expect(result.error._tag).toBe("ApiError");

		const apiErr = result.error as ApiError;
		expect(apiErr.validationErrors.length).toBe(1);
		expect(apiErr.validationErrors[0].code).toBe("XSD_FAIL");
	});
});


describe("Ok result on successful certificate issuance", () => {
	it("returns Ok with issued_certificate, api_secret, request_id on 200 response", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			statusText: "OK",
			text: async () =>
				JSON.stringify({
					binarySecurityToken: Buffer.from("FAKE_CERT_CONTENT").toString("base64"),
					secret: "test-secret",
					requestID: "req-123",
				}),
		});

		const api = new API("development");
		const result = await api.compliance().issueCertificate(fakeCsr, "123456");

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) throw new Error("Expected Ok");
		expect(result.value.issued_certificate).toContain("-----BEGIN CERTIFICATE-----");
		expect(result.value.api_secret).toBe("test-secret");
		expect(result.value.request_id).toBe("req-123");
	});
});


describe("TaggedError _tag values", () => {
	it("NetworkError has _tag NetworkError", () => {
		const err = new NetworkError({ url: "/test", message: "fail" });
		expect(err._tag).toBe("NetworkError");
	});

	it("TimeoutError has _tag TimeoutError", () => {
		const err = new TimeoutError({ url: "/test", timeoutMs: 30000, message: "timeout" });
		expect(err._tag).toBe("TimeoutError");
	});

	it("ApiError has _tag ApiError", () => {
		const err = new ApiError({ url: "/test", status: 500, statusText: "ISE", body: {} });
		expect(err._tag).toBe("ApiError");
	});
});
