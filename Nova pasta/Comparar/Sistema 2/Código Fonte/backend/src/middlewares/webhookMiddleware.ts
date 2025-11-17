import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getIO } from '../libs/socket';
import { logger } from '../utils/logger';
import {
  FlowWebhookService,
  HubWebhookService,
  WhatsAppWebhookService
} from '../services/WebhookServices';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    email: string;
    profile: string;
  };
}

// Middleware para validar webhooks do Notifica-me Hub
export const validateHubWebhook = async (
  req: Request,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature'] as string;
    const webhookSecret = process.env.HUB_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      logger.warn('Webhook sem assinatura ou secret não configurado');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validar assinatura do webhook (implementar conforme documentação do Hub)
    const isValid = await HubWebhookService.validateSignature(
      req.body,
      signature,
      webhookSecret
    );

    if (!isValid) {
      logger.warn('Assinatura do webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Adicionar informações do webhook ao request
    req.webhookType = 'hub';
    req.webhookData = req.body;

    next();
  } catch (error) {
    logger.error('Erro ao validar webhook do Hub:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para validar webhooks do FlowBuilder
export const validateFlowWebhook = async (
  req: Request,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const { flowId, executionId } = req.params;
    const webhookToken = req.headers['x-flow-token'] as string;

    if (!flowId || !webhookToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validar token do webhook
    const isValid = await FlowWebhookService.validateToken(
      flowId,
      webhookToken
    );

    if (!isValid) {
      logger.warn('Token do webhook do FlowBuilder inválido');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Adicionar informações do webhook ao request
    req.webhookType = 'flow';
    req.webhookData = {
      flowId,
      executionId,
      ...req.body
    };

    next();
  } catch (error) {
    logger.error('Erro ao validar webhook do FlowBuilder:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para processar webhooks do WhatsApp (Baileys)
export const processWhatsAppWebhook = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const webhookData = req.body;
    const io = getIO();

    // Processar diferentes tipos de eventos
    if (webhookData.event === 'messages.upsert') {
      const message = webhookData.data.messages[0];

      // Enviar evento via WebSocket para atualização em tempo real
      io.to(`company-${req.user?.companyId}`).emit('whatsapp:message', {
        type: 'received',
        message: {
          id: message.key.id,
          from: message.key.remoteJid,
          body: message.message?.conversation || message.message?.extendedTextMessage?.text,
          timestamp: message.messageTimestamp
        }
      });

      // Processar through WhatsApp service
      await WhatsAppWebhookService.processMessage(
        message,
        req.user?.companyId || ''
      );

    } else if (webhookData.event === 'connection.update') {
      const connectionState = webhookData.data;

      io.to(`company-${req.user?.companyId}`).emit('whatsapp:connection', {
        type: 'connection_update',
        state: connectionState
      });

      await WhatsAppWebhookService.processConnectionUpdate(
        connectionState,
        req.user?.companyId || ''
      );
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Erro ao processar webhook do WhatsApp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para processar webhooks do Notifica-me Hub
export const processHubWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const webhookData = req.body;
    const io = getIO();

    // Processar diferentes tipos de eventos do Hub
    switch (webhookData.event) {
      case 'message.received':
        const messageData = webhookData.data;

        // Enviar evento via WebSocket
        io.to(`hub-instance-${messageData.instanceId}`).emit('hub:message', {
          type: 'received',
          message: messageData
        });

        // Processar mensagem através do serviço do Hub
        await HubWebhookService.processMessage(messageData);
        break;

      case 'connection.status':
        const statusData = webhookData.data;

        io.to(`hub-instance-${statusData.instanceId}`).emit('hub:status', {
          type: 'status_update',
          status: statusData
        });

        await HubWebhookService.processStatusUpdate(statusData);
        break;

      case 'message.status':
        const messageStatus = webhookData.data;

        io.to(`hub-instance-${messageStatus.instanceId}`).emit('hub:message_status', {
          type: 'status_update',
          status: messageStatus
        });

        await HubWebhookService.processMessageStatus(messageStatus);
        break;

      default:
        logger.info('Evento do Hub não processado:', webhookData.event);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Erro ao processar webhook do Hub:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para processar webhooks do FlowBuilder
export const processFlowWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const webhookData = req.webhookData;
    const io = getIO();

    // Processar webhook específico do FlowBuilder
    if (webhookData.type === 'api_response') {
      // Continuar execução do flow após resposta de API
      const execution = await FlowWebhookService.processApiResponse(
        webhookData.flowId,
        webhookData.executionId,
        webhookData.response
      );

      // Notificar via WebSocket sobre o progresso
      io.to(`flow-${webhookData.flowId}`).emit('flow:execution_update', {
        type: 'webhook_processed',
        executionId: webhookData.executionId,
        execution
      });

    } else if (webhookData.type === 'user_input') {
      // Processar input do usuário em fluxos interativos
      const execution = await FlowWebhookService.processUserInput(
        webhookData.flowId,
        webhookData.executionId,
        webhookData.input
      );

      io.to(`flow-${webhookData.flowId}`).emit('flow:execution_update', {
        type: 'input_processed',
        executionId: webhookData.executionId,
        execution
      });

    } else {
      // Processar tipo genérico de webhook
      const execution = await FlowWebhookService.processGenericWebhook(
        webhookData.flowId,
        webhookData.executionId,
        webhookData
      );

      io.to(`flow-${webhookData.flowId}`).emit('flow:execution_update', {
        type: 'webhook_processed',
        executionId: webhookData.executionId,
        execution
      });
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Erro ao processar webhook do FlowBuilder:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para autenticar webhooks via Bearer Token
export const authenticateWebhook = (
  req: Request,
  res: Response,
  next: Function
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Validar token JWT
    jwt.verify(token, process.env.APP_SECRET || 'default_secret', (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      (req as AuthenticatedRequest).user = decoded as any;
      next();
    });
  } catch (error) {
    logger.error('Erro na autenticação do webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para validação de payloads
export const validateWebhookPayload = (
  req: Request,
  res: Response,
  next: Function
): void => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Validar estrutura básica do payload
    if (!req.body.event || !req.body.data) {
      return res.status(400).json({ error: 'Missing required fields: event, data' });
    }

    next();
  } catch (error) {
    logger.error('Erro na validação do payload:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware para rate limiting de webhooks
export const webhookRateLimit = new Map();

export const rateLimitWebhook = (
  req: Request,
  res: Response,
  next: Function
): void => {
  try {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 100; // máximo 100 requisições por minuto

    if (!webhookRateLimit.has(key)) {
      webhookRateLimit.set(key, { count: 0, resetTime: now + windowMs });
    }

    const limit = webhookRateLimit.get(key);

    if (now > limit.resetTime) {
      // Reset counter se a janela de tempo expirou
      limit.count = 0;
      limit.resetTime = now + windowMs;
    }

    limit.count++;

    if (limit.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.resetTime - now) / 1000)
      });
    }

    next();
  } catch (error) {
    logger.error('Erro no rate limiting do webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Cleanup function para remover entradas antigas do rate limiting
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of webhookRateLimit.entries()) {
    if (now > limit.resetTime) {
      webhookRateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup a cada 5 minutos