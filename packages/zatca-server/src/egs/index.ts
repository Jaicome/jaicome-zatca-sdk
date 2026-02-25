import { spawn } from "node:child_process";
import fs from "node:fs";

import type {
  EGSInfo,
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "@jaicome/zatca-core";
import {
  EGSInfoSchema,
  GENESIS_PREVIOUS_INVOICE_HASH,
  ZATCAInvoice,
  ZodValidationError,
} from "@jaicome/zatca-core";
import { Result } from "better-result";
import { v4 as uuidv4 } from "uuid";

import API from "../api/index.js";
import type { ZatcaApiError, InvoiceResponse } from "../api/index.js";
import { generateSignedXMLString } from "../signing/index.js";

const CSR_TEMPLATE = `
# ------------------------------------------------------------------
# Default section for "req" command options
# ------------------------------------------------------------------
[req]

# Password for reading in existing private key file
# input_password = SET_PRIVATE_KEY_PASS

# Prompt for DN field values and CSR attributes in ASCII
prompt = no
utf8 = no

# Section pointer for DN field options
distinguished_name = my_req_dn_prompt

# Extensions
req_extensions = v3_req

[ v3_req ]
#basicConstraints=CA:FALSE
#keyUsage = digitalSignature, keyEncipherment
# Production or Testing Template (TSTZATCA-Code-Signing - ZATCA-Code-Signing)
1.3.6.1.4.1.311.20.2 = ASN1:UTF8String:SET_PRODUCTION_VALUE
subjectAltName=dirName:dir_sect

[ dir_sect ]
# EGS Serial number (1-SolutionName|2-ModelOrVersion|3-serialNumber)
SN = SET_EGS_SERIAL_NUMBER
# VAT Registration number of TaxPayer (Organization identifier [15 digits begins with 3 and ends with 3])
UID = SET_VAT_REGISTRATION_NUMBER
# Invoice type (TSCZ)(1 = supported, 0 not supported) (Tax, Simplified, future use, future use)
title = 1100
# Location (branch address or website)
registeredAddress = SET_BRANCH_LOCATION
# Industry (industry sector name)
businessCategory = SET_BRANCH_INDUSTRY

# ------------------------------------------------------------------
# Section for prompting DN field values to create "subject"
# ------------------------------------------------------------------
[my_req_dn_prompt]
# Common name (EGS TaxPayer PROVIDED ID [FREE TEXT])
commonName = SET_COMMON_NAME

# Organization Unit (Branch name)
organizationalUnitName = SET_BRANCH_NAME

# Organization name (Tax payer name)
organizationName = SET_TAXPAYER_NAME

# ISO2 country code is required with US as default
countryName = SA
`;

interface CSRConfigProps {
  privateKeyPass?: string;
  production?: boolean;
  egsModel: string;
  egsSerialNumber: string;
  solutionName: string;
  vatNumber: string;
  branchLocation: string;
  branchIndustry: string;
  branchName: string;
  taxpayerName: string;
  taxpayerProvidedId: string;
}

const buildCSRConfig = (props: CSRConfigProps): string => {
  let t = CSR_TEMPLATE;
  t = t.replace(
    "SET_PRIVATE_KEY_PASS",
    props.privateKeyPass ?? "SET_PRIVATE_KEY_PASS"
  );
  t = t.replace(
    "SET_PRODUCTION_VALUE",
    props.production ? "ZATCA-Code-Signing" : "PREZATCA-Code-Signing"
  );
  t = t.replace(
    "SET_EGS_SERIAL_NUMBER",
    `1-${props.solutionName}|2-${props.egsModel}|3-${props.egsSerialNumber}`
  );
  t = t.replace("SET_VAT_REGISTRATION_NUMBER", props.vatNumber);
  t = t.replace("SET_BRANCH_LOCATION", props.branchLocation);
  t = t.replace("SET_BRANCH_INDUSTRY", props.branchIndustry);
  t = t.replace("SET_COMMON_NAME", props.taxpayerProvidedId);
  t = t.replace("SET_BRANCH_NAME", props.branchName);
  t = t.replace("SET_TAXPAYER_NAME", props.taxpayerName);
  return t;
};

/**
 * Identifies which ZATCA compliance check scenario an invoice covers.
 * ZATCA requires passing all six scenarios before a production CSID is issued.
 *
 * - `standard-compliant` — a standard (B2B) tax invoice
 * - `standard-credit-note-compliant` — a standard credit note
 * - `standard-debit-note-compliant` — a standard debit note
 * - `simplified-compliant` — a simplified (B2C) tax invoice
 * - `simplified-credit-note-compliant` — a simplified credit note
 * - `simplified-debit-note-compliant` — a simplified debit note
 */
export type ZATCAComplianceStep =
  | "standard-compliant"
  | "standard-credit-note-compliant"
  | "standard-debit-note-compliant"
  | "simplified-compliant"
  | "simplified-credit-note-compliant"
  | "simplified-debit-note-compliant";

/**
 * The signed invoice data required for a single ZATCA compliance check.
 *
 * @property {string} signedInvoiceString - Base64-encoded signed UBL XML string.
 * @property {string} invoiceHash - SHA-256 hash of the canonical invoice XML, base64-encoded.
 */
export interface ComplianceCheckPayload {
  signedInvoiceString: string;
  invoiceHash: string;
}

/**
 * The full set of compliance steps ZATCA requires before issuing a production CSID.
 * Pass all six payloads to {@link EGS.runComplianceChecksForProduction} to satisfy
 * the onboarding requirement.
 */
export const REQUIRED_COMPLIANCE_STEPS: readonly ZATCAComplianceStep[] = [
  "standard-compliant",
  "standard-credit-note-compliant",
  "standard-debit-note-compliant",
  "simplified-compliant",
  "simplified-credit-note-compliant",
  "simplified-debit-note-compliant",
];

const COMPLIANCE_ONBOARDING_STEP_ORDER: readonly ZATCAComplianceStep[] = [
  "standard-debit-note-compliant",
  "standard-compliant",
  "standard-credit-note-compliant",
  "simplified-debit-note-compliant",
  "simplified-compliant",
  "simplified-credit-note-compliant",
];

const COMPLIANCE_ONBOARDING_LINE_ITEMS: ZATCAInvoiceLineItem[] = [
  {
    discounts: [{ amount: 1, reason: "discount" }],
    id: "1",
    name: "TEST NAME",
    quantity: 44,
    taxExclusivePrice: 22,
    vatPercent: 0.15,
  },
  {
    discounts: [{ amount: 2, reason: "discount" }],
    id: "2",
    name: "TEST NAME 1",
    quantity: 10,
    taxExclusivePrice: 5,
    vatPercent: 0.05,
  },
  {
    id: "3",
    name: "TEST NAME 2",
    quantity: 10,
    taxExclusivePrice: 5,
    vatCategory: {
      code: "Z",
      reason: "Supply of a qualifying means of transport",
      reasonCode: "VATEX-SA-34-4",
    },
    vatPercent: 0,
  },
];

const buildComplianceInvoicePropsForStep = (
  info: EGSInfo,
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string,
  issueDate: Date
): ZATCAInvoiceProps => {
  const issueTime = `${issueDate.toISOString().split("T")[1].slice(0, 8)}Z`;
  const invoiceSerialNumber = `EGS1-886431145-${100 + invoiceCounterNumber}`;

  const shared = {
    crnNumber: "7032256278",
    customerInfo: {
      building: "00",
      buyerName: "S7S",
      city: "jeddah",
      citySubdivision: "ssss",
      customerCrnNumber: "7052156278",
      postalZone: "00000",
      street: "__",
      vatNumber: "311498192800003",
    },
    egsInfo: info,
    invoiceCounterNumber,
    invoiceSerialNumber,
    issueDate,
    issueTime,
    lineItems: COMPLIANCE_ONBOARDING_LINE_ITEMS,
    previousInvoiceHash,
  };

  if (step === "standard-compliant") {
    return {
      ...shared,
      actualDeliveryDate: issueDate,
      invoiceCode: "STANDARD",
      invoiceType: "INVOICE",
    } as unknown as ZATCAInvoiceProps;
  }

  if (step === "simplified-compliant") {
    return {
      ...shared,
      actualDeliveryDate: issueDate,
      invoiceCode: "SIMPLIFIED",
      invoiceType: "INVOICE",
    } as unknown as ZATCAInvoiceProps;
  }

  if (step === "standard-credit-note-compliant") {
    return {
      ...shared,
      cancelation: {
        canceledSerialInvoiceNumber,
        paymentMethod: "CASH",
        reason: "Compliance onboarding reference",
      },
      invoiceCode: "STANDARD",
      invoiceType: "CREDIT_NOTE",
    } as unknown as ZATCAInvoiceProps;
  }

  if (step === "standard-debit-note-compliant") {
    return {
      ...shared,
      cancelation: {
        canceledSerialInvoiceNumber,
        paymentMethod: "CASH",
        reason: "Compliance onboarding reference",
      },
      invoiceCode: "STANDARD",
      invoiceType: "DEBIT_NOTE",
    } as unknown as ZATCAInvoiceProps;
  }

  if (step === "simplified-credit-note-compliant") {
    return {
      ...shared,
      cancelation: {
        canceledSerialInvoiceNumber,
        paymentMethod: "CASH",
        reason: "Compliance onboarding reference",
      },
      invoiceCode: "SIMPLIFIED",
      invoiceType: "CREDIT_NOTE",
    } as unknown as ZATCAInvoiceProps;
  }

  return {
    ...shared,
    cancelation: {
      canceledSerialInvoiceNumber,
      paymentMethod: "CASH",
      reason: "Compliance onboarding reference",
    },
    invoiceCode: "SIMPLIFIED",
    invoiceType: "DEBIT_NOTE",
  } as unknown as ZATCAInvoiceProps;
};

export interface OnboardOptions {
  solutionName: string;
  otp: string;
}

export interface OnboardResult {
  productionCertificate: string;
  productionApiSecret: string;
  privateKey: string;
  lastInvoiceHash: string;
  nextInvoiceCounter: number;
}

const OpenSSL = (cmd: string[]): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    try {
      const command = spawn("openssl", cmd);
      let result = "";
      command.stdout.on("data", (data) => {
        result += data.toString();
      });
      command.on("close", (_code: number) => resolve(result));
      command.on("error", (error: Error) => reject(error));
    } catch (error: unknown) {
      reject(error);
    }
  });

