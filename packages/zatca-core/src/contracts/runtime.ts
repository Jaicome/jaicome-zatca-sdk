/**
 * Describes the capabilities of the current runtime environment.
 *
 * Used to gate features that are only available in server-side (Node.js) environments,
 * such as cryptographic signing and EGS certificate management.
 */
export type RuntimeCapabilities = Readonly<{
  /** Whether the runtime supports invoice signing (requires Node.js crypto APIs). */
  signing: boolean;
  /** Whether the runtime supports EGS-managed certificate operations (requires OpenSSL). */
  egsManagedCerts: boolean;
}>;

/**
 * Default runtime capabilities for a universal (browser/React Native) environment.
 *
 * Both `signing` and `egsManagedCerts` are `false` by default.
 * Override this when running in Node.js by providing a capabilities object
 * with the appropriate flags set to `true`.
 */
export const DEFAULT_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  egsManagedCerts: false,
  signing: false,
};
