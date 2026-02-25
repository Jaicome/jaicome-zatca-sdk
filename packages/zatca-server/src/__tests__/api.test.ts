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

describe("aPI class shape", () => {
  it("compliance() returns object with issueCertificate and checkInvoiceCompliance", () => {
    const api = new API("development");
    const comp = api.compliance();
    expectTypeOf(comp.issueCertificate).toBeFunction();
    expectTypeOf(comp.checkInvoiceCompliance).toBeFunction();
  });

  it("production() returns object with issueCertificate, reportInvoice, clearanceInvoice", () => {
    const api = new API("development");
    const prod = api.production();
    expectTypeOf(prod.issueCertificate).toBeFunction();
    expectTypeOf(prod.reportInvoice).toBeFunction();
    expectTypeOf(prod.clearanceInvoice).toBeFunction();
  });
});

describe("networkError on fetch failure", () => {
  it("returns Err with _tag NetworkError when fetch throws a connection error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const api = new API("development");
    const result = await api.compliance().issueCertificate(fakeCsr, "123456");

    expect(result.isErr()).toBeTruthy();
    if (!result.isErr()) {
      throw new Error("Expected Err");
    }
    expect(result.error._tag).toBe("NetworkError");
  });
});

describe("timeoutError on AbortError", () => {
  it("returns Err with _tag TimeoutError when fetch throws an AbortError", async () => {
    const abortErr = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    mockFetch.mockRejectedValueOnce(abortErr);

    const api = new API("development");
    const result = await api.compliance().issueCertificate(fakeCsr, "123456");

    expect(result.isErr()).toBeTruthy();
    if (!result.isErr()) {
      throw new Error("Expected Err");
    }
    expect(result.error._tag).toBe("TimeoutError");
  });
});

describe("apiError on non-2xx response", () => {
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
                category: "XSD",
                code: "XSD_FAIL",
                message: "Invalid XML",
                status: "ERROR",
                type: "ERROR",
              },
            ],
          },
        }),
    });

    const api = new API("development");
    const result = await api.compliance().issueCertificate(fakeCsr, "123456");

    expect(result.isErr()).toBeTruthy();
    if (!result.isErr()) {
      throw new Error("Expected Err");
    }
    expect(result.error._tag).toBe("ApiError");

    const apiErr = result.error as ApiError;
    expect(apiErr.validationErrors).toHaveLength(1);
    expect(apiErr.validationErrors[0].code).toBe("XSD_FAIL");
  });
});

describe("ok result on successful certificate issuance", () => {
  it("returns Ok with issued_certificate, api_secret, request_id on 200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          binarySecurityToken:
            Buffer.from("FAKE_CERT_CONTENT").toString("base64"),
          requestID: "req-123",
          secret: "test-secret",
        }),
    });

    const api = new API("development");
    const result = await api.compliance().issueCertificate(fakeCsr, "123456");

    expect(result.isOk()).toBeTruthy();
    if (!result.isOk()) {
      throw new Error("Expected Ok");
    }
    expect(result.value.issued_certificate).toContain(
      "-----BEGIN CERTIFICATE-----"
    );
    expect(result.value.api_secret).toBe("test-secret");
    expect(result.value.request_id).toBe("req-123");
  });
});

describe("taggedError _tag values", () => {
  it("networkError has _tag NetworkError", () => {
    const err = new NetworkError({ message: "fail", url: "/test" });
    expect(err._tag).toBe("NetworkError");
  });

  it("timeoutError has _tag TimeoutError", () => {
    const err = new TimeoutError({
      message: "timeout",
      timeoutMs: 30_000,
      url: "/test",
    });
    expect(err._tag).toBe("TimeoutError");
  });

  it("apiError has _tag ApiError", () => {
    const err = new ApiError({
      body: {},
      status: 500,
      statusText: "ISE",
      url: "/test",
    });
    expect(err._tag).toBe("ApiError");
  });
});
