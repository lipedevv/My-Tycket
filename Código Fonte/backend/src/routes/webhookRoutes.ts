import { Router } from 'express';
import {
  validateHubWebhook,
  validateFlowWebhook,
  processHubWebhook,
  processFlowWebhook,
  processWhatsAppWebhook,
  authenticateWebhook,
  validateWebhookPayload,
  rateLimitWebhook
} from '../middlewares/webhookMiddleware';

const routes = Router();

// Rotas para webhooks do Notifica-me Hub
routes.post(
  '/hub/:instanceId',
  rateLimitWebhook,
  validateHubWebhook,
  processHubWebhook
);

// Rotas para webhooks do FlowBuilder
routes.post(
  '/flow/:flowId/execution/:executionId',
  rateLimitWebhook,
  validateFlowWebhook,
  processFlowWebhook
);

routes.post(
  '/flow/:flowId/response',
  rateLimitWebhook,
  authenticateWebhook,
  validateWebhookPayload,
  processFlowWebhook
);

// Rotas para webhooks do WhatsApp (Baileys)
routes.post(
  '/whatsapp',
  rateLimitWebhook,
  authenticateWebhook,
  validateWebhookPayload,
  processWhatsAppWebhook
);

// Webhook genérico para providers
routes.post(
  '/provider/:providerName/:instanceId',
  rateLimitWebhook,
  validateWebhookPayload,
  async (req, res) => {
    try {
      const { providerName, instanceId } = req.params;
      const webhookData = req.body;

      // Processar webhook baseado no provider
      switch (providerName) {
        case 'hub':
          return await processHubWebhook(req, res);
        case 'baileys':
          return await processWhatsAppWebhook(req as any, res);
        default:
          return res.status(400).json({ error: 'Unknown provider' });
      }
    } catch (error) {
      console.error('Erro ao processar webhook genérico:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Endpoint de teste para webhooks
routes.post('/test', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para verificar se o sistema está pronto para receber webhooks
routes.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default routes;