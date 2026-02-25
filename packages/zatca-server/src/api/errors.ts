import { TaggedError } from "better-result";

import type { ValidationMessage } from "./types.js";

export class NetworkError extends TaggedError("NetworkError")<{
  url: string;
  message: string;
}>() {}

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

export class TimeoutError extends TaggedError("TimeoutError")<{
  url: string;
  timeoutMs: number;
  message: string;
}>() {}

export type ZatcaApiError = NetworkError | ApiError | TimeoutError;
