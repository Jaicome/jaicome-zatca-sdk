import { spawn } from "child_process";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";

import { ZATCAInvoice } from "@jaicome/zatca-core";
import { EGSUnitInfoSchema, ZodValidationError } from "@jaicome/zatca-core";
import API from "../api";
import { generateSignedXMLString } from "../signing";

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
    private_key_pass?: string,
    production?: boolean,
    egs_model: string,
    egs_serial_number: string,
    solution_name: string,
    vat_number: string,
    branch_location: string,
    branch_industry: string,
    branch_name: string,
    taxpayer_name: string,
    taxpayer_provided_id: string
}

const buildCSRConfig = (props: CSRConfigProps): string => {
    let t = CSR_TEMPLATE;
    t = t.replace("SET_PRIVATE_KEY_PASS", props.private_key_pass ?? "SET_PRIVATE_KEY_PASS");
    t = t.replace("SET_PRODUCTION_VALUE", "PREZATCA-Code-Signing");
    t = t.replace("SET_EGS_SERIAL_NUMBER", `1-${props.solution_name}|2-${props.egs_model}|3-${props.egs_serial_number}`);
    t = t.replace("SET_VAT_REGISTRATION_NUMBER", props.vat_number);
    t = t.replace("SET_BRANCH_LOCATION", props.branch_location);
    t = t.replace("SET_BRANCH_INDUSTRY", props.branch_industry);
    t = t.replace("SET_COMMON_NAME", props.taxpayer_provided_id);
    t = t.replace("SET_BRANCH_NAME", props.branch_name);
    t = t.replace("SET_TAXPAYER_NAME", props.taxpayer_name);
    return t;
};

export interface EGSUnitLocation {
  city?: string;
  city_subdivision?: string;
  street?: string;
  plot_identification?: string;
  building?: string;
  postal_zone?: string;
}

export interface EGSUnitCustomerInfo {
  city?: string;
  city_subdivision?: string;
  street?: string;
  additional_street?: string;
  plot_identification?: string;
  building?: string;
  postal_zone?: string;
  country_sub_entity?: string;
  buyer_name: string;
  customer_crn_number?: string;
  vat_number?: string;
}

export interface EGSUnitInfo {
    uuid: string,
    custom_id: string,
    model: string,
    CRN_number: string,
    VAT_name: string,
    VAT_number: string,
    branch_name: string,
    branch_industry: string,
    location?: EGSUnitLocation,
    customer_info?: EGSUnitCustomerInfo,
    private_key?: string,
    csr?: string,
    compliance_certificate?: string,
    compliance_api_secret?: string,
    production_certificate?: string,
    production_api_secret?: string,
}

export type ZATCAComplianceStep =
    | "standard-compliant"
    | "standard-credit-note-compliant"
    | "standard-debit-note-compliant"
    | "simplified-compliant"
    | "simplified-credit-note-compliant"
    | "simplified-debit-note-compliant";

export interface ComplianceCheckPayload {
    signed_invoice_string: string,
    invoice_hash: string,
}

export const REQUIRED_COMPLIANCE_STEPS: readonly ZATCAComplianceStep[] = [
    "standard-compliant",
    "standard-credit-note-compliant",
    "standard-debit-note-compliant",
    "simplified-compliant",
    "simplified-credit-note-compliant",
    "simplified-debit-note-compliant",
];

const OpenSSL = (cmd: string[]): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        try {
            const command = spawn("openssl", cmd);
            let result = "";
            command.stdout.on("data", (data) => {
                 result += data.toString();
            });
            command.on("close", (_code: number) => {
                return resolve(result);
            });
            command.on("error", (error: Error) => {
                return reject(error);
            });
        } catch (error: unknown) {
            reject(error);
        }
    });
}

const generatePrime256v1KeyPair = async (): Promise<string> => {
    const result = await OpenSSL(["ecparam", "-name", "prime256v1", "-genkey"]);
    if (!result.includes("-----BEGIN EC PRIVATE KEY-----")) throw new Error("Error no private key found in OpenSSL output.");

    const private_key: string = `-----BEGIN EC PRIVATE KEY-----${result.split("-----BEGIN EC PRIVATE KEY-----")[1]}`.trim();
    return private_key;
}

const generateCSR = async (egs_info: EGSUnitInfo, production: boolean, solution_name: string): Promise<string> => {
    if (!egs_info.private_key) throw new Error("EGS has no private key");

    const private_key_file = `${process.env.TEMP_FOLDER ?? "/tmp/"}${uuidv4()}.pem`;
    const csr_config_file = `${process.env.TEMP_FOLDER ?? "/tmp/"}${uuidv4()}.cnf`;
    fs.writeFileSync(private_key_file, egs_info.private_key);
    fs.writeFileSync(csr_config_file, buildCSRConfig({
        egs_model: egs_info.model,
        egs_serial_number: egs_info.uuid,
        solution_name: solution_name,
        vat_number: egs_info.VAT_number,
        branch_location: `${egs_info.location?.building} ${egs_info.location?.street}, ${egs_info.location?.city}`,
        branch_industry: egs_info.branch_industry,
        branch_name: egs_info.branch_name,
        taxpayer_name: egs_info.VAT_name,
        taxpayer_provided_id: egs_info.custom_id,
        production: production
    }));
    
    const cleanUp = () => {
        fs.unlink(private_key_file, ()=>{});
        fs.unlink(csr_config_file, ()=>{});
    };
    
    try {    
        const result = await OpenSSL(["req", "-new", "-sha256", "-key", private_key_file, "-config", csr_config_file]);
        if (!result.includes("-----BEGIN CERTIFICATE REQUEST-----")) throw new Error("Error no CSR found in OpenSSL output.");

        const csr: string = `-----BEGIN CERTIFICATE REQUEST-----${result.split("-----BEGIN CERTIFICATE REQUEST-----")[1]}`.trim();
        cleanUp();
        return csr;
    } catch (error) {
        cleanUp();
        throw error;
    }
}


