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
  Tooltip,
  CircularProgress,
  Backdrop,
  Paper,
  LinearProgress,
  Fab
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
  AttachMoney as MoneyIcon,
  QrCodeScanner as QrCodeIcon,
  SwapHoriz as SwapHorizIcon,
  SmartToy as BotIcon,
  Email as EmailIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const WhatsAppProviderSelector = () => {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerStats, setProviderStats] = useState({});

  useEffect(() => {
    loadProviders();
    loadStats();

    // Atualizar stats a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProviders = async () => {
    try {
      const response = await api.get('/whatsapp/providers');
      setProviders(response.data.providers || []);

      // Selecionar provider padrão
      const defaultProvider = response.data.providers.find(p => p.isDefault);
      if (defaultProvider) {
        setSelectedProvider(`${defaultProvider.type}_${defaultProvider.name}`);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Erro ao carregar providers WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/whatsapp/providers/stats');
      setProviderStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusIcon = (status) => {
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

  const getStatusColor = (status) => {
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

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
  };

  const handleToggleProvider = async (provider) => {
    try {
      setSaving(true);

      await api.put(`/whatsapp/providers/${provider.type}/${provider.name}/toggle`, {
        active: !provider.isActive
      });

      await loadProviders();

      toast.success(
        `Provider ${provider.isActive ? 'desativado' : 'ativado'} com sucesso`
      );
    } catch (error) {
      console.error('Error toggling provider:', error);
      toast.error('Erro ao alterar status do provider');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (provider) => {
    try {
      setSaving(true);

      await api.put(`/whatsapp/providers/${provider.type}/${provider.name}/default`);

      await loadProviders();
      setSelectedProvider(`${provider.type}_${provider.name}`);

      toast.success('Provider padrão alterado com sucesso');
    } catch (error) {
      console.error('Error setting default provider:', error);
      toast.error('Erro ao definir provider padrão');
    } finally {
      setSaving(false);
    }
  };

  const handleMigration = async (fromProvider, toProvider) => {
    try {
      setMigrationInProgress(true);

      await api.post('/whatsapp/providers/migrate', {
        fromType: fromProvider.type,
        fromName: fromProvider.name,
        toType: toProvider.type,
        toName: toProvider.name
      });

      await loadProviders();
      setSelectedProvider(`${toProvider.type}_${toProvider.name}`);

      toast.success('Migração concluída com sucesso');
    } catch (error) {
      console.error('Error migrating provider:', error);
      toast.error('Erro durante a migração');
    } finally {
      setMigrationInProgress(false);
    }
  };

  const handleConnectProvider = async (provider) => {
    if (provider.type === 'baileys') {
      try {
        const response = await api.post(`/whatsapp/providers/baileys/${provider.name}/connect`);

        if (response.data.qrcode) {
          // Mostrar QR Code em modal ou componente
          toast.info('QR Code gerado. Escaneie com seu WhatsApp.');
        }

        await loadProviders();
      } catch (error) {
        toast.error('Erro ao conectar provider');
      }
    }
  };

  const getProviderFeatures = (type) => {
    if (type === 'baileys') {
      return [
        { icon: <MoneyIcon />, text: '100% Gratuito', positive: true },
        { icon: <WhatsAppIcon />, text: 'WhatsApp Web', positive: true },
        { icon: <SecurityIcon />, text: 'Baixo risco de banimento', positive: true },
        { icon: <SpeedIcon />, text: 'Setup rápido', positive: true }
      ];
    } else if (type === 'hub') {
      return [
        { icon: <SecurityIcon />, text: 'API Oficial Meta', positive: true },
        { icon: <CloudUploadIcon />, text: 'Alta confiabilidade', positive: true },
        { icon: <SyncIcon />, text: 'Suporte 24/7', positive: true },
        { icon: <BotIcon />, text: 'Múltiplos canais', positive: true }
      ];
    }
    return [];
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'whatsapp': return <WhatsAppIcon />;
      case 'instagram': return <InstagramIcon />;
      case 'facebook': return <FacebookIcon />;
      case 'email': return <EmailIcon />;
      default: return <WhatsAppIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Configuração do WhatsApp
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simples' : 'Avançado'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SwapHorizIcon />}
            sx={{ ml: 2 }}
            onClick={() => {/* Abrir modal de migração */}}
          >
            Migrar Provider
          </Button>
        </Box>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Escolha e configure seu provider WhatsApp. Você pode usar o Baileys (grátis) ou o Notifica-me Hub (oficial).
      </Typography>

      {/* Alerta informativo */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Dica:</strong> Comece com Baileys (grátis) e migre para Notifica-me Hub quando precisar de maior estabilidade ou mais canais.
        </Typography>
      </Alert>

      {/* Stats Dashboard */}
      {providerStats.generalStats && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Estatísticas Gerais
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {providerStats.generalStats.totalProviders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Providers
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {providerStats.generalStats.connectedProviders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Conectados
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {providerStats.generalStats.providersByType.baileys}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Baileys
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {providerStats.generalStats.providersByType.hub}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hub
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Cards dos Providers */}
      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} md={6} key={`${provider.type}_${provider.name}`}>
            <Card
              sx={{
                height: '100%',
                border: selectedProvider === `${provider.type}_${provider.name}` ? 2 : 1,
                borderColor: selectedProvider === `${provider.type}_${provider.name}` ? 'primary.main' : 'grey.300',
                position: 'relative'
              }}
            >
              {provider.isDefault && (
                <Chip
                  label="PADRÃO"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1
                  }}
                />
              )}

              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                    {getChannelIcon(provider.channel || 'whatsapp')}
                    {provider.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(provider.status)}
                    <Chip
                      label={provider.status}
                      color={getStatusColor(provider.status)}
                      size="small"
                    />
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={provider.isActive}
                      onChange={() => handleToggleProvider(provider)}
                      disabled={migrationInProgress || saving}
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

                {provider.number && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Número
                    </Typography>
                    <Typography variant="body1">
                      {provider.number}
                    </Typography>
                  </Box>
                )}

                {provider.messagesCount !== undefined && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Mensagens enviadas
                    </Typography>
                    <Typography variant="body1">
                      {provider.messagesCount.toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                )}

                {provider.type === 'hub' && provider.channels && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Canais Disponíveis
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {provider.channels.map((channel) => (
                        <Chip
                          key={channel}
                          label={channel}
                          size="small"
                          icon={getChannelIcon(channel)}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

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
                    variant={selectedProvider === `${provider.type}_${provider.name}` ? "contained" : "outlined"}
                    onClick={() => handleProviderChange(`${provider.type}_${provider.name}`)}
                    disabled={!provider.isActive || migrationInProgress || saving}
                    fullWidth
                  >
                    Selecionar
                  </Button>

                  {!provider.isDefault && provider.isActive && (
                    <Button
                      variant="text"
                      onClick={() => handleSetDefault(provider)}
                      disabled={migrationInProgress || saving}
                    >
                      Tornar Padrão
                    </Button>
                  )}

                  {provider.status === 'disconnected' && provider.isActive && (
                    <Button
                      variant="text"
                      onClick={() => handleConnectProvider(provider)}
                      disabled={saving}
                      startIcon={<QrCodeIcon />}
                    >
                      Conectar
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Configurações Avançadas */}
      {showAdvanced && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Configurações Avançadas
          </Typography>

          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
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

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Timeout de Conexão (segundos)</InputLabel>
                    <Select defaultValue={60}>
                      <MenuItem value={30}>30 segundos</MenuItem>
                      <MenuItem value={60}>60 segundos</MenuItem>
                      <MenuItem value={120}>120 segundos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Failover Automático</InputLabel>
                    <Select defaultValue={true}>
                      <MenuItem value={true}>Ativado</MenuItem>
                      <MenuItem value={false}>Desativado</MenuItem>
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

                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Modo de depuração"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Habilita logs detalhados para troubleshooting.
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => {/* Salvar configurações */}}>
                  Salvar Configurações
                </Button>
                <Button variant="outlined" onClick={() => {/* Testar conexão */}}>
                  Testar Conexão
                </Button>
                <Button variant="outlined" color="error" onClick={() => {/* Resetar configurações */}}>
                  Resetar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* FAB para adicionar novo provider */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16
        }}
        onClick={() => {/* Abrir modal de adicionar provider */}}
      >
        <AddIcon />
      </Fab>

      {/* Backdrop para loading */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={migrationInProgress || saving}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress color="inherit" />
          <Typography variant="h6">
            {migrationInProgress ? 'Migrando provider...' : 'Salvando...'}
          </Typography>
          <LinearProgress sx={{ width: 300 }} />
        </Box>
      </Backdrop>
    </Box>
  );
};

export default WhatsAppProviderSelector;