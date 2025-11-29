import { Ticket } from '../models';
import { Message } from '../models';
import { Contact } from '../models';
import { WhatsAppProviderService } from './WhatsAppProviderService';
import logger from '../utils/logger';
import featureFlags from '../config/featureFlags';

interface CreateTicketData {
  contactId: number;
  companyId: number;
  userId?: number;
  queueId?: number;
  status?: string;
  lastMessage?: string;
  providerType?: 'baileys' | 'hub';
  channel?: string;
}

interface SendMessageData {
  ticketId: number;
  body: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  quotedMsgId?: string;
  userId?: number;
  providerType?: 'baileys' | 'hub';
  connectionId?: string;
}

interface TicketUpdateData {
  status?: string;
  userId?: number;
  queueId?: number;
  providerType?: 'baileys' | 'hub';
  channel?: string;
}

class WhatsAppTicketService {
  private providerService: WhatsAppProviderService;

  constructor() {
    this.providerService = WhatsAppProviderService.getInstance();
  }

  /**
   * Cria um novo ticket com integração ao provider
   */
  async createTicket(ticketData: CreateTicketData): Promise<Ticket> {
    try {
      if (!featureFlags.isEnabled('useProvidersSystem')) {
        // Fallback para sistema atual sem providers
        return await this.createTicketLegacy(ticketData);
      }

      // Criar ticket com dados do provider
      const providerType = ticketData.providerType || 'baileys';
      const channel = ticketData.channel || 'whatsapp';

      const [ticket] = await Ticket.create({
        ...ticketData,
        providerType,
        channel,
        isHub: providerType === 'hub',
        hubChannelId: providerType === 'hub' ? `${providerType}_${ticketData.contactId}` : null,
        flowIntegrationId: null, // Será definido pelo FlowBuilder
        isFlowActive: false,
        flowNodeId: null,
        originType: 'api',
        sourceData: {
          provider: providerType,
          channel
        }
      }, {
        include: [
          {
            model: Contact,
            as: 'contact'
          }
        ]
      });

      logger.info(`Ticket created with provider integration`, {
        ticketId: ticket.id,
        providerType,
        channel,
        isHub: ticket.isHub
      });

      return ticket;

    } catch (error) {
      logger.error('Error creating ticket with provider integration', error);
      throw error;
    }
  }

