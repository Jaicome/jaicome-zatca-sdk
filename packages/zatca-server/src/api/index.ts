import { Result } from "better-result";
import { cleanUpCertificateString } from "../signing/index.js";
import {
  ApiError,
  NetworkError,
  TimeoutError,
  type ZatcaApiError,
} from "./errors.js";
import { logger } from "./logger.js";
import type {
  CertificateResponse,
  InvoiceResponse,
  IssuedCertificate,
} from "./types.js";

const settings = {
  API_VERSION: "V2",
  SANDBOX_BASEURL:
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  SIMULATION_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  PRODUCTION_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

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
    timeoutMs: number = 30000
  ): Promise<Result<T, ZatcaApiError>> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchResult = await Result.tryPromise({
        try: () =>
          fetch(url, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(body),
          }),
        catch: (cause) => {
          if (cause instanceof Error && cause.name === "AbortError") {
            return new TimeoutError({
              url,
              timeoutMs,
              message: `Request timed out after ${timeoutMs}ms`,
            });
          }

          return new NetworkError({
            url,
            message: cause instanceof Error ? cause.message : String(cause),
          });
        },
      });

      if (fetchResult.isErr()) {
        logger.error({ err: fetchResult.error, url }, "ZATCA API request failed");
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
          url,
          status: response.status,
          statusText: response.statusText,
          body: parsedBody,
        });

        logger.error(
          { err, url, status: response.status },
          "ZATCA API error response"
        );

        return Result.err(err);
      }

      return Result.ok(parsedBody as T);
    } finally {
      clearTimeout(tid);
    }
  }

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
        issued_certificate,
        api_secret: data.secret,
        request_id: data.requestID,
      }) as Result<IssuedCertificate, ZatcaApiError>;
    };

    const checkInvoiceCompliance = async (
      signedXmlString: string,
      invoiceHash: string,
      egsId: string
    ): Promise<Result<InvoiceResponse, ZatcaApiError>> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        "Accept-Language": "en",
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/compliance/invoices`,
        {
          invoiceHash: invoiceHash,
          uuid: egsId,
          invoice: Buffer.from(signedXmlString).toString("base64"),
        },
        headers
      );

      return result as Result<InvoiceResponse, ZatcaApiError>;
    };

    return { issueCertificate, checkInvoiceCompliance };
  }

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
        issued_certificate,
        api_secret: data.secret,
        request_id: data.requestID,
      }) as Result<IssuedCertificate, ZatcaApiError>;
    };

    const reportInvoice = async (
      signedXmlString: string,
      invoiceHash: string,
      egsId: string
    ): Promise<Result<InvoiceResponse, ZatcaApiError>> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        "Accept-Language": "en",
        "Clearance-Status": "0",
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/invoices/reporting/single`,
        {
          invoiceHash: invoiceHash,
          uuid: egsId,
          invoice: Buffer.from(signedXmlString).toString("base64"),
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
        "Accept-Version": settings.API_VERSION,
        "Accept-Language": "en",
        "Clearance-Status": "1",
        ...authHeaders,
      };

      const result = await this.fetchJson<InvoiceResponse>(
        `${baseUrl}/invoices/clearance/single`,
        {
          invoiceHash: invoiceHash,
          uuid: egsId,
          invoice: Buffer.from(signedXmlString).toString("base64"),
        },
        headers
      );

      return result as Result<InvoiceResponse, ZatcaApiError>;
    };

    return { issueCertificate, reportInvoice, clearanceInvoice };
  }
}

export default API;
export type { ComplianceAPIInterface, ProductionAPIInterface };
export { ApiError, NetworkError, TimeoutError } from "./errors.js";
export type { ZatcaApiError } from "./errors.js";
export type {
  CertificateResponse,
  InvoiceResponse,
  IssuedCertificate,
  ValidationMessage,
  OnboardResult,
  SingleReportResult,
  BatchReportResult,
  ClientInvoiceRecord,
} from "./types.js";
