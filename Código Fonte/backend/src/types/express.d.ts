import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        companyId: number;
        email: string;
        profile: string;
      };
      webhookSuccess?: (data: any) => Response;
      webhookError?: (error: string, status?: number) => Response;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: number;
    email: string;
    profile: string;
  };
}