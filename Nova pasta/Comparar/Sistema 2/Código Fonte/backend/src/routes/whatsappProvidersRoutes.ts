import { Router } from 'express';
import isAuth from '../middlewares/isAuth';
import WhatsAppProviderController from '../controllers/WhatsAppProviderController';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(isAuth);

// Rotas CRUD de Providers
router.get('/', WhatsAppProviderController.index);
router.get('/:providerId', WhatsAppProviderController.show);
router.post('/', WhatsAppProviderController.store);
router.put('/:providerId', WhatsAppProviderController.update);
router.delete('/:providerId', WhatsAppProviderController.delete);

// Rotas de controle de providers
router.post('/:providerId/toggle-status', WhatsAppProviderController.toggleStatus);
router.post('/:providerId/set-default', WhatsAppProviderController.setDefault);

// Rotas de envio de mensagens
router.post('/send-message', WhatsAppProviderController.sendMessage);
router.post('/send-media', WhatsAppProviderController.sendMedia);

// Rotas de migração
router.post('/migrate', WhatsAppProviderController.migrate);

// Rotas de status e estatísticas
router.get('/stats', WhatsAppProviderController.getStats);
router.get('/connections', WhatsAppProviderController.getConnections);
router.get('/:providerId/test-connection', WhatsAppProviderController.testConnection);

// Rotas de webhook
router.post('/webhook/baileys/:companyId', WhatsAppProviderController.webhook);
router.post('/webhook/hub/:companyId', WhatsAppProviderController.webhook);

// Rotas de operações específicas
router.get('/:providerId/qrcode', WhatsAppProviderController.generateQRCode);
router.post('/:providerId/disconnect', WhatsAppProviderController.disconnect);
router.get('/:providerId/info', WhatsAppProviderController.getInfo);

export default router;