const generatePrime256v1KeyPair = async (): Promise<string> => {
  const result = await OpenSSL(["ecparam", "-name", "prime256v1", "-genkey"]);
  if (!result.includes("-----BEGIN EC PRIVATE KEY-----")) {
    throw new Error("Error no private key found in OpenSSL output.");
  }

  const private_key: string =
    `-----BEGIN EC PRIVATE KEY-----${result.split("-----BEGIN EC PRIVATE KEY-----")[1]}`.trim();
  return private_key;
};

const generateCSR = async (
  info: EGSInfo,
  privateKey: string,
  production: boolean,
  solution_name: string
): Promise<string> => {
  if (!privateKey) {
    throw new Error("EGS has no private key");
  }

  const private_key_file = `${process.env.TEMP_FOLDER ?? "/tmp/"}${uuidv4()}.pem`;
  const csr_config_file = `${process.env.TEMP_FOLDER ?? "/tmp/"}${uuidv4()}.cnf`;
  fs.writeFileSync(private_key_file, privateKey);
  fs.writeFileSync(
    csr_config_file,
    buildCSRConfig({
      branchIndustry: info.branchIndustry,
      branchLocation: `${info.location?.building} ${info.location?.street}, ${info.location?.city}`,
      branchName: info.branchName,
      egsModel: info.model,
      egsSerialNumber: info.id,
      production: production,
      solutionName: solution_name,
      taxpayerName: info.vatName,
      taxpayerProvidedId: info.name,
      vatNumber: info.vatNumber,
    })
  );

  const cleanUp = () => {
    fs.unlink(private_key_file, () => {});
    fs.unlink(csr_config_file, () => {});
  };

  try {
    const result = await OpenSSL([
      "req",
      "-new",
      "-sha256",
      "-key",
      private_key_file,
      "-config",
      csr_config_file,
    ]);
    if (!result.includes("-----BEGIN CERTIFICATE REQUEST-----")) {
      throw new Error("Error no CSR found in OpenSSL output.");
    }

    const csr: string =
      `-----BEGIN CERTIFICATE REQUEST-----${result.split("-----BEGIN CERTIFICATE REQUEST-----")[1]}`.trim();
    cleanUp();
    return csr;
  } catch (error) {
    cleanUp();
    throw error;
  }
};

