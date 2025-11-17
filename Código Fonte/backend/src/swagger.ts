import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerUi } from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Dual Provider API',
      version: '2.0.0',
      description: `
        API completa para sistema de WhatsApp com dual provider (Baileys + Notifica-me Hub)
        e FlowBuilder para automação conversacional.

        ## Features
        - **Dual Provider Architecture**: Suporte para Baileys (gratuito) e Notifica-me Hub (pago)
        - **FlowBuilder**: Sistema visual de automação com drag-and-drop
        - **Multi-tenant**: Suporte para múltiplas empresas
        - **Real-time**: WebSocket para atualizações em tempo real
        - **Omnichannel**: Integração com 12+ canais via Notifica-me Hub

        ## Autenticação
        A API utiliza JWT Bearer Token para autenticação. Inclua o header:
        \`\`\`
        Authorization: Bearer <seu_token_jwt>
        \`\`\`

        ## Rate Limiting
        Endpoints de webhook são limitados a 100 requisições por minuto por IP.

        ## Status Codes
        - \`200\` - Sucesso
        - \`201\` - Recurso criado
        - \`400\` - Requisição inválida
        - \`401\` - Não autorizado
        - \`403\` - Proibido
        - \`404\` - Recurso não encontrado
        - \`429\` - Muitas requisições
        - \`500\` - Erro interno do servidor
      `,
      contact: {
        name: 'API Support',
        email: 'support@whatsapp-system.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:8080',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.whatsapp-system.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do usuário'
            },
            name: {
              type: 'string',
              description: 'Nome completo do usuário',
              example: 'João Silva'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
              example: 'joao@empresa.com'
            },
            profile: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'Perfil do usuário',
              example: 'user'
            },
            companyId: {
              type: 'string',
              format: 'uuid',
              description: 'ID da empresa do usuário'
            },
            isActive: {
              type: 'boolean',
              description: 'Se o usuário está ativo',
              example: true
            }
          }
        },
        Company: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da empresa'
            },
            name: {
              type: 'string',
              description: 'Nome da empresa',
              example: 'Minha Empresa LTDA'
            },
            document: {
              type: 'string',
              description: 'CNPJ ou CPF da empresa',
              example: '12.345.678/0001-90'
            },
            planId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do plano da empresa'
            },
            isActive: {
              type: 'boolean',
              description: 'Se a empresa está ativa',
              example: true
            }
          }
        },
        WhatsAppProvider: {
          type: 'object',
          required: ['name', 'provider', 'companyId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do provider'
            },
            name: {
              type: 'string',
              description: 'Nome identificador do provider',
              example: 'WhatsApp Principal'
            },
            provider: {
              type: 'string',
              enum: ['baileys', 'hub'],
              description: 'Tipo do provider'
            },
            companyId: {
              type: 'string',
              format: 'uuid',
              description: 'ID da empresa'
            },
            instanceId: {
              type: 'string',
              description: 'ID da instância (apenas para Hub)',
              example: 'hub_instance_123'
            },
            config: {
              type: 'object',
              description: 'Configurações específicas do provider'
            },
            status: {
              type: 'string',
              enum: ['connected', 'disconnected', 'connecting', 'error'],
              description: 'Status da conexão'
            },
            isDefault: {
              type: 'boolean',
              description: 'Se é o provider padrão da empresa',
              example: true
            }
          }
        },
        Flow: {
          type: 'object',
          required: ['name', 'companyId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do flow'
            },
            name: {
              type: 'string',
              description: 'Nome do fluxo',
              example: 'Boas-vindas'
            },
            description: {
              type: 'string',
              description: 'Descrição do fluxo',
              example: 'Fluxo de boas-vindas para novos contatos'
            },
            companyId: {
              type: 'string',
              format: 'uuid',
              description: 'ID da empresa'
            },
            nodes: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FlowNode'
              },
              description: 'Array de nós do fluxo'
            },
            edges: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FlowEdge'
              },
              description: 'Array de conexões entre nós'
            },
            isActive: {
              type: 'boolean',
              description: 'Se o fluxo está ativo',
              example: true
            },
            isPublished: {
              type: 'boolean',
              description: 'Se o fluxo está publicado',
              example: false
            },
            version: {
              type: 'integer',
              description: 'Versão do fluxo',
              example: 1
            },
            category: {
              type: 'string',
              enum: ['welcome', 'support', 'sales', 'marketing', 'feedback', 'other'],
              description: 'Categoria do fluxo'
            }
          }
        },
        FlowNode: {
          type: 'object',
          required: ['id', 'type', 'position', 'data'],
          properties: {
            id: {
              type: 'string',
              description: 'ID único do nó'
            },
            type: {
              type: 'string',
              enum: [
                'start', 'end', 'sendMessage', 'sendMedia', 'condition',
                'menu', 'delay', 'apiCall', 'webhook', 'variable',
                'validation', 'tag', 'queue', 'humanHandoff', 'analytics'
              ],
              description: 'Tipo do nó'
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' }
              },
              description: 'Posição do nó no canvas'
            },
            data: {
              type: 'object',
              description: 'Dados do nó (inclui label, config, etc.)'
            }
          }
        },
        FlowEdge: {
          type: 'object',
          required: ['id', 'source', 'target'],
          properties: {
            id: {
              type: 'string',
              description: 'ID único da conexão'
            },
            source: {
              type: 'string',
              description: 'ID do nó de origem'
            },
            target: {
              type: 'string',
              description: 'ID do nó de destino'
            },
            type: {
              type: 'string',
              enum: ['default', 'button', 'condition'],
              description: 'Tipo da conexão'
            },
            label: {
              type: 'string',
              description: 'Rótulo da conexão'
            }
          }
        },
        Ticket: {
          type: 'object',
          required: ['contactNumber', 'companyId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do ticket'
            },
            contactNumber: {
              type: 'string',
              description: 'Número do contato',
              example: '+5511999998888'
            },
            contactName: {
              type: 'string',
              description: 'Nome do contato',
              example: 'Cliente'
            },
            companyId: {
              type: 'string',
              format: 'uuid',
              description: 'ID da empresa'
            },
            status: {
              type: 'string',
              enum: ['open', 'pending', 'closed'],
              description: 'Status do ticket'
            },
            channel: {
              type: 'string',
              enum: ['whatsapp', 'instagram', 'facebook', 'telegram'],
              description: 'Canal de comunicação'
            },
            lastMessage: {
              type: 'string',
              description: 'Última mensagem do ticket'
            },
            lastMessageAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data/hora da última mensagem'
            },
            assignedUserId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário responsável'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['error', 'message'],
          properties: {
            error: {
              type: 'string',
              description: 'Tipo do erro',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              description: 'Mensagem de erro detalhada',
              example: 'O campo email é obrigatório'
            },
            details: {
              type: 'object',
              description: 'Detalhes adicionais do erro'
            }
          }
        },
        Success: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem de sucesso',
              example: 'Operação realizada com sucesso'
            },
            data: {
              type: 'object',
              description: 'Dados retornados pela operação'
            }
          }
        }
      },
      parameters: {
        CompanyId: {
          name: 'companyId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID da empresa'
        },
        FlowId: {
          name: 'flowId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID do fluxo'
        },
        ProviderId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID do provider'
        },
        TicketId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID do ticket'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Não autorizado - Token JWT inválido ou ausente',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'UnauthorizedError',
                message: 'Token inválido ou expirado'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'NotFoundError',
                message: 'Fluxo não encontrado'
              }
            }
          }
        },
        ValidationError: {
          description: 'Dados inválidos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'ValidationError',
                message: 'Dados inválidos',
                details: {
                  name: ['O campo nome é obrigatório'],
                  email: ['Email inválido']
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Muitas requisições',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'RateLimitError',
                message: 'Muitas requisições',
                details: {
                  retryAfter: 60
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/controllers/*.ts',
    './src/routes/*.ts',
    './src/models/*.ts'
  ]
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };