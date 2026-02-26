import { Result } from "better-result";

import { cleanUpCertificateString } from "../signing/index";
import type { ZatcaApiError } from "./errors";
import { ApiError, NetworkError, TimeoutError } from "./errors";
import { logger } from "./logger";
import type {
  CertificateResponse,
  InvoiceResponse,
  IssuedCertificate,
} from "./types";

const settings = {
  API_VERSION: "V2",
  PRODUCTION_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
  SANDBOX_BASEURL:
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  SIMULATION_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
};

/**
 * Methods available on the ZATCA compliance API endpoint.
 * Used during EGS onboarding to obtain a compliance CSID and validate invoice samples.
 */
interface ComplianceAPIInterface {
  issueCertificate: (
    csr: string,
    otp: string
  ) => Promise<Result<IssuedCertificate, ZatcaApiError>>;
  checkInvoiceCompliance: (
    signedXmlString: string,
    invoiceHash: string,
    egsId: string
  ) => Promise<Result<InvoiceResponse, ZatcaApiError>>;
}

/**
 * Methods available on the ZATCA production API endpoint.
 * Used after onboarding to report or clear invoices in production.
 */
interface ProductionAPIInterface {
  issueCertificate: (
    complianceRequestId: string
  ) => Promise<Result<IssuedCertificate, ZatcaApiError>>;
  reportInvoice: (
    signedXmlString: string,
    invoiceHash: string,
    egsId: string
  ) => Promise<Result<InvoiceResponse, ZatcaApiError>>;
  clearanceInvoice: (
    signedXmlString: string,
    invoiceHash: string,
    egsId: string
  ) => Promise<Result<InvoiceResponse, ZatcaApiError>>;
}

/**
 * Low-level HTTP client for the ZATCA Fatoora API.
 * Wraps both the compliance and production endpoints and handles authentication,
 * base URL selection, and error mapping.
 *
 * Prefer using {@link EGS} for the full onboarding and invoice lifecycle.
 * Use this class directly only when you need fine-grained control over API calls.
 *
 * @example
 * ```typescript
 * const api = new API('simulation');
 * const result = await api.compliance().issueCertificate(csrPem, '123456');
 * ```
 */
class API {
  private env: string;

  constructor(env: "production" | "simulation" | "development") {
    this.env = env;
  }

  private getAuthHeaders = (
    certificate?: string,
    secret?: string
  ): Record<string, string> => {
    if (certificate && secret) {
      const certificate_stripped = cleanUpCertificateString(certificate);
      const basic = Buffer.from(
        `${Buffer.from(certificate_stripped).toString("base64")}:${secret}`
      ).toString("base64");
      return { Authorization: `Basic ${basic}` };
    }

    return {};
  };

  private async fetchJson<T>(
    url: string,
    body: unknown,
    headers: Record<string, string>,
    timeoutMs: number = 30_000
  ): Promise<Result<T, ZatcaApiError>> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchResult = await Result.tryPromise({
        catch: (cause) => {
          if (cause instanceof Error && cause.name === "AbortError") {
            return new TimeoutError({
              message: `Request timed out after ${timeoutMs}ms`,
              timeoutMs,
              url,
            });
          }

          return new NetworkError({
            message: cause instanceof Error ? cause.message : String(cause),
            url,
          });
        },
        try: () =>
          fetch(url, {
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            method: "POST",
            signal: controller.signal,
          }),
      });

      if (fetchResult.isErr()) {
        logger.error(
          { err: fetchResult.error, url },
          "ZATCA API request failed"
        );
        return fetchResult;
      }

