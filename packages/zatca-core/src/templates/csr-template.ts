const template = `
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
const applyReplacements = (
  templateString: string,
  replacements: [string, string][]
): string => {
  let result = templateString;
  for (const [placeholder, value] of replacements) {
    result = result.replace(placeholder, value);
  }
  return result;
};

const populate = (props: CSRConfigProps): string => {
  const replacements: [string, string][] = [
    ["SET_PRIVATE_KEY_PASS", props.privateKeyPass ?? "SET_PRIVATE_KEY_PASS"],
    [
      "SET_PRODUCTION_VALUE",
      props.production ? "ZATCA-Code-Signing" : "PREZATCA-Code-Signing",
    ],
    [
      "SET_EGS_SERIAL_NUMBER",
      `1-${props.solutionName}|2-${props.egsModel}|3-${props.egsSerialNumber}`,
    ],
    ["SET_VAT_REGISTRATION_NUMBER", props.vatNumber],
    ["SET_BRANCH_LOCATION", props.branchLocation],
    ["SET_BRANCH_INDUSTRY", props.branchIndustry],
    ["SET_COMMON_NAME", props.taxpayerProvidedId],
    ["SET_BRANCH_NAME", props.branchName],
    ["SET_TAXPAYER_NAME", props.taxpayerName],
  ];
  return applyReplacements(template, replacements);
};

/** @internal */
export default populate;
