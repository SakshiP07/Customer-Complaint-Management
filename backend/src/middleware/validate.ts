import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

export function validate(schema: ZodType, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "body") {
        req.body = parsed as never;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        return next(ApiError.validation("Request validation failed", details));
      }
      next(error);
    }
  };
}
