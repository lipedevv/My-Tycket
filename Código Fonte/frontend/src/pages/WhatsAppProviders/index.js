import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { makeStyles } from "@material-ui/core/styles";
import {
  green,
  blue,
  red,
  orange,
  deepPurple,
  grey,
  teal,
  indigo,
} from "@material-ui/core/colors";
import {
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Box,
  Divider,
  Typography,
  Tooltip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  useTheme,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Badge,
} from "@material-ui/core";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  Refresh,
  AddCircleOutline,
  SettingsBackupRestore,
  Phone,
  AccountCircle,
  Update,
  Brightness4,
  Brightness7,
  WhatsApp,
  Hub,
  Security,
  CloudQueue,
  Sync,
  PlayArrow,
  Stop,
  VpnKey,
  Language,
  Webhook,
  Assessment,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import ConfirmationModal from "../../components/ConfirmationModal";
import WhatsAppProviderModal from "../../components/WhatsAppProviderModal";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import formatSerializedId from '../../utils/formatSerializedId';
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import { SocketManager } from "../../context/Socket/SocketContext";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(3),
    overflowY: "auto",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.background.default,
  },
  gridContainer: {
    marginTop: theme.spacing(3),
  },
  providerCard: {
    borderRadius: 12,
    boxShadow: theme.shadows[2],
    transition: "all 0.3s ease",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: theme.shadows[6],
    },
  },
  cardHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardContent: {
    padding: theme.spacing(2),
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  cardActions: {
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    justifyContent: "flex-end",
    backgroundColor: theme.palette.background.paper,
  },
  avatar: {
    width: 40,
    height: 40,
    fontSize: 16,
    fontWeight: "bold",
    color: theme.palette.getContrastText(theme.palette.primary.main),
  },
  baileysAvatar: {
    backgroundColor: green[600],
  },
  hubAvatar: {
    backgroundColor: blue[600],
  },
  connectedStatus: {
    color: theme.palette.type === 'dark' ? green[400] : green[600],
  },
  disconnectedStatus: {
    color: theme.palette.type === 'dark' ? red[400] : red[600],
  },
  qrcodeStatus: {
    color: theme.palette.type === 'dark' ? blue[400] : blue[600],
  },
  timeoutStatus: {
    color: theme.palette.type === 'dark' ? orange[400] : orange[600],
  },
  openingStatus: {
    color: theme.palette.type === 'dark' ? deepPurple[400] : deepPurple[600],
  },
  defaultBadge: {
    backgroundColor: theme.palette.type === 'dark' ? green[800] : green[100],
    color: theme.palette.type === 'dark' ? green[100] : green[800],
    padding: "2px 8px",
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    marginLeft: theme.spacing(1),
  },
  activeBadge: {
    backgroundColor: theme.palette.type === 'dark' ? teal[800] : teal[100],
    color: theme.palette.type === 'dark' ? teal[100] : teal[800],
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1.5),
    "& svg": {
      marginRight: theme.spacing(1.5),
      color: theme.palette.text.secondary,
    },
  },
  primaryButton: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  secondaryButton: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  dangerButton: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.error.main}`,
    color: theme.palette.error.main,
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? theme.palette.error.dark : theme.palette.error.light,
    },
  },
  headerButtons: {
    display: "flex",
    gap: theme.spacing(2),
    alignItems: 'center',
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4),
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  statusIcon: {
    marginRight: theme.spacing(1.5),
  },
  progressBar: {
    marginTop: theme.spacing(1.5),
    borderRadius: 4,
    height: 6,
  },
  providerName: {
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2),
  },
  statItem: {
    textAlign: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  statLabel: {
    fontSize: 11,
    color: theme.palette.text.secondary,
  },
  tabPanel: {
    padding: theme.spacing(3),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  providerTypeChip: {
    margin: theme.spacing(0.5),
  },
  qrCanvas: {
    maxWidth: '100%',
    height: 'auto',
    marginTop: theme.spacing(2),
  },
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

const StatusIndicator = ({ status, providerType }) => {
  const classes = useStyles();
  const theme = useTheme();

  const getStatusData = () => {
    switch (status) {
      case "CONNECTED":
        return {
          icon: <SignalCellular4Bar className={classes.statusIcon} />,
          text: "Conectado",
          class: classes.connectedStatus,
          progress: 100,
        };
      case "DISCONNECTED":
        return {
          icon: <SignalCellularConnectedNoInternet0Bar className={classes.statusIcon} />,
          text: "Desconectado",
          class: classes.disconnectedStatus,
          progress: 0,
        };
      case "qrcode":
        return {
          icon: <CropFree className={classes.statusIcon} />,
          text: "QR Code",
          class: classes.qrcodeStatus,
          progress: 30,
        };
      case "TIMEOUT":
      case "PAIRING":
        return {
          icon: <SignalCellularConnectedNoInternet2Bar className={classes.statusIcon} />,
          text: "Conectando",
          class: classes.timeoutStatus,
          progress: 60,
        };
      case "OPENING":
        return {
          icon: <CircularProgress size={16} className={classes.statusIcon} />,
          text: "Iniciando",
          class: classes.openingStatus,
          progress: 45,
        };
      default:
        return {
          icon: <SignalCellularConnectedNoInternet0Bar className={classes.statusIcon} />,
          text: status,
          class: classes.disconnectedStatus,
          progress: 0,
        };
    }
  };

  const statusData = getStatusData();

  return (
    <Box display="flex" alignItems="center" mb={2}>
      {React.cloneElement(statusData.icon, {
        style: { color: theme.palette[statusData.class.replace(classes.statusIcon, '').trim()] }
      })}
      <Typography variant="body2" className={statusData.class}>
        {statusData.text}
      </Typography>
      <Box flexGrow={1} ml={1.5}>
        <LinearProgress
          variant="determinate"
          value={statusData.progress}
          className={classes.progressBar}
          style={{
            backgroundColor: theme.palette.divider,
          }}
          classes={{
            bar: {
              backgroundColor: theme.palette[statusData.class.replace(classes.statusIcon, '').trim()]
            }
          }}
        />
      </Box>
    </Box>
  );
};

const WhatsAppProviders = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const socketManager = SocketManager;

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [migrating, setMigrating] = useState(false);

  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    providerId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(confirmationModalInitialState);

  // Carregar providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/whatsapp-provider');
        setProviders(data.providers || []);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Configurar Socket listeners
  useEffect(() => {
    if (!user?.companyId) return;

    const socket = socketManager.getSocket(user.companyId);

    const handleProviderStatus = (data) => {
      setProviders(prev => prev.map(provider =>
        provider.id === data.providerId
          ? { ...provider, status: data.status, lastConnectionAt: new Date() }
          : provider
      ));
    };

    const handleQRCode = (data) => {
      if (selectedProvider && data.providerId === selectedProvider.id) {
        setQrCode(data.qrcode);
        setQrModalOpen(true);
      }
    };

    const handleProviderNotification = (data) => {
      toast.info(data.message || 'Atualização de provider recebida');

      // Atualizar providers
      setProviders(prev => prev.map(provider =>
        provider.id === data.providerId
          ? { ...provider, ...data.updates }
          : provider
      ));
    };

    // Registrar listeners
    socket.on('whatsapp_status', handleProviderStatus);
    socket.on('whatsapp_qrcode', handleQRCode);
    socket.on('whatsapp_provider_notification', handleProviderNotification);

    return () => {
      socket.off('whatsapp_status', handleProviderStatus);
      socket.off('whatsapp_qrcode', handleQRCode);
      socket.off('whatsapp_provider_notification', handleProviderNotification);
    };
  }, [user?.companyId, selectedProvider, socketManager]);

  const handleOpenProviderModal = () => {
    setSelectedProvider(null);
    setProviderModalOpen(true);
  };

  const handleCloseProviderModal = useCallback(() => {
    setProviderModalOpen(false);
    setSelectedProvider(null);
  }, []);

  const handleEditProvider = (provider) => {
    setSelectedProvider(provider);
    setProviderModalOpen(true);
  };

  const handleDeleteProvider = async (providerId) => {
    try {
      await api.delete(`/whatsapp-provider/${providerId}`);
      toast.success('Provider excluído com sucesso');
      setProviders(prev => prev.filter(p => p.id !== providerId));
    } catch (err) {
      toastError(err);
    }
  };

  const handleStartProvider = async (providerId) => {
    try {
      await api.post(`/whatsapp-provider/${providerId}/start`);
      toast.info('Iniciando provider...');
    } catch (err) {
      toastError(err);
    }
  };

  const handleStopProvider = async (providerId) => {
    try {
      await api.post(`/whatsapp-provider/${providerId}/stop`);
      toast.info('Parando provider...');
    } catch (err) {
      toastError(err);
    }
  };

  const handleTestConnection = async (providerId) => {
    try {
      const { data } = await api.post(`/whatsapp-provider/${providerId}/test`);
      toast.success(data.message || 'Conexão testada com sucesso');
    } catch (err) {
      toastError(err);
    }
  };

  const handleSetDefaultProvider = async (providerId) => {
    try {
      await api.put(`/whatsapp-provider/${providerId}/set-default`);
      toast.success('Provider padrão atualizado');

      setProviders(prev => prev.map(provider => ({
        ...provider,
        isDefault: provider.id === providerId
      })));
    } catch (err) {
      toastError(err);
    }
  };

  const handleMigrateProvider = async (providerId) => {
    try {
      setMigrating(true);
      const { data } = await api.post(`/whatsapp-provider/${providerId}/migrate`);
      toast.success(data.message || 'Migração iniciada com sucesso');
    } catch (err) {
      toastError(err);
    } finally {
      setMigrating(false);
    }
  };

  const handleOpenConfirmationModal = (action, provider) => {
    let title = '';
    let message = '';

    switch (action) {
      case 'delete':
        title = 'Confirmar Exclusão';
        message = `Tem certeza que deseja excluir o provider "${provider.name}"?`;
        break;
      case 'stop':
        title = 'Confirmar Parada';
        message = `Tem certeza que deseja parar o provider "${provider.name}"?`;
        break;
      case 'migrate':
        title = 'Confirmar Migração';
        message = `Tem certeza que deseja migrar todas as conexões do provider "${provider.name}"?`;
        break;
      default:
        return;
    }

    setConfirmModalInfo({
      action,
      title,
      message,
      providerId: provider.id,
      open: true,
    });
  };

  const handleSubmitConfirmationModal = async () => {
    const provider = providers.find(p => p.id === confirmModalInfo.providerId);

    switch (confirmModalInfo.action) {
      case 'delete':
        await handleDeleteProvider(confirmModalInfo.providerId);
        break;
      case 'stop':
        await handleStopProvider(confirmModalInfo.providerId);
        break;
      case 'migrate':
        await handleMigrateProvider(confirmModalInfo.providerId);
        break;
      default:
        break;
    }

    setConfirmModalOpen(false);
    setConfirmModalInfo(confirmationModalInitialState);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const renderProviderTypeIcon = (type) => {
    switch (type) {
      case 'baileys':
        return <WhatsApp />;
      case 'hub':
        return <Hub />;
      default:
        return <WhatsApp />;
    }
  };

  const renderProviderTypeColor = (type) => {
    switch (type) {
      case 'baileys':
        return classes.baileysAvatar;
      case 'hub':
        return classes.hubAvatar;
      default:
        return classes.baileysAvatar;
    }
  };

  const renderCardActions = (provider) => {
    return (
      <>
        <Grid container spacing={1}>
          {provider.status === 'DISCONNECTED' && (
            <Grid item xs={6}>
              <Button
                size="small"
                variant="contained"
                className={classes.primaryButton}
                startIcon={<PlayArrow />}
                onClick={() => handleStartProvider(provider.id)}
                fullWidth
              >
                Iniciar
              </Button>
            </Grid>
          )}

          {(provider.status === 'CONNECTED' || provider.status === 'CONNECTING') && (
            <Grid item xs={6}>
              <Button
                size="small"
                variant="contained"
                className={classes.secondaryButton}
                startIcon={<Stop />}
                onClick={() => handleOpenConfirmationModal('stop', provider)}
                fullWidth
              >
                Parar
              </Button>
            </Grid>
          )}

          <Grid item xs={6}>
            <Button
              size="small"
              variant="contained"
              className={classes.secondaryButton}
              startIcon={<Sync />}
              onClick={() => handleTestConnection(provider.id)}
              fullWidth
            >
              Testar
            </Button>
          </Grid>
        </Grid>

        <Box mt={1} display="flex" justifyContent="space-between">
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => handleEditProvider(provider)}
            color="primary"
          >
            Editar
          </Button>

          {!provider.isDefault && (
            <Button
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => handleSetDefaultProvider(provider.id)}
              color="primary"
            >
              Padrão
            </Button>
          )}

          <Button
            size="small"
            startIcon={<DeleteOutline />}
            onClick={() => handleOpenConfirmationModal('delete', provider)}
            color="secondary"
          >
            Excluir
          </Button>
        </Box>
      </>
    );
  };

  const filteredProviders = providers.filter(provider => {
    switch (currentTab) {
      case 0:
        return true; // Todos
      case 1:
        return provider.type === 'baileys';
      case 2:
        return provider.type === 'hub';
      default:
        return true;
    }
  });

  return (
    <MainContainer>
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>

      {/* QR Code Modal */}
      <Dialog
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>QR Code - {selectedProvider?.name}</DialogTitle>
        <DialogContent>
          {qrCode ? (
            <Box textAlign="center">
              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className={classes.qrCanvas} />
              <Typography variant="body2" color="textSecondary">
                Escaneie este QR Code com o WhatsApp
              </Typography>
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" style={{ marginTop: 16 }}>
                Aguardando QR Code...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrModalOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <WhatsAppProviderModal
        open={providerModalOpen}
        onClose={handleCloseProviderModal}
        providerId={selectedProvider?.id}
        onSuccess={(data) => {
          if (selectedProvider) {
            // Atualizar provider existente
            setProviders(prev => prev.map(provider =>
              provider.id === data.id ? { ...provider, ...data } : provider
            ));
          } else {
            // Adicionar novo provider
            setProviders(prev => [...prev, data]);
          }
          toast.success(selectedProvider ? 'Provider atualizado com sucesso' : 'Provider criado com sucesso');
        }}
      />

      <MainHeader>
        <Title>WhatsApp Providers</Title>
        <MainHeaderButtonsWrapper>
          <Can
            role={user.profile}
            perform="whatsapp-providers:addProvider"
            yes={() => (
              <div className={classes.headerButtons}>
                <Button
                  variant="contained"
                  className={classes.primaryButton}
                  startIcon={<AddCircleOutline />}
                  onClick={handleOpenProviderModal}
                >
                  Novo Provider
                </Button>
                <Button
                  variant="contained"
                  className={classes.secondaryButton}
                  startIcon={<Assessment />}
                  onClick={() => {
                    toast.info('Estatísticas serão implementadas');
                  }}
                >
                  Estatísticas
                </Button>
              </div>
            )}
          />
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.root} elevation={0}>
        {/* Tabs para filtrar por tipo */}
        <Box mb={3}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              label={
                <Badge badgeContent={providers.length} color="primary">
                  Todos os Providers
                </Badge>
              }
            />
            <Tab
              label={
                <Badge
                  badgeContent={providers.filter(p => p.type === 'baileys').length}
                  color="secondary"
                >
                  <Box display="flex" alignItems="center">
                    <WhatsApp style={{ marginRight: 8 }} />
                    Baileys
                  </Box>
                </Badge>
              }
            />
            <Tab
              label={
                <Badge
                  badgeContent={providers.filter(p => p.type === 'hub').length}
                  color="primary"
                >
                  <Box display="flex" alignItems="center">
                    <Hub style={{ marginRight: 8 }} />
                    Notifica-me Hub
                  </Box>
                </Badge>
              }
            />
          </Tabs>
          <Divider />
        </Box>

        {loading ? (
          <div className={classes.loadingContainer}>
            <CircularProgress color="primary" />
          </div>
        ) : (
          <>
            <Box mb={3}>
              <Typography variant="h6" color="textPrimary">
                Gerenciamento de Providers · {filteredProviders.length} ativos
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Configure e gerencie múltiplos providers de WhatsApp (Baileys e Notifica-me Hub)
              </Typography>
            </Box>

            {filteredProviders.length > 0 ? (
              <Grid container spacing={3} className={classes.gridContainer}>
                {filteredProviders.map(provider => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={provider.id}>
                    <Card className={classes.providerCard}>
                      <Box className={classes.cardHeader}>
                        <Box display="flex" alignItems="center" minWidth={0}>
                          <Avatar className={`${classes.avatar} ${renderProviderTypeColor(provider.type)}`}>
                            {renderProviderTypeIcon(provider.type)}
                          </Avatar>
                          <Box ml={1.5} minWidth={0}>
                            <Tooltip title={provider.name} arrow>
                              <Typography variant="subtitle1" className={classes.providerName}>
                                {provider.name}
                              </Typography>
                            </Tooltip>
                            <Typography variant="caption" color="textSecondary" noWrap>
                              ID: {provider.id}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                          {provider.isDefault && (
                            <Chip
                              label="Padrão"
                              size="small"
                              icon={<CheckCircle fontSize="small" />}
                              className={classes.defaultBadge}
                            />
                          )}
                          {provider.isActive && (
                            <Chip
                              label="Ativo"
                              size="small"
                              className={`${classes.defaultBadge} ${classes.activeBadge}`}
                            />
                          )}
                        </Box>
                      </Box>

                      <CardContent className={classes.cardContent}>
                        <StatusIndicator status={provider.status} providerType={provider.type} />

                        <Box className={classes.infoItem}>
                          <VpnKey fontSize="small" />
                          <Typography variant="body2" noWrap>
                            {provider.sessionId || provider.instanceId || 'N/A'}
                          </Typography>
                        </Box>

                        <Box className={classes.infoItem}>
                          <Phone fontSize="small" />
                          <Typography variant="body2" noWrap>
                            {provider.number ? (
                              <Tooltip title={provider.number} arrow>
                                <span>{formatSerializedId(provider.number)}</span>
                              </Tooltip>
                            ) : (
                              "Número não definido"
                            )}
                          </Typography>
                        </Box>

                        <Box className={classes.infoItem}>
                          <Update fontSize="small" />
                          <Typography variant="body2">
                            {provider.lastConnectionAt
                              ? format(parseISO(provider.lastConnectionAt), "dd/MM/yyyy HH:mm")
                              : "Nunca conectado"
                            }
                          </Typography>
                        </Box>

                        <div className={classes.statsContainer}>
                          <div className={classes.statItem}>
                            <div className={classes.statValue}>{provider.messagesSent || 0}</div>
                            <div className={classes.statLabel}>Enviadas</div>
                          </div>
                          <div className={classes.statItem}>
                            <div className={classes.statValue}>{provider.messagesReceived || 0}</div>
                            <div className={classes.statLabel}>Recebidas</div>
                          </div>
                          <div className={classes.statItem}>
                            <div className={classes.statValue}>{provider.priority || 1}</div>
                            <div className={classes.statLabel}>Prioridade</div>
                          </div>
                        </div>
                      </CardContent>

                      <CardActions className={classes.cardActions}>
                        <Box width="100%">
                          {renderCardActions(provider)}
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box className={classes.emptyState}>
                <AccountCircle style={{ fontSize: 60, color: theme.palette.text.disabled }} />
                <Typography variant="h6" gutterBottom>
                  Nenhum provider encontrado
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {currentTab === 0
                    ? "Clique em 'Novo Provider' para começar"
                    : currentTab === 1
                    ? "Nenhum provider Baileys configurado"
                    : "Nenhum provider Notifica-me Hub configurado"
                  }
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </MainContainer>
  );
};

export default WhatsAppProviders;