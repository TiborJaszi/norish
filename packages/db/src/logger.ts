/**
 * Lightweight logger for the db package.
 *
 * Re-creates the child loggers that repositories need without pulling in
 * @norish/shared-server (which would create a cyclic workspace dependency).
 */
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const logLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as string) ||
  (process.env.LOG_LEVEL as string) ||
  (isDev ? "debug" : "info");

const logger = pino({ level: logLevel });

export const dbLogger = logger.child({ module: "db" });
export const authLogger = logger.child({ module: "auth" });
