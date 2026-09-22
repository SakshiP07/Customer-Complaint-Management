import type { RoleCode } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  companyId: string | null;
  regionId: string | null;
  storeId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};