      const response = fetchResult.value;
      const text = await response.text();

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = text;
      }

      if (!response.ok || ![200, 202].includes(response.status)) {
        const err = new ApiError({
          body: parsedBody,
          status: response.status,
          statusText: response.statusText,
          url,
        });

        logger.error(
          { err, status: response.status, url },
          "ZATCA API error response"
        );

        return Result.err(err);
      }

      return Result.ok(parsedBody as T);
    } finally {
      clearTimeout(tid);
    }
  }

  /**
   * Returns a {@link ComplianceAPIInterface} scoped to the compliance endpoint.
   * If `certificate` and `secret` are provided, requests are authenticated
   * (required for {@link ComplianceAPIInterface.checkInvoiceCompliance}).
   *
   * @param certificate - PEM-encoded compliance CSID. Required for invoice compliance checks.
   * @param secret - API secret paired with the compliance certificate.
   */
  compliance(certificate?: string, secret?: string): ComplianceAPIInterface {
    const authHeaders = this.getAuthHeaders(certificate, secret);
    const baseUrl =
      this.env === "production"
        ? settings.PRODUCTION_BASEURL
        : this.env === "simulation"
          ? settings.SIMULATION_BASEURL
          : settings.SANDBOX_BASEURL;

    const issueCertificate = async (
      csr: string,
      otp: string
    ): Promise<Result<IssuedCertificate, ZatcaApiError>> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        OTP: otp,
        ...authHeaders,
      };

      const result = await this.fetchJson<CertificateResponse>(
        `${baseUrl}/compliance`,
        { csr: Buffer.from(csr).toString("base64") },
        headers
      );

      if (result.isErr()) {
        return result as Result<IssuedCertificate, ZatcaApiError>;
      }

      const data = result.value;
      let issued_certificate = Buffer.from(
        data.binarySecurityToken,
        "base64"
      ).toString();
      issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;

      return Result.ok({
        api_secret: data.secret,
        issued_certificate,
        request_id: data.requestID,
      }) as Result<IssuedCertificate, ZatcaApiError>;
    };

    const checkInvoiceCompliance = async (
      signedXmlString: string,
      invoiceHash: string,
      egsId: string
    ): Promise<Result<InvoiceResponse, ZatcaApiError>> => {
      const headers = {
        "Accept-Language": "en",
        "Accept-Version": settings.API_VERSION,
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/compliance/invoices`,
        {
          invoice: Buffer.from(signedXmlString).toString("base64"),
          invoiceHash: invoiceHash,
          uuid: egsId,
        },
        headers
      );

      return result as Result<InvoiceResponse, ZatcaApiError>;
    };

    return { checkInvoiceCompliance, issueCertificate };
  }

  /**
   * Returns a {@link ProductionAPIInterface} scoped to the production endpoint.
   * Requires a valid production CSID and its paired API secret for all operations.
   *
   * @param certificate - PEM-encoded production CSID.
   * @param secret - API secret paired with the production certificate.
   */
  production(certificate?: string, secret?: string): ProductionAPIInterface {
    const authHeaders = this.getAuthHeaders(certificate, secret);
    const baseUrl =
      this.env === "production"
        ? settings.PRODUCTION_BASEURL
        : this.env === "simulation"
          ? settings.SIMULATION_BASEURL
          : settings.SANDBOX_BASEURL;

    const issueCertificate = async (
      complianceRequestId: string
    ): Promise<Result<IssuedCertificate, ZatcaApiError>> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        ...authHeaders,
      };

      const result = await this.fetchJson<CertificateResponse>(
        `${baseUrl}/production/csids`,
        { compliance_request_id: complianceRequestId },
        headers
      );

      if (result.isErr()) {
        return result as Result<IssuedCertificate, ZatcaApiError>;
      }

      const data = result.value;
      let issued_certificate = Buffer.from(
        data.binarySecurityToken,
        "base64"
      ).toString();
      issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;

      return Result.ok({
        api_secret: data.secret,
        issued_certificate,
        request_id: data.requestID,
      }) as Result<IssuedCertificate, ZatcaApiError>;
    };

    const reportInvoice = async (
      signedXmlString: string,
      invoiceHash: string,
      egsId: string
    ): Promise<Result<InvoiceResponse, ZatcaApiError>> => {
      const headers = {
        "Accept-Language": "en",
        "Accept-Version": settings.API_VERSION,
        "Clearance-Status": "0",
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/invoices/reporting/single`,
        {
          invoice: Buffer.from(signedXmlString).toString("base64"),
          invoiceHash: invoiceHash,
          uuid: egsId,
        },
        headers
      );

      return result as Result<InvoiceResponse, ZatcaApiError>;
    };

    const clearanceInvoice = async (
      signedXmlString: string,
      invoiceHash: string,
      egsId: string
    ): Promise<Result<InvoiceResponse, ZatcaApiError>> => {
      const headers = {
        "Accept-Language": "en",
        "Accept-Version": settings.API_VERSION,
        "Clearance-Status": "1",
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/invoices/clearance/single`,
        {
          invoice: Buffer.from(signedXmlString).toString("base64"),
          invoiceHash: invoiceHash,
          uuid: egsId,
        },
        headers
      );

      return result as Result<InvoiceResponse, ZatcaApiError>;
    };

    return { clearanceInvoice, issueCertificate, reportInvoice };
  }
}

export default API;
export type { ComplianceAPIInterface, ProductionAPIInterface };
export type { ZatcaApiError } from "./errors";
export { ApiError, NetworkError, TimeoutError } from "./errors";
export type {
  CertificateResponse,
  InvoiceResponse,
  IssuedCertificate,
  ValidationMessage,
} from "./types";
