import { spawn } from "node:child_process";
import fs from "node:fs";

import type { ZATCAInvoice, EGSInfo } from "@jaicome/zatca-core";
import { EGSInfoSchema, ZodValidationError } from "@jaicome/zatca-core";
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

export type ZATCAComplianceStep =
  | "standard-compliant"
  | "standard-credit-note-compliant"
  | "standard-debit-note-compliant"
  | "simplified-compliant"
  | "simplified-credit-note-compliant"
  | "simplified-debit-note-compliant";

export interface ComplianceCheckPayload {
  signedInvoiceString: string;
  invoiceHash: string;
}

export const REQUIRED_COMPLIANCE_STEPS: readonly ZATCAComplianceStep[] = [
  "standard-compliant",
  "standard-credit-note-compliant",
  "standard-debit-note-compliant",
  "simplified-compliant",
  "simplified-credit-note-compliant",
  "simplified-debit-note-compliant",
];

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

export interface EGSSnapshot {
  info: EGSInfo;
  privateKey?: string;
  csr?: string;
  complianceCertificate?: string;
  complianceApiSecret?: string;
  productionCertificate?: string;
  productionApiSecret?: string;
}

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

  getInfo(): EGSInfo {
    return this.info;
  }

  getPrivateKey(): string | undefined {
    return this.privateKey;
  }

  getCsr(): string | undefined {
    return this.csr;
  }

  getComplianceCertificate(): string | undefined {
    return this.complianceCertificate;
  }

  getComplianceApiSecret(): string | undefined {
    return this.complianceApiSecret;
  }

  getProductionCertificate(): string | undefined {
    return this.productionCertificate;
  }

  getProductionApiSecret(): string | undefined {
    return this.productionApiSecret;
  }

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
