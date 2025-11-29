import AppError from '../../errors/AppError';
import { Provider } from '../../models';
import { sequelize } from 'sequelize';
import { Op } from 'sequelize';

class DeleteWhatsAppProviderService {
  async execute(providerId: number | string, companyId: number): Promise<void> {
    try {
      const transaction = await sequelize.transaction();

      try {
        // Verificar se provider existe
        const provider = await Provider.findOne({
          where: {
            id: providerId,
            companyId
          },
          transaction
        });

        if (!provider) {
          await transaction.rollback();
          throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
        }

        // Se for o único provider ativo, não permitir exclusão
        const activeProvidersCount = await Provider.count({
          where: {
            companyId,
            id: { [Op.ne]: providerId },
            isActive: true
          },
          transaction
        });

        if (activeProvidersCount === 0) {
          await transaction.rollback();
          throw new AppError('ERR_CANNOT_DELETE_ONLY_ACTIVE_PROVIDER', 400);
        }

        // Se for o provider padrão, definir outro como padrão
        if (provider.isDefault) {
          const newDefaultProvider = await Provider.findOne({
            where: {
              companyId,
              id: { [Op.ne]: providerId },
              isActive: true
            },
            order: [['isDefault', 'DESC'], ['priority', 'DESC'], ['createdAt', 'ASC']],
            transaction
          });

          if (newDefaultProvider) {
            await newDefaultProvider.update(
              { isDefault: true },
              { transaction }
            );
          }
        }

        // Excluir provider
        await Provider.destroy({
          where: {
            id: providerId,
            companyId
          },
          transaction
        });

        await transaction.commit();

      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting WhatsApp provider:', error);
      throw new AppError('ERR_DELETE_PROVIDER', 500);
    }
  }
}

export default DeleteWhatsAppProviderService;