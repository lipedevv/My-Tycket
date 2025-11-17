// frontend/src/components/WhatsAppProviderSelector.tsx
// Componente React para seleção visual do provider WhatsApp

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Alert,
  Chip,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

interface ProviderConfig {
  type: 'baileys' | 'hub';
  name: string;
  isActive: boolean;
  isDefault: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnection?: string;
  messagesSent: number;
  monthlyCost?: number;
}

const WhatsAppProviderSelector: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([
    {
      type: 'baileys',
      name: 'WhatsApp Web (Grátis)',
      isActive: true,
      isDefault: true,
      status: 'connected',
      lastConnection: new Date().toISOString(),
      messagesSent: 1250
    },
    {
      type: 'hub',
      name: 'WhatsApp Oficial (Notifica-me)',
      isActive: false,
      isDefault: false,
      status: 'disconnected',
      messagesSent: 0,
      monthlyCost: 50.00
    }
  ]);

  const [selectedProvider, setSelectedProvider] = useState<string>('baileys');
  const [migrationInProgress, setMigrationInProgress] = useState(false);

  // Simular atualização de status
  useEffect(() => {
    const interval = setInterval(() => {
      setProviders(prev => prev.map(provider => ({
        ...provider,
        status: Math.random() > 0.9 ?
          (provider.status === 'connected' ? 'connecting' : 'connected') :
          provider.status
      })));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'connecting':
        return <SyncIcon color="warning" />;
      case 'disconnected':
        return <ErrorIcon color="disabled" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ErrorIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleProviderChange = (providerType: string) => {
    setSelectedProvider(providerType);
  };

  const handleToggleProvider = async (providerType: string) => {
    setProviders(prev => prev.map(provider =>
      provider.type === providerType
        ? { ...provider, isActive: !provider.isActive }
        : provider
    ));

    // Simular chamada à API
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleSetDefault = async (providerType: string) => {
    setProviders(prev => prev.map(provider => ({
      ...provider,
      isDefault: provider.type === providerType
    })));

    setSelectedProvider(providerType);

    // Simular chamada à API
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleMigration = async (from: string, to: string) => {
    setMigrationInProgress(true);

    try {
      // Simular processo de migração
      await new Promise(resolve => setTimeout(resolve, 3000));

      setProviders(prev => prev.map(provider => {
        if (provider.type === from) {
          return { ...provider, isDefault: false };
        }
        if (provider.type === to) {
          return { ...provider, isDefault: true, isActive: true };
        }
        return provider;
      }));

      setSelectedProvider(to);
    } finally {
      setMigrationInProgress(false);
    }
  };

  const getProviderFeatures = (type: string) => {
    if (type === 'baileys') {
      return [
        { icon: <MoneyIcon />, text: '100% Gratuito', positive: true },
        { icon: <WhatsAppIcon />, text: 'WhatsApp Web', positive: true },
        { icon: <SecurityIcon />, text: 'Baixo risco de banimento', positive: true },
        { icon: <SpeedIcon />, text: 'Setup rápido', positive: true }
      ];
    } else {
      return [
        { icon: <SecurityIcon />, text: 'API Oficial Meta', positive: true },
        { icon: <CloudUploadIcon />, text: 'Alta confiabilidade', positive: true },
        { icon: <SyncIcon />, text: 'Suporte 24/7', positive: true },
        { icon: <MoneyIcon />, text: 'Custo por mensagem', positive: false }
      ];
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Configuração do WhatsApp
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Escolha e configure seu provider WhatsApp. Você pode usar o Baileys (grátis) ou o Notifica-me Hub (oficial).
      </Typography>

      {/* Alerta informativo */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Dica:</strong> Comece com Baileys (grátis) e migre para Notifica-me Hub quando precisar de maior estabilidade ou mais canais.
        </Typography>
      </Alert>

      {/* Cards dos Providers */}
      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} md={6} key={provider.type}>
            <Card
              sx={{
                height: '100%',
                border: selectedProvider === provider.type ? 2 : 1,
                borderColor: selectedProvider === provider.type ? 'primary.main' : 'grey.300'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">
                    {provider.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(provider.status)}
                    <Chip
                      label={provider.status}
                      color={getStatusColor(provider.status) as any}
                      size="small"
                    />
                    {provider.isDefault && (
                      <Chip label="Padrão" color="primary" size="small" />
                    )}
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={provider.isActive}
                      onChange={() => handleToggleProvider(provider.type)}
                      disabled={migrationInProgress}
                    />
                  }
                  label="Ativo"
                />

                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status da conexão
                  </Typography>
                  <Typography variant="body1">
                    {provider.status === 'connected' && 'Conectado e funcionando'}
                    {provider.status === 'connecting' && 'Conectando...'}
                    {provider.status === 'disconnected' && 'Desconectado'}
                    {provider.status === 'error' && 'Erro na conexão'}
                  </Typography>
                </Box>

                {provider.monthlyCost && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Custo estimado por mês
                    </Typography>
                    <Typography variant="h6" color="primary">
                      R$ {provider.monthlyCost.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Mensagens enviadas
                  </Typography>
                  <Typography variant="body1">
                    {provider.messagesSent.toLocaleString('pt-BR')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Características
                </Typography>
                <List dense>
                  {getProviderFeatures(provider.type).map((feature, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box color={feature.positive ? 'success.main' : 'warning.main'}>
                          {feature.icon}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.text}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          color: feature.positive ? 'text.primary' : 'text.secondary'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant={selectedProvider === provider.type ? "contained" : "outlined"}
                    onClick={() => handleProviderChange(provider.type)}
                    disabled={!provider.isActive || migrationInProgress}
                    fullWidth
                  >
                    Selecionar
                  </Button>
                  {!provider.isDefault && provider.isActive && (
                    <Button
                      variant="text"
                      onClick={() => handleSetDefault(provider.type)}
                      disabled={migrationInProgress}
                    >
                      Tornar Padrão
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Ações de Migração */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Migração de Providers
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            A migração irá alterar o provider padrão. Mensagens futuras serão enviadas pelo novo provider.
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {providers.filter(p => p.type !== selectedProvider && p.isActive).map(provider => (
            <Button
              key={`migrate-from-${provider.type}`}
              variant="contained"
              color="secondary"
              onClick={() => handleMigration(provider.type, selectedProvider)}
              disabled={migrationInProgress || provider.type === selectedProvider}
              startIcon={<SyncIcon />}
            >
              Migrar: {provider.name} → {providers.find(p => p.type === selectedProvider)?.name}
            </Button>
          ))}
        </Box>

        {migrationInProgress && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Migração em andamento... Por favor, aguarde. Este processo pode levar alguns segundos.
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>

      {/* Configurações Avançadas */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Configurações Avançadas
        </Typography>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tentativas de Reconexão</InputLabel>
                  <Select defaultValue={3}>
                    <MenuItem value={1}>1 tentativa</MenuItem>
                    <MenuItem value={3}>3 tentativas</MenuItem>
                    <MenuItem value={5}>5 tentativas</MenuItem>
                    <MenuItem value={10}>10 tentativas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Timeout de Conexão (segundos)</InputLabel>
                  <Select defaultValue={60}>
                    <MenuItem value={30}>30 segundos</MenuItem>
                    <MenuItem value={60}>60 segundos</MenuItem>
                    <MenuItem value={120}>120 segundos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Fallback automático para backup"
                />
                <Typography variant="body2" color="text.secondary">
                  Se o provider principal falhar, usar automaticamente o backup configurado.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default WhatsAppProviderSelector;