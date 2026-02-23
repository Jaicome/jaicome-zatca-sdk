export type RuntimeCapabilities = Readonly<{
  signing: boolean;
  egsManagedCerts: boolean;
}>;

export const DEFAULT_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  signing: false,
  egsManagedCerts: false,
};