/**
 * A serialisable snapshot of an {@link EGS} instance.
 * Use {@link EGS.export} to capture state and {@link EGS.restore} to rehydrate it
 * (e.g. after persisting to a database between requests).
 *
 * @property {EGSInfo} info - Static EGS metadata (VAT number, branch details, etc.).
 * @property {string} [privateKey] - PEM-encoded EC prime256v1 private key. Keep this secret.
 * @property {string} [csr] - PEM-encoded Certificate Signing Request sent to ZATCA.
 * @property {string} [complianceCertificate] - PEM-encoded compliance CSID from ZATCA.
 * @property {string} [complianceApiSecret] - API secret paired with the compliance certificate.
 * @property {string} [productionCertificate] - PEM-encoded production CSID from ZATCA.
 * @property {string} [productionApiSecret] - API secret paired with the production certificate.
 */
export interface EGSSnapshot {
  info: EGSInfo;
  privateKey?: string;
  csr?: string;
  complianceCertificate?: string;
  complianceApiSecret?: string;
  productionCertificate?: string;
  productionApiSecret?: string;
}

/**
 * E-Invoice Generation System (EGS) — manages the full lifecycle of a ZATCA-compliant
 * invoice generator device, including key generation, CSR creation, certificate issuance,
 * compliance checking, and invoice signing/reporting.
 *
 * **Typical onboarding flow:**
 * 1. Construct an `EGS` with your device info.
 * 2. Call {@link generateNewKeysAndCSR} to create an EC key pair and CSR.
 * 3. Call {@link issueComplianceCertificate} with the OTP from the ZATCA portal.
 * 4. Run all six compliance checks via {@link runComplianceChecksForProduction}.
 * 5. Call {@link issueProductionCertificate} with the compliance request ID.
 * 6. Sign and report invoices with {@link signInvoice} + {@link reportInvoice}.
 *
 * @example
 * ```typescript
 * const egs = new EGS(
 *   { name: 'My POS', vatNumber: '300000000000003', ... },
 *   'production'
 * );
 * await egs.generateNewKeysAndCSR('MySolution');
 * const complianceResult = await egs.issueComplianceCertificate('123456'); // OTP from ZATCA portal
 * if (complianceResult.isOk()) {
 *   await egs.issueProductionCertificate(complianceResult.value);
 * }
 * ```
 */
