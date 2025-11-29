import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import AppError from '../errors/AppError';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/express';

// Webhook Middleware - Simplified version
// Features temporarily disabled until complex TypeScript issues are resolved

// Rate limiting para webhooks
export const rateLimitWebhook = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: {
    error: 'Too many webhook requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validação básica de webhook
export const validateWebhookPayload = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info("Webhook payload validation - simplified version");
    
    if (!req.body) {
      throw new AppError("ERR_WEBHOOK_NO_PAYLOAD", 400);
    }

    // Validação básica - aceita qualquer payload válido
    if (typeof req.body !== 'object') {
      throw new AppError("ERR_WEBHOOK_INVALID_PAYLOAD", 400);
    }

    next();
  } catch (error) {
    logger.error("Error in webhook payload validation:", error);
    next(error);
  }
};

// Autenticação de webhook simplificada
export const authenticateWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info("Webhook authentication - simplified version");
    
    // Autenticação simplificada - aceita qualquer request por enquanto
    // TODO: Implementar autenticação adequada quando o sistema estiver completo
    
    next();
  } catch (error) {
    logger.error("Error in webhook authentication:", error);
    next(error);
  }
};

// Validador específico para webhooks do Hub
export const validateHubWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info("Hub webhook validation - feature temporarily disabled");
    
    // Validação temporariamente desabilitada
    next();
  } catch (error) {
    logger.error("Error in Hub webhook validation:", error);
    next(error);
  }
};

// Validador específico para webhooks do FlowBuilder
export const validateFlowWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info("Flow webhook validation - feature temporarily disabled");
    
    // Validação temporariamente desabilitada
    next();
  } catch (error) {
    logger.error("Error in Flow webhook validation:", error);
    next(error);
  }
};

// Processador de webhook do Hub
export const processHubWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    logger.info("Processing Hub webhook - feature temporarily disabled");
    
    return res.status(501).json({
      error: "Hub webhook processing is temporarily disabled",
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error processing Hub webhook:", error);
    return res.status(500).json({
      error: "Internal server error processing Hub webhook"
    });
  }
};

// Processador de webhook do FlowBuilder
export const processFlowWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    logger.info("Processing Flow webhook - feature temporarily disabled");
    
    return res.status(501).json({
      error: "Flow webhook processing is temporarily disabled",
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error processing Flow webhook:", error);
    return res.status(500).json({
      error: "Internal server error processing Flow webhook"
    });
  }
};

// Processador de webhook do WhatsApp
export const processWhatsAppWebhook = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    logger.info("Processing WhatsApp webhook - feature temporarily disabled");
    
    return res.status(501).json({
      error: "WhatsApp webhook processing is temporarily disabled",
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error processing WhatsApp webhook:", error);
    return res.status(500).json({
      error: "Internal server error processing WhatsApp webhook"
    });
  }
};

// Middleware de log para webhooks
export const logWebhookRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info(`Webhook received: ${req.method} ${req.path}`, {
      body: req.body,
      headers: req.headers,
      params: req.params,
      query: req.query
    });
    
    next();
  } catch (error) {
    logger.error("Error logging webhook request:", error);
    next(error);
  }
};

// Middleware de resposta padronizada
export const standardWebhookResponse = (req: Request, res: Response, next: NextFunction): void => {
  try {
    logger.info("Standard webhook response middleware applied");
    next();
  } catch (error) {
    logger.error("Error in standard webhook response:", error);
    next(error);
  }
};