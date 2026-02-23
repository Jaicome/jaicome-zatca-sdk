import { TaggedError } from "better-result";

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

  get validationErrors() {
    const body = this.body as any;
    return body?.validationResults?.errorMessages ?? [];
  }

  get validationWarnings() {
    const body = this.body as any;
    return body?.validationResults?.warningMessages ?? [];
  }
}

export class TimeoutError extends TaggedError("TimeoutError")<{
  url: string;
  timeoutMs: number;
  message: string;
}>() {}

export type ZatcaApiError = NetworkError | ApiError | TimeoutError;
