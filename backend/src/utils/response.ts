import type { Response } from "express";

export function success<T>(res: Response, data: T, message = "OK", status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function successWithMeta<T>(
  res: Response,
  data: T,
  meta: Record<string, unknown>,
  message = "OK",
) {
  return res.status(200).json({ success: true, data, meta, message });
}