export class EGS {
  private info: EGSInfo;
  private env: "production" | "simulation" | "development";
  private api: API;
  private privateKey?: string;
  private csr?: string;
  private complianceCertificate?: string;
  private complianceApiSecret?: string;
  private productionCertificate?: string;
  private productionApiSecret?: string;

  constructor(
    info: EGSInfo,
    env: "production" | "simulation" | "development" = "development"
  ) {
    const result = EGSInfoSchema.safeParse(info);
    if (!result.success) {
      throw new ZodValidationError(result.error.issues);
    }
    this.info = info;
    this.env = env;
    this.api = new API(env);
  }

  /** Returns the static EGS device info (VAT number, branch details, etc.). */
  getInfo(): EGSInfo {
    return this.info;
  }

  /** Returns the PEM-encoded EC private key, or `undefined` if keys have not been generated yet. */
  getPrivateKey(): string | undefined {
    return this.privateKey;
  }

  /**
   * Returns the PEM-encoded Certificate Signing Request (CSR), or `undefined` if not yet generated.
   * The CSR is sent to ZATCA to obtain a compliance CSID.
   */
  getCsr(): string | undefined {
    return this.csr;
  }

  /**
   * Returns the PEM-encoded compliance CSID (Cryptographic Stamp Identifier) issued by ZATCA,
   * or `undefined` if the compliance certificate has not been issued yet.
   */
  getComplianceCertificate(): string | undefined {
    return this.complianceCertificate;
  }

