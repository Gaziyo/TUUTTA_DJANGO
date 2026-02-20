type LogArgs = Parameters<typeof console.log>;

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.log(...args);
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  }
};
