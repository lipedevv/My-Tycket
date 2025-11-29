import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  InputAdornment,
  Tooltip,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
} from "@material-ui/core";
import {
  WhatsApp,
  Router,
  ExpandMore,
  Visibility,
  VisibilityOff,
  Info,
  Security,
  Webhook,
  Settings,
  HelpOutline,
  CloudQueue,
  VpnKey,
  Phone,
  Language,
  Sync,
} from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    "& .MuiDialogTitle-root": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  tabPanel: {
    padding: theme.spacing(2),
  },
  providerTypeCard: {
    padding: theme.spacing(2),
    border: `2px solid ${theme.palette.divider}`,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
    '&.selected': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
    },
  },
  providerTypeIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(1),
  },
  helperText: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  fieldGroup: {
    marginBottom: theme.spacing(2),
  },
  badgeCard: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  formControl: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  accordionDetails: {
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-form-tabpanel-${index}`}
      aria-labelledby={`provider-form-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={2}>{children}</Box>}
    </div>
  );
};

const WhatsAppProviderModal = ({ open, onClose, providerId, onSuccess }) => {
  const classes = useStyles();
  const [loading, saving, setSaving] = useState(false);
  const [providerType, setProviderType] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [showSecrets, setShowSecrets] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    isActive: true,
    isDefault: false,
    priority: 1,
    settings: {},
  });

  const [baileysData, setBaileysData] = useState({
    sessionId: '',
    deviceName: '',
    number: '',
  });

  const [hubData, setHubData] = useState({
    connectionId: '',
    apiKey: '',
    instanceId: '',
    webhookUrl: '',
    webhookSecret: '',
    channels: ['whatsapp'],
  });

  // Carregar provider se for edição
  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId || !open) return;

      try {
        setSaving(true);
        const { data } = await api.get(`/whatsapp-provider/${providerId}`);

        setFormData({
          name: data.name || '',
          type: data.type || '',
          isActive: data.isActive ?? true,
          isDefault: data.isDefault ?? false,
          priority: data.priority || 1,
          settings: data.settings || {},
        });

        setProviderType(data.type || '');

        if (data.type === 'baileys') {
          setBaileysData({
            sessionId: data.sessionId || '',
            deviceName: data.deviceName || '',
            number: data.number || '',
          });
        } else if (data.type === 'hub') {
          setHubData({
            connectionId: data.connectionId || '',
            apiKey: data.apiKey || '',
            instanceId: data.instanceId || '',
            webhookUrl: data.webhookUrl || '',
            webhookSecret: data.webhookSecret || '',
            channels: data.channels || ['whatsapp'],
          });
        }
      } catch (err) {
        toastError(err);
      } finally {
        setSaving(false);
      }
    };

    fetchProvider();
  }, [providerId, open]);

  // Resetar formulário ao abrir para novo provider
  useEffect(() => {
    if (!providerId && open) {
      setFormData({
        name: '',
        type: '',
        isActive: true,
        isDefault: false,
        priority: 1,
        settings: {},
      });
      setBaileysData({
        sessionId: '',
        deviceName: '',
        number: '',
      });
      setHubData({
        connectionId: '',
        apiKey: '',
        instanceId: '',
        webhookUrl: '',
        webhookSecret: '',
        channels: ['whatsapp'],
      });
      setProviderType('');
      setCurrentTab(0);
    }
  }, [providerId, open]);

  const handleProviderTypeSelect = (type) => {
    setProviderType(type);
    setFormData(prev => ({ ...prev, type }));
    setCurrentTab(type === 'baileys' ? 1 : 2);
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBaileysChange = (field) => (event) => {
    setBaileysData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleHubChange = (field) => (event) => {
    const value = field === 'channels' ? event.target.value : event.target.value;
    setHubData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSecretVisibility = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const generateSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const sessionId = `session_${timestamp}_${random}`;
    setBaileysData(prev => ({ ...prev, sessionId }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('O nome do provider é obrigatório');
      return false;
    }

    if (!providerType) {
      toast.error('Selecione um tipo de provider');
      return false;
    }

    if (providerType === 'baileys') {
      if (!baileysData.sessionId.trim()) {
        toast.error('O Session ID é obrigatório para Baileys');
        return false;
      }
    }

    if (providerType === 'hub') {
      const requiredHubFields = ['connectionId', 'apiKey', 'instanceId'];
      for (const field of requiredHubFields) {
        if (!hubData[field].trim()) {
          toast.error(`O campo ${field} é obrigatório para Notifica-me Hub`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        ...formData,
        type: providerType,
        ...(providerType === 'baileys' ? baileysData : hubData),
      };

      let response;
      if (providerId) {
        response = await api.put(`/whatsapp-provider/${providerId}`, payload);
        toast.success('Provider atualizado com sucesso');
      } else {
        response = await api.post('/whatsapp-provider', payload);
        toast.success('Provider criado com sucesso');
      }

      onSuccess?.(response.data);
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>Carregando...</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" py={4}>
            <Typography>Carregando dados do provider...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} maxWidth="lg" fullWidth className={classes.root}>
      <DialogTitle>
        {providerId ? 'Editar Provider' : 'Novo WhatsApp Provider'}
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Informações Básicas" />
          <Tab
            label="Baileys"
            disabled={!providerType && currentTab !== 1}
            icon={<WhatsApp />}
          />
          <Tab
            label="Notifica-me Hub"
            disabled={!providerType && currentTab !== 2}
            icon={<Router />}
          />
        </Tabs>

        <Divider />

        {/* Tab 0: Informações Básicas */}
        <TabPanel value={currentTab} index={0}>
          <div className={classes.form}>
            {!providerId && (
              <Box mb={3}>
                <Typography className={classes.sectionTitle}>
                  <VpnKey />
                  Tipo de Provider
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper
                      className={`${classes.providerTypeCard} ${
                        providerType === 'baileys' ? 'selected' : ''
                      }`}
                      onClick={() => handleProviderTypeSelect('baileys')}
                    >
                      <WhatsApp className={classes.providerTypeIcon} color="primary" />
                      <Typography variant="h6">Baileys</Typography>
                      <Typography variant="body2" color="textSecondary">
                        WhatsApp Web (Gratuito)
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label="Open Source"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label="100% Gratuito"
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper
                      className={`${classes.providerTypeCard} ${
                        providerType === 'hub' ? 'selected' : ''
                      }`}
                      onClick={() => handleProviderTypeSelect('hub')}
                    >
                      <Router className={classes.providerTypeIcon} color="primary" />
                      <Typography variant="h6">Notifica-me Hub</Typography>
                      <Typography variant="body2" color="textSecondary">
                        API Oficial (Pago)
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label="Multi-canal"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label="12+ Canais"
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome do Provider"
                  variant="outlined"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                  helperText="Nome identificador para este provider"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Prioridade"
                  type="number"
                  variant="outlined"
                  fullWidth
                  value={formData.priority}
                  onChange={handleInputChange('priority')}
                  helperText="1 = Mais alta"
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl variant="outlined" className={classes.formControl}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => handleInputChange('isActive')({
                      target: { value: e.target.value === 'active' }
                    })}
                    label="Status"
                  >
                    <MenuItem value="active">Ativo</MenuItem>
                    <MenuItem value="inactive">Inativo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isDefault}
                    onChange={handleInputChange('isDefault')}
                    color="primary"
                  />
                }
                label="Definir como provider padrão"
              />
              <Typography variant="caption" color="textSecondary">
                {providerType ? `Tipo selecionado: ${providerType.toUpperCase()}` : 'Nenhum tipo selecionado'}
              </Typography>
            </Box>
          </div>
        </TabPanel>

        {/* Tab 1: Configurações Baileys */}
        <TabPanel value={currentTab} index={1}>
          <div className={classes.form}>
            <Typography className={classes.sectionTitle}>
              <WhatsApp />
              Configurações Baileys
            </Typography>

            <div className={classes.badgeCard}>
              <Box display="flex" alignItems="center" mb={1}>
                <Info color="primary" style={{ marginRight: 8 }} />
                <Typography variant="subtitle2">Sobre Baileys</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Baileys é uma biblioteca JavaScript para WhatsApp Web usando reverse engineering.
                É 100% gratuita mas pode ter limitações de estabilidade e bloqueios pelo WhatsApp.
              </Typography>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Session ID"
                  variant="outlined"
                  fullWidth
                  value={baileysData.sessionId}
                  onChange={handleBaileysChange('sessionId')}
                  required
                  helperText="Identificador único da sessão"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={generateSessionId}
                          startIcon={<Sync />}
                        >
                          Gerar
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Nome do Dispositivo"
                  variant="outlined"
                  fullWidth
                  value={baileysData.deviceName}
                  onChange={handleBaileysChange('deviceName')}
                  helperText="Nome que aparecerá no WhatsApp"
                />
              </Grid>
            </Grid>

            <TextField
              label="Número de Telefone"
              variant="outlined"
              fullWidth
              value={baileysData.number}
              onChange={handleBaileysChange('number')}
              helperText="Número com DDD e código do país (ex: 5511999998888)"
              placeholder="5511999998888"
            />

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography className={classes.sectionTitle}>
                  <Settings />
                  Configurações Avançadas
                </Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.accordionDetails}>
                <TextField
                  label="Webhook URL"
                  variant="outlined"
                  fullWidth
                  value={formData.settings?.webhookUrl || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, webhookUrl: e.target.value }
                  }))}
                  helperText="URL para receber webhooks deste provider"
                  placeholder="https://seu-dominio.com/webhooks/baileys"
                />

                <TextField
                  label="Timeout de Conexão (ms)"
                  type="number"
                  variant="outlined"
                  fullWidth
                  value={formData.settings?.connectionTimeout || 30000}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, connectionTimeout: parseInt(e.target.value) }
                  }))}
                  helperText="Tempo máximo para tentativa de conexão"
                  InputProps={{ inputProps: { min: 5000, max: 120000 } }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.autoReconnect ?? true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, autoReconnect: e.target.checked }
                      }))}
                      color="primary"
                    />
                  }
                  label="Reconexão automática"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.saveMessages ?? true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, saveMessages: e.target.checked }
                      }))}
                      color="primary"
                    />
                  }
                  label="Salvar mensagens no banco"
                />
              </AccordionDetails>
            </Accordion>
          </div>
        </TabPanel>

        {/* Tab 2: Configurações Hub */}
        <TabPanel value={currentTab} index={2}>
          <div className={classes.form}>
            <Typography className={classes.sectionTitle}>
              <Router />
              Configurações Notifica-me Hub
            </Typography>

            <div className={classes.badgeCard}>
              <Box display="flex" alignItems="center" mb={1}>
                <CloudQueue color="primary" style={{ marginRight: 8 }} />
                <Typography variant="subtitle2">Sobre Notifica-me Hub</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Hub é uma plataforma omnichannel que oferece integração oficial com WhatsApp
                e mais 12 canais de comunicação. Requer contratação do serviço.
              </Typography>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Connection ID"
                  variant="outlined"
                  fullWidth
                  value={hubData.connectionId}
                  onChange={handleHubChange('connectionId')}
                  required
                  helperText="ID da conexão no Hub"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Instance ID"
                  variant="outlined"
                  fullWidth
                  value={hubData.instanceId}
                  onChange={handleHubChange('instanceId')}
                  required
                  helperText="ID da instância no Hub"
                />
              </Grid>
            </Grid>

            <TextField
              label="API Key"
              variant="outlined"
              fullWidth
              type={showSecrets.apiKey ? 'text' : 'password'}
              value={hubData.apiKey}
              onChange={handleHubChange('apiKey')}
              required
              helperText={
                <span className={classes.helperText}>
                  <HelpOutline fontSize="small" />
                  Chave de API do Hub
                </span>
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => toggleSecretVisibility('apiKey')}
                      edge="end"
                    >
                      {showSecrets.apiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Webhook URL"
                  variant="outlined"
                  fullWidth
                  value={hubData.webhookUrl}
                  onChange={handleHubChange('webhookUrl')}
                  helperText="URL para receber webhooks do Hub"
                  placeholder="https://seu-dominio.com/webhooks/hub"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Webhook Secret"
                  variant="outlined"
                  fullWidth
                  type={showSecrets.webhookSecret ? 'text' : 'password'}
                  value={hubData.webhookSecret}
                  onChange={handleHubChange('webhookSecret')}
                  helperText={
                    <span className={classes.helperText}>
                      <Security fontSize="small" />
                      Segredo para validar webhooks
                    </span>
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleSecretVisibility('webhookSecret')}
                          edge="end"
                        >
                          {showSecrets.webhookSecret ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <FormControl variant="outlined" className={classes.formControl}>
              <InputLabel>Canais Disponíveis</InputLabel>
              <Select
                multiple
                value={hubData.channels}
                onChange={handleHubChange('channels')}
                label="Canais Disponíveis"
                renderValue={(selected) => (
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="telegram">Telegram</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="email">E-mail</MenuItem>
                <MenuItem value="whatsapp_business">WhatsApp Business</MenuItem>
                <MenuItem value="messenger">Messenger</MenuItem>
              </Select>
              <Typography variant="caption" color="textSecondary">
                Selecione os canais que este provider irá atender
              </Typography>
            </FormControl>
          </div>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={saving || !providerType}
        >
          {saving ? (
            <>
              <CircularProgress size={20} style={{ marginRight: 8 }} />
              Salvando...
            </>
          ) : providerId ? 'Atualizar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppProviderModal;