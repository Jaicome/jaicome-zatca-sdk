/* eslint-disable eslint-plugin-jest/require-hook */

let LOGGING = false;

export const setLogging = (enabled: boolean) => {
  LOGGING = enabled;
};

export const log = (type: string, source: string, message: string) => {
  if (!LOGGING) {
    return;
  }
  console.log(
    `\u001B[33m${new Date().toLocaleString()}\u001B[0m: [\u001B[36m${source} ${type}\u001B[0m] ${message}`
  );
};
