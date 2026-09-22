import { ApiError } from "./ApiError.js";

export function parsePagination(query: { page?: unknown; pageSize?: unknown }) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function requireUuid(value: string, field = "id") {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(value)) {
    throw ApiError.validation(`Invalid ${field}`);
  }
  return value;
}

export function routeParam(value: string | string[] | undefined, name = "id") {
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) throw ApiError.validation(`Missing ${name}`);
  return str;
}