  /** Returns the API secret paired with the compliance certificate, or `undefined` if not yet issued. */
  getComplianceApiSecret(): string | undefined {
    return this.complianceApiSecret;
  }

  /**
   * Returns the PEM-encoded production CSID issued by ZATCA,
   * or `undefined` if the production certificate has not been issued yet.
   */
  getProductionCertificate(): string | undefined {
    return this.productionCertificate;
  }

  /** Returns the API secret paired with the production certificate, or `undefined` if not yet issued. */
  getProductionApiSecret(): string | undefined {
    return this.productionApiSecret;
  }

  /**
   * Serialises the EGS state to a plain object that can be stored and later restored.
   *
   * @returns An {@link EGSSnapshot} containing all keys, certificates, and metadata.
   *
   * @example
   * ```typescript
   * const snapshot = egs.export();
   * await db.save('egs', snapshot);
   * ```
   */
  export(): EGSSnapshot {
    return {
      complianceApiSecret: this.complianceApiSecret,
      complianceCertificate: this.complianceCertificate,
      csr: this.csr,
      info: this.info,
      privateKey: this.privateKey,
      productionApiSecret: this.productionApiSecret,
      productionCertificate: this.productionCertificate,
    };
  }

  /**
   * Rehydrates an EGS instance from a previously exported snapshot.
   *
   * @param snapshot - A snapshot produced by {@link EGS.export}.
   * @param env - Target environment. Defaults to `'development'` (ZATCA sandbox).
   * @returns A fully restored `EGS` instance.
   *
   * @example
   * ```typescript
   * const snapshot = await db.load('egs');
   * const egs = EGS.restore(snapshot, 'production');
   * ```
   */
  static restore(
    snapshot: EGSSnapshot,
    env: "production" | "simulation" | "development" = "development"
  ): EGS {
    const egs = new EGS(snapshot.info, env);
    egs.privateKey = snapshot.privateKey;
    egs.csr = snapshot.csr;
    egs.complianceCertificate = snapshot.complianceCertificate;
    egs.complianceApiSecret = snapshot.complianceApiSecret;
    egs.productionCertificate = snapshot.productionCertificate;
    egs.productionApiSecret = snapshot.productionApiSecret;
    return egs;
  }

  /**
   * Generates a new EC prime256v1 key pair and a ZATCA-formatted CSR.
   * Replaces any existing private key and CSR stored on this instance.
   *
   * Requires OpenSSL to be installed on the host system.
   *
   * @param solution_name - Free-text name of the software solution (embedded in the CSR serial number field).
   *
   * @example
   * ```typescript
   * await egs.generateNewKeysAndCSR('MyInvoicingSolution');
   * console.log(egs.getCsr()); // -----BEGIN CERTIFICATE REQUEST-----...
   * ```
   */
  async generateNewKeysAndCSR(solution_name: string): Promise<void> {
    const new_private_key = await generatePrime256v1KeyPair();
    this.privateKey = new_private_key;

    const new_csr = await generateCSR(
      this.info,
      this.privateKey,
      this.env === "production",
      solution_name
    );
    this.csr = new_csr;
  }

