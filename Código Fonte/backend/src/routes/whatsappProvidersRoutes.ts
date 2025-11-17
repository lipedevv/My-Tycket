import { Router } from 'express';
import isAuth from "../middleware/isAuth";
import WhatsAppProviderController from '../controllers/WhatsAppProviderController';

const router = Router();

// Rotas básicas do WhatsApp Provider
router.get('/', isAuth, WhatsAppProviderController.index.bind(WhatsAppProviderController));
router.post('/', isAuth, WhatsAppProviderController.store.bind(WhatsAppProviderController));
router.get('/:id', isAuth, WhatsAppProviderController.show.bind(WhatsAppProviderController));
router.put('/:id', isAuth, WhatsAppProviderController.update.bind(WhatsAppProviderController));
router.delete('/:id', isAuth, WhatsAppProviderController.remove.bind(WhatsAppProviderController));

// Conexão e status
router.post('/:id/connect', isAuth, WhatsAppProviderController.connect.bind(WhatsAppProviderController));
router.post('/:id/disconnect', isAuth, WhatsAppProviderController.disconnect.bind(WhatsAppProviderController));
router.get('/:id/status', isAuth, WhatsAppProviderController.getStatus.bind(WhatsAppProviderController));
router.get('/:id/qrcode', isAuth, WhatsAppProviderController.getQRCode.bind(WhatsAppProviderController));

// Mensagens
router.post('/:id/send', isAuth, WhatsAppProviderController.sendMessage.bind(WhatsAppProviderController));

// Estatísticas
router.get('/:id/stats', isAuth, WhatsAppProviderController.getStats.bind(WhatsAppProviderController));

export default router;