export class EGS {

    private egs_info: EGSUnitInfo;
    private api: API;

    constructor(egs_info: EGSUnitInfo, env: "production" | "simulation" | "development" = "development") {
        const result = EGSUnitInfoSchema.safeParse(egs_info);
        if (!result.success) {
            throw new ZodValidationError(result.error.issues);
        }
        this.egs_info = egs_info;
        this.api = new API(env);
    }

    get() {
        return this.egs_info;
    }

    set(egs_info: Partial<EGSUnitInfo>) {
        this.egs_info = {...this.egs_info, ...egs_info};
    }

    async generateNewKeysAndCSR(production: boolean, solution_name: string): Promise<void> {
        const new_private_key = await generatePrime256v1KeyPair();
        this.egs_info.private_key = new_private_key;

        const new_csr = await generateCSR(this.egs_info, production, solution_name);    
        this.egs_info.csr = new_csr;
    }

    async issueComplianceCertificate(OTP: string): Promise<string> {
        if (!this.egs_info.csr) throw new Error("EGS needs to generate a CSR first.");

        const issued_data = await this.api.compliance().issueCertificate(this.egs_info.csr, OTP);
        this.egs_info.compliance_certificate = issued_data.issued_certificate;
        this.egs_info.compliance_api_secret = issued_data.api_secret;

        return issued_data.request_id;
    }

    async issueProductionCertificate(compliance_request_id: string): Promise<string> {
        if(!this.egs_info.compliance_certificate || !this.egs_info.compliance_api_secret) throw new Error("EGS is missing a certificate/private key/api secret to request a production certificate.")

        const issued_data = await this.api.production(this.egs_info.compliance_certificate, this.egs_info.compliance_api_secret).issueCertificate(compliance_request_id);
        this.egs_info.production_certificate = issued_data.issued_certificate;
        this.egs_info.production_api_secret = issued_data.api_secret;
        
        return issued_data.request_id;
    }

    async checkInvoiceCompliance(signed_invoice_string: string, invoice_hash: string): Promise<any> {
        if(!this.egs_info.compliance_certificate || !this.egs_info.compliance_api_secret) throw new Error("EGS is missing a certificate/private key/api secret to check the invoice compliance.")

        return await this.api.compliance(this.egs_info.compliance_certificate, this.egs_info.compliance_api_secret).checkInvoiceCompliance(
            signed_invoice_string,
            invoice_hash,
            this.egs_info.uuid
        );
    }

    async runComplianceChecksForProduction(
        checks: Partial<Record<ZATCAComplianceStep, ComplianceCheckPayload>>,
        required_steps: readonly ZATCAComplianceStep[] = REQUIRED_COMPLIANCE_STEPS,
    ): Promise<Record<ZATCAComplianceStep, any>> {
        const missing_steps = required_steps.filter((step) => !checks[step]);
        if (missing_steps.length > 0) {
            throw new Error(`Missing compliance check payloads for steps: [${missing_steps.join(",")}]`);
        }

        const responses = {} as Record<ZATCAComplianceStep, any>;

        for (const step of required_steps) {
            const payload = checks[step];
            if (!payload) {
                continue;
            }

            responses[step] = await this.checkInvoiceCompliance(
                payload.signed_invoice_string,
                payload.invoice_hash,
            );
        }

        return responses;
    }

    async reportInvoice(signed_invoice_string: string, invoice_hash: string): Promise<any> {
        if(!this.egs_info.production_certificate || !this.egs_info.production_api_secret) throw new Error("EGS is missing a certificate/private key/api secret to report the invoice.")

        return await this.api.production(this.egs_info.production_certificate, this.egs_info.production_api_secret).reportInvoice(
            signed_invoice_string,
            invoice_hash,
            this.egs_info.uuid
        );
    }

    async clearanceInvoice(signed_invoice_string: string, invoice_hash: string): Promise<any> {
        if(!this.egs_info.production_certificate || !this.egs_info.production_api_secret) throw new Error("EGS is missing a certificate/private key/api secret to report the invoice.")

        return await this.api.production(this.egs_info.production_certificate, this.egs_info.production_api_secret).clearanceInvoice(
            signed_invoice_string,
            invoice_hash,
            this.egs_info.uuid
        );
    }

    signInvoice(invoice: ZATCAInvoice, production?: boolean): {signed_invoice_string: string, invoice_hash: string, qr: string} {
        const certificate_string = production ? this.egs_info.production_certificate : this.egs_info.compliance_certificate;
        if (!certificate_string || !this.egs_info.private_key) throw new Error("EGS is missing a certificate/private key to sign the invoice.");

        return generateSignedXMLString({
            invoice_xml: invoice.getXML(),
            certificate_string,
            private_key_string: this.egs_info.private_key,
        });
    }
}