  /**
   * Submits the CSR to ZATCA and obtains a compliance CSID (Cryptographic Stamp Identifier).
   * The compliance certificate is stored internally and used for subsequent compliance checks.
   *
   * @param OTP - One-Time Password from the ZATCA portal (Fatoora). Valid for a short window.
   * @returns `Result.ok(requestId)` where `requestId` is needed to issue the production certificate,
   *          or `Result.err(ZatcaApiError)` on failure.
   *
   * @throws {Error} If no CSR has been generated yet (call {@link generateNewKeysAndCSR} first).
   *
   * @example
   * ```typescript
   * const result = await egs.issueComplianceCertificate('123456');
   * if (result.isOk()) {
   *   const complianceRequestId = result.value; // save this for issueProductionCertificate
   * }
   * ```
   */
  async issueComplianceCertificate(
    OTP: string
  ): Promise<Result<string, ZatcaApiError>> {
    if (!this.csr) {
      throw new Error("EGS needs to generate a CSR first.");
    }

    const issued_data = await this.api
      .compliance()
      .issueCertificate(this.csr, OTP);
    if (issued_data.isErr()) {
      return issued_data as Result<string, ZatcaApiError>;
    }
    this.complianceCertificate = issued_data.value.issued_certificate;
    this.complianceApiSecret = issued_data.value.api_secret;

    return Result.ok(issued_data.value.request_id);
  }

  /**
   * Exchanges the compliance request ID for a production CSID.
   * Must be called after all six compliance checks pass.
   *
   * @param compliance_request_id - The request ID returned by {@link issueComplianceCertificate}.
   * @returns `Result.ok(requestId)` on success, or `Result.err(ZatcaApiError)` on failure.
   *
   * @throws {Error} If the compliance certificate or API secret is missing.
   *
   * @example
   * ```typescript
   * const result = await egs.issueProductionCertificate(complianceRequestId);
   * if (result.isOk()) {
   *   console.log('Production CSID issued successfully');
   * }
   * ```
   */
  async issueProductionCertificate(
    compliance_request_id: string
  ): Promise<Result<string, ZatcaApiError>> {
    if (!this.complianceCertificate || !this.complianceApiSecret) {
      throw new Error(
        "EGS is missing a certificate/private key/api secret to request a production certificate."
      );
    }

    const issued_data = await this.api
      .production(this.complianceCertificate, this.complianceApiSecret)
      .issueCertificate(compliance_request_id);
    if (issued_data.isErr()) {
      return issued_data as Result<string, ZatcaApiError>;
    }
    this.productionCertificate = issued_data.value.issued_certificate;
    this.productionApiSecret = issued_data.value.api_secret;

    return Result.ok(issued_data.value.request_id);
  }

  async onboard(options: OnboardOptions): Promise<OnboardResult> {
    await this.generateNewKeysAndCSR(options.solutionName);

    const complianceCertificateResult = await this.issueComplianceCertificate(
      options.otp
    );
    if (complianceCertificateResult.isErr()) {
      throw new Error(
        `Failed to issue compliance certificate: ${String(complianceCertificateResult.error)}`
      );
    }

    const complianceChecks: Partial<
      Record<ZATCAComplianceStep, ComplianceCheckPayload>
    > = {};

    let previousHash = GENESIS_PREVIOUS_INVOICE_HASH;
    let previousSerial = "EGS1-886431145-100";
    for (const [index, step] of COMPLIANCE_ONBOARDING_STEP_ORDER.entries()) {
      const issueDate = new Date();
      const invoiceCounterNumber = index + 1;
      const invoice = new ZATCAInvoice({
        acceptWarning: true,
        props: buildComplianceInvoicePropsForStep(
          this.info,
          step,
          invoiceCounterNumber,
          previousHash,
          previousSerial,
          issueDate
        ),
      });
      const signResult = this.signInvoice(invoice);
      complianceChecks[step] = {
        invoiceHash: signResult.invoiceHash,
        signedInvoiceString: signResult.signedInvoiceString,
      };

      previousHash = signResult.invoiceHash;
      previousSerial = `EGS1-886431145-${100 + invoiceCounterNumber}`;
    }

    const complianceChecksResult =
      await this.runComplianceChecksForProduction(complianceChecks);
    if (complianceChecksResult.isErr()) {
      throw new Error(
        `Failed to run compliance checks for production: ${String(complianceChecksResult.error)}`
      );
    }

    const productionCertificateResult = await this.issueProductionCertificate(
      complianceCertificateResult.value
    );
    if (productionCertificateResult.isErr()) {
      throw new Error(
        `Failed to issue production certificate: ${String(productionCertificateResult.error)}`
      );
    }

    if (
      !this.productionCertificate ||
      !this.productionApiSecret ||
      !this.privateKey
    ) {
      throw new Error("EGS onboarding completed with missing credentials.");
    }

    return {
      lastInvoiceHash: previousHash,
      nextInvoiceCounter: COMPLIANCE_ONBOARDING_STEP_ORDER.length + 1,
      privateKey: this.privateKey,
      productionApiSecret: this.productionApiSecret,
      productionCertificate: this.productionCertificate,
    };
  }

