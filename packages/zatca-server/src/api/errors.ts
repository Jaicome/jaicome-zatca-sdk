import { TaggedError } from "better-result";

import type { ValidationMessage } from "./types";

/**
 * Thrown when the HTTP request to ZATCA fails at the network level
 * (e.g. DNS failure, connection refused, or CORS error).
 *
 * @property {string} url - The URL that was requested.
 * @property {string} message - Human-readable description of the network failure.
 */
export class NetworkError extends TaggedError("NetworkError")<{
  url: string;
  message: string;
}>() {}

/**
 * Thrown when ZATCA returns a non-2xx HTTP response.
 * Provides structured access to ZATCA validation errors and warnings
 * extracted from the response body.
 *
 * @property {string} url - The URL that was requested.
 * @property {number} status - HTTP status code (e.g. `400`, `422`).
 * @property {string} statusText - HTTP status text (e.g. `'Bad Request'`).
 * @property {unknown} body - Raw parsed response body from ZATCA.
 * @property {string} message - Formatted error message including URL and status.
 */
export class ApiError extends TaggedError("ApiError")<{
  url: string;
  status: number;
  statusText: string;
  body: unknown;
  message: string;
}>() {
  constructor(args: {
    url: string;
    status: number;
    statusText: string;
    body: unknown;
  }) {
    super({
      ...args,
      message: `ZATCA API error: POST ${args.url} → ${args.status} ${args.statusText}`,
    });
  }

  private get _bodyAsValidation(): {
    validationResults?: {
      errorMessages?: ValidationMessage[];
      warningMessages?: ValidationMessage[];
    };
  } | null {
    if (typeof this.body === "object" && this.body !== null) {
      return this.body as {
        validationResults?: {
          errorMessages?: ValidationMessage[];
          warningMessages?: ValidationMessage[];
        };
      };
    }
    return null;
  }

  get validationErrors(): ValidationMessage[] {
    return this._bodyAsValidation?.validationResults?.errorMessages ?? [];
  }

  get validationWarnings(): ValidationMessage[] {
    return this._bodyAsValidation?.validationResults?.warningMessages ?? [];
  }
}

/**
 * Thrown when a ZATCA API request exceeds the configured timeout.
 *
 * @property {string} url - The URL that was requested.
 * @property {number} timeoutMs - The timeout threshold in milliseconds.
 * @property {string} message - Human-readable description of the timeout.
 */
export class TimeoutError extends TaggedError("TimeoutError")<{
  url: string;
  timeoutMs: number;
  message: string;
}>() {}

/**
 * Union of all possible ZATCA API error types.
 * Use this as the error type in `Result<T, ZatcaApiError>` returns.
 */
export type ZatcaApiError = NetworkError | ApiError | TimeoutError;