  /**
   * Envia mensagem com roteamento via provider
   */
  async sendMessage(messageData: SendMessageData): Promise<any> {
    try {
      if (!featureFlags.isEnabled('useProvidersSystem')) {
        // Fallback para sistema atual sem providers
        return await this.sendMessageLegacy(messageData);
      }

      // Obter ticket para obter informações do contact
      const ticket = await Ticket.findByPk(messageData.ticketId, {
        include: [
          {
            model: Contact,
            as: 'contact'
          }
        ]
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Montar dados da mensagem
      const message = {
        body: messageData.body,
        number: ticket.contact.number,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        quotedMsg: messageData.quotedMsgId,
        messageId: messageData.quotedMsgId,
        ticketId: messageData.ticketId,
        companyId: ticket.companyId,
        providerType: messageData.providerType || ticket.providerType,
        connectionId: messageData.connectionId
      };

      // Enviar via provider service
      const result = await this.providerService.sendMessage(message);

      // Salvar mensagem no banco se for bem-sucedido
      await Message.create({
        id: result.id,
        body: messageData.body,
        fromMe: true,
        ticketId: messageData.ticketId,
        contactId: ticket.contactId,
        companyId: ticket.companyId,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        quotedMsgId: messageData.quotedMsgId,
        ack: result.status || 'sent',
        providerType: message.providerType || ticket.providerType,
        channel: messageData.channel || ticket.channel
      });

      // Atualizar timestamp da última mensagem do ticket
      await ticket.update({
        lastMessageAt: new Date(),
        lastMessageFrom: messageData.userId ? 'user' : 'system'
      });

      logger.info(`Message sent via provider`, {
        ticketId: messageData.ticketId,
        messageId: result.id,
        provider: messageData.providerType || ticket.providerType
      });

      return result;

    } catch (error) {
      logger.error('Error sending message via provider', error);
      throw error;
    }
  }

  /**
   * Envia mídia com roteamento via provider
   */
  async sendMedia(messageData: SendMessageData): Promise<any> {
    try {
      if (!featureFlags.isEnabled('useProvidersSystem')) {
        // Fallback para sistema atual sem providers
        return await this.sendMediaLegacy(messageData);
      }

      // Obter ticket para obter informações do contact
      const ticket = await Ticket.findByPk(messageData.ticketId, {
        include: [
          {
            model: Contact,
            as: 'contact'
          }
        ]
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Montar dados da mídia
      const message = {
        body: messageData.body || '',
        number: ticket.contact.number,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        quotedMsg: messageData.quotedMsgId,
        messageId: messageData.quotedMsgId,
        ticketId: messageData.ticketId,
        companyId: ticket.companyId,
        providerType: messageData.providerType || ticket.providerType,
        connectionId: messageData.connectionId
      };

      // Enviar mídia via provider service
      const result = await this.providerService.sendMedia(message);

      // Salvar mensagem no banco se for bem-sucedido
      await Message.create({
        id: result.id,
        body: messageData.body || '',
        fromMe: true,
        ticketId: messageData.ticketId,
        contactId: ticket.contactId,
        companyId: ticket.companyId,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        quotedMsgId: messageData.quotedMsgId,
        ack: result.status || 'sent',
        providerType: messageData.providerType || ticket.providerType,
        channel: messageData.channel || ticket.channel
      });

      // Atualizar timestamp da última mensagem do ticket
      await ticket.update({
        lastMessageAt: new Date(),
        lastMessageFrom: messageData.userId ? 'user' : 'system'
      });

      logger.info(`Media sent via provider`, {
        ticketId: messageData.ticketId,
        messageId: result.id,
        mediaType: messageData.mediaType,
        provider: messageData.providerType || ticket.providerType
      });

      return result;

    } catch (error) {
      logger.error('Error sending media via provider', error);
      throw error;
    }
  }

  /**
   * Atualiza informações do ticket (incluindo provider)
   */
  async updateTicket(ticketId: number, updateData: TicketUpdateData): Promise<Ticket> {
    try {
      if (!featureFlags.isEnabled('useProvidersSystem')) {
        // Fallback para sistema atual
        return await this.updateTicketLegacy(ticketId, updateData);
      }

      const [ticket] = await Ticket.update(updateData, {
        where: { id: ticketId },
        returning: true
      });

      if (updateData.providerType) {
        ticket.providerType = updateData.providerType;
      }

      if (updateData.channel) {
        ticket.channel = updateData.channel;
        ticket.isHub = updateData.channel !== 'whatsapp';
      }

      logger.info(`Ticket updated with provider data`, {
        ticketId,
        providerType: updateData.providerType,
        channel: updateData.channel
      });

      return ticket;

    } catch (error) {
      logger.error('Error updating ticket with provider data', error);
      throw error;
    }
  }

  /**
   * Processa mensagem recebida do provider
   */
  async processWebhookMessage(webhookData: any, companyId: number): Promise<void> {
    try {
      const { contact, message, source, data } = webhookData;

      // Buscar ou criar contato
      let contactRecord = await Contact.findOne({
        where: {
          companyId,
          number: contact.number
        }
      });

      if (!contactRecord) {
        contactRecord = await Contact.create({
          name: contact.name || contact.number,
          number: contact.number,
          companyId,
          profilePicUrl: contact.profilePicUrl
        });
      }

      // Buscar ticket existente para o contato (aberto e sem resposta recente)
      const existingTicket = await this.findOpenTicketForContact(contactRecord.id, companyId);

      if (existingTicket) {
        // Atualizar ticket existente
        await existingTicket.update({
          lastMessageAt: new Date(),
          lastMessageFrom: 'contact'
        });

        // Salvar mensagem no ticket existente
        await Message.create({
          id: message.id,
          body: message.body,
          fromMe: false,
          ticketId: existingTicket.id,
          contactId: contactRecord.id,
          companyId,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
          quotedMsgId: message.quotedMsgId,
          providerType: source,
          channel: data.channel || 'whatsapp'
        });

        logger.info(`Message added to existing ticket`, {
          ticketId: existingTicket.id,
          messageId: message.id,
          provider: source
        });

      } else {
        // Criar novo ticket
        const providerType = data?.providerType || source;
        const channel = data?.channel || 'whatsapp';

        const [newTicket] = await Ticket.create({
          contactId: contactRecord.id,
          companyId,
          status: 'open',
          providerType,
          channel,
          isHub: providerType === 'hub',
          hubChannelId: providerType === 'hub' ? `${providerType}_${contactRecord.id}` : null,
          lastMessageAt: new Date(),
          lastMessageFrom: 'contact',
          originType: 'webhook',
          sourceData: {
            provider: source,
            channel,
            webhookData
          }
        });

        // Salvar mensagem no novo ticket
        await Message.create({
          id: message.id,
          body: message.body,
          fromMe: false,
          ticketId: newTicket.id,
          contactId: contactRecord.id,
          companyId,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
          quotedMsgId: message.quotedMsgId,
          providerType,
          channel
        });

        logger.info(`New ticket created from webhook`, {
          ticketId: newTicket.id,
          contactId: contactRecord.id,
          provider: source
        });

        // Se houver FlowBuilder ativo, verificar se deve iniciar fluxo
        if (featureFlags.isEnabled('useFlowEngine')) {
          await this.checkAndStartFlow(newTicket, message);
        }
      }

    } catch (error) {
      logger.error('Error processing webhook message', error);
      throw error;
    }
  }

  /**
   * Processa confirmação de leitura/mensagem
   */
  async processWebhookAck(ackData: any, companyId: number): Promise<void> {
    try {
      const { messageId, status, source } = ackData;

      // Atualizar mensagem correspondente
      const message = await Message.findOne({
        where: {
          id: messageId,
          companyId
        }
      });

      if (message) {
        await message.update({
          ack: status
        });

        // Se for mensagem lida (read), atualizar timestamp do ticket
        if (status === 'read') {
          await Ticket.update(
            { lastMessageAt: new Date() },
            {
              where: {
                id: message.ticketId
              }
            }
          );
        }

        logger.info(`Message acknowledgement processed`, {
          messageId,
          status,
          provider: source
        });
      }

    } catch (error) {
      logger.error('Error processing webhook ack', error);
      throw error;
    }
  }

  /**
   * Encontra ticket aberto para o contato
   */
  private async findOpenTicketForContact(contactId: number, companyId: number): Promise<Ticket | null> {
    try {
      return await Ticket.findOne({
        where: {
          contactId,
          companyId,
          status: ['open', 'pending'],
          [require('sequelize').Op.or]: [
            { lastMessageAt: null },
            {
              lastMessageAt: {
                [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas atrás
              }
            }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      logger.error('Error finding open ticket for contact', error);
      return null;
    }
  }

  /**
   * Verifica se deve iniciar um fluxo e o inicia
   */
  private async checkAndStartFlow(ticket: Ticket, message: any): Promise<void> {
    try {
      // Verificar se há integração de fluxo para a fila do ticket
      // Esta lógica será implementada quando o FlowBuilder estiver totalmente integrado

      if (ticket.queueId && featureFlags.isEnabled('useFlowEngine')) {
        // TODO: Implementar lógica para iniciar FlowBuilder aqui
        logger.info(`Flow check for ticket ${ticket.id}, queue ${ticket.queueId}`);
      }

    } catch (error) {
      logger.error('Error checking and starting flow', error);
      // Não propagar erro para não afetar o recebimento da mensagem
    }
  }

  /**
   * Fallback para criação de ticket sem providers
   */
  private async createTicketLegacy(ticketData: CreateTicketData): Promise<Ticket> {
    const [ticket] = await Ticket.create({
      ...ticketData,
      providerType: 'baileys', // Padrão legado
      channel: 'whatsapp',
      isHub: false,
      hubChannelId: null
    });

    return ticket;
  }

  /**
   * Fallback para envio de mensagem sem providers
   */
  private async sendMessageLegacy(messageData: SendMessageData): Promise<any> {
    // Implementar lógica do sistema atual
    logger.info('Sending message via legacy system');
    return { id: 'legacy_' + Date.now(), status: 'sent' };
  }

  /**
   * Fallback para envio de mídia sem providers
   */
  private async sendMediaLegacy(messageData: SendMessageData): Promise<any> {
    // Implementar lógica do sistema atual
    logger.info('Sending media via legacy system');
    return { id: 'legacy_media_' + Date.now(), status: 'sent' };
  }

  /**
   * Fallback para atualização de ticket sem providers
   */
  private async updateTicketLegacy(ticketId: number, updateData: TicketUpdateData): Promise<Ticket> {
    const [ticket] = await Ticket.update(updateData, {
      where: { id: ticketId },
      returning: true
    });

    return ticket;
  }

  /**
   * Obtém estatísticas de mensagens por provider
   */
  async getMessageStats(companyId: number): Promise<any> {
    try {
      const stats = await Message.findAll({
        where: { companyId },
        attributes: [
          'providerType',
          [require('sequelize').Op.fn('COUNT', '*'), 'count'],
          [require('sequelize').Op.fn('COUNT', [require('sequelize').Op.where({ fromMe: true }), 'sentCount'])]
        ],
        group: ['providerType']
      });

      return stats;

    } catch (error) {
      logger.error('Error getting message stats', error);
      return [];
    }
  }

  /**
   * Obtém tickets por provider
   */
  async getTicketsByProvider(companyId: number): Promise<Ticket[]> {
    try {
      const tickets = await Ticket.findAll({
        where: { companyId },
        include: [
          {
            model: Contact,
            as: 'contact'
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return tickets;

    } catch (error) {
      logger.error('Error getting tickets by provider', error);
      return [];
    }
  }
}

export default new WhatsAppTicketService();