  /**
   * Sends a signed invoice to the ZATCA compliance API for validation.
   * Used during the onboarding phase to verify each invoice type before production.
   *
   * @param signedInvoiceString - Base64-encoded signed UBL XML.
   * @param invoiceHash - SHA-256 hash of the canonical invoice, base64-encoded.
   * @returns `Result.ok(InvoiceResponse)` with ZATCA validation results, or `Result.err(ZatcaApiError)`.
   *
   * @throws {Error} If the compliance certificate or API secret is missing.
   */
  async checkInvoiceCompliance(
    signedInvoiceString: string,
    invoiceHash: string
  ): Promise<Result<InvoiceResponse, ZatcaApiError>> {
    if (!this.complianceCertificate || !this.complianceApiSecret) {
      throw new Error(
        "EGS is missing a certificate/private key/api secret to check the invoice compliance."
      );
    }

    return (await this.api
      .compliance(this.complianceCertificate, this.complianceApiSecret)
      .checkInvoiceCompliance(
        signedInvoiceString,
        invoiceHash,
        this.info.id
      )) as Result<InvoiceResponse, ZatcaApiError>;
  }

  /**
   * Runs all required compliance checks against the ZATCA compliance API in sequence.
   * All six invoice types must pass before ZATCA will issue a production CSID.
   *
   * @param checks - A map of {@link ZATCAComplianceStep} to {@link ComplianceCheckPayload}.
   *   Each entry provides the signed invoice and hash for that scenario.
   * @param required_steps - Which steps to enforce. Defaults to all six in {@link REQUIRED_COMPLIANCE_STEPS}.
   * @returns `Result.ok(responses)` mapping each step to its ZATCA response,
   *          or `Result.err(ZatcaApiError)` if any step fails.
   *
   * @throws {Error} If any required step is missing from `checks`.
   *
   * @example
   * ```typescript
   * const result = await egs.runComplianceChecksForProduction({
   *   'standard-compliant': { signedInvoiceString, invoiceHash },
   *   'simplified-compliant': { signedInvoiceString: simplifiedXml, invoiceHash: simplifiedHash },
   *   // ... all six steps
   * });
   * ```
   */
  async runComplianceChecksForProduction(
    checks: Partial<Record<ZATCAComplianceStep, ComplianceCheckPayload>>,
    required_steps: readonly ZATCAComplianceStep[] = REQUIRED_COMPLIANCE_STEPS
  ): Promise<
    Result<Record<ZATCAComplianceStep, InvoiceResponse>, ZatcaApiError>
  > {
    const missing_steps = required_steps.filter((step) => !checks[step]);
    if (missing_steps.length > 0) {
      throw new Error(
        `Missing compliance check payloads for steps: [${missing_steps.join(",")}]`
      );
    }

    const responses = {} as Record<ZATCAComplianceStep, InvoiceResponse>;

    for (const step of required_steps) {
      const payload = checks[step];
      if (!payload) {
        continue;
      }

      const r = await this.checkInvoiceCompliance(
        payload.signedInvoiceString,
        payload.invoiceHash
      );
      if (r.isErr()) {
        return r;
      }
      responses[step] = r.value;
    }

    return Result.ok(responses);
  }

