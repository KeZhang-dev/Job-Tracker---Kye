import type { FormErrors } from "./validation";

/**
 * Server actions return errors as values: thrown errors have their messages
 * hidden in production builds, which would leave the UI with nothing useful.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FormErrors };

/** Client helper: returns the data, or throws an Error carrying the server's message. */
export async function unwrap<T>(result: Promise<ActionResult<T>>): Promise<T> {
  const r = await result;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
