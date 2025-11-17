import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      webhookType?: string;
      webhookData?: any;
      user?: {
        id: string;
        companyId: string;
        email: string;
        profile: string;
      };
      companyId?: string;
    }
  }
}

export {};