  /**
   * Reports a signed standard (B2B) invoice to ZATCA for archiving.
   * Use this for standard tax invoices after the production CSID is issued.
   *
   * @param signedInvoiceString - Base64-encoded signed UBL XML.
   * @param invoiceHash - SHA-256 hash of the canonical invoice, base64-encoded.
   * @returns `Result.ok(InvoiceResponse)` on success, or `Result.err(ZatcaApiError)` on failure.
   *
   * @throws {Error} If the production certificate or API secret is missing.
   */
  async reportInvoice(
    signedInvoiceString: string,
    invoiceHash: string
  ): Promise<Result<InvoiceResponse, ZatcaApiError>> {
    if (!this.productionCertificate || !this.productionApiSecret) {
      throw new Error(
        "EGS is missing a certificate/private key/api secret to report the invoice."
      );
    }

    return (await this.api
      .production(this.productionCertificate, this.productionApiSecret)
      .reportInvoice(signedInvoiceString, invoiceHash, this.info.id)) as Result<
      InvoiceResponse,
      ZatcaApiError
    >;
  }

  /**
   * Submits a signed standard (B2B) invoice to ZATCA for clearance.
   * Clearance is required for standard invoices above the threshold; ZATCA validates and
   * stamps the invoice before it can be shared with the buyer.
   *
   * @param signedInvoiceString - Base64-encoded signed UBL XML.
   * @param invoiceHash - SHA-256 hash of the canonical invoice, base64-encoded.
   * @returns `Result.ok(InvoiceResponse)` on success, or `Result.err(ZatcaApiError)` on failure.
   *
   * @throws {Error} If the production certificate or API secret is missing.
   */
  async clearanceInvoice(
    signedInvoiceString: string,
    invoiceHash: string
  ): Promise<Result<InvoiceResponse, ZatcaApiError>> {
    if (!this.productionCertificate || !this.productionApiSecret) {
      throw new Error(
        "EGS is missing a certificate/private key/api secret to report the invoice."
      );
    }

    return (await this.api
      .production(this.productionCertificate, this.productionApiSecret)
      .clearanceInvoice(
        signedInvoiceString,
        invoiceHash,
        this.info.id
      )) as Result<InvoiceResponse, ZatcaApiError>;
  }

  /**
   * Signs a {@link ZATCAInvoice} using the EGS's stored certificate and private key.
   * Returns the signed XML string, invoice hash, and QR code — all needed for reporting.
   *
   * @param invoice - The invoice to sign.
   * @param production - If `true`, uses the production certificate; otherwise uses the compliance certificate.
   *   Defaults to `false` (compliance mode).
   * @returns An object with:
   *   - `signedInvoiceString` — base64-encoded signed UBL XML
   *   - `invoiceHash` — SHA-256 hash of the canonical invoice, base64-encoded
   *   - `qr` — base64-encoded TLV QR code string
   *
   * @throws {Error} If the appropriate certificate or private key is missing.
   *
   * @example
   * ```typescript
   * const { signedInvoiceString, invoiceHash, qr } = egs.signInvoice(invoice, true);
   * await egs.reportInvoice(signedInvoiceString, invoiceHash);
   * ```
   */
  signInvoice(
    invoice: ZATCAInvoice,
    production?: boolean
  ): { signedInvoiceString: string; invoiceHash: string; qr: string } {
    const certificate_string = production
      ? this.productionCertificate
      : this.complianceCertificate;
    if (!certificate_string || !this.privateKey) {
      throw new Error(
        "EGS is missing a certificate/private key to sign the invoice."
      );
    }

    const result = generateSignedXMLString({
      certificate_string,
      invoice_xml: invoice.getXML(),
      private_key_string: this.privateKey,
    });
    return {
      invoiceHash: result.invoice_hash,
      qr: result.qr,
      signedInvoiceString: result.signed_invoice_string,
    };
  }
}
