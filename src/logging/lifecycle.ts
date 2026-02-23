import { createSubsystemLogger } from "./subsystem.js";

/**
 * Dedicated logger for system lifecycle events (start, stop, connect, disconnect).
 * This subsystem is specifically intended for tracking uptime and health.
 */
export const lifecycleLog = createSubsystemLogger("system/lifecycle");

/**
 * Logs a system lifecycle event with a clear message and optional metadata.
 */
export function logLifecycle(message: string, meta?: Record<string, unknown>) {
  lifecycleLog.info(message, meta);
}
