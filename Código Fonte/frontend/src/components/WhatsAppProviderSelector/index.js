import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Tooltip,
  Avatar,
  ListItemText,
  CircularProgress,
} from "@material-ui/core";
import {
  WhatsApp,
  Router,
  Info,
  CheckCircle,
  Error,
  SignalCellular4Bar,
  SignalCellularConnectedNoInternet0Bar,
} from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  formControl: {
    minWidth: 200,
    width: '100%',
  },
  providerChip: {
    marginLeft: theme.spacing(1),
  },
  providerAvatar: {
    width: 24,
    height: 24,
    fontSize: 12,
    marginRight: theme.spacing(1),
  },
  baileysAvatar: {
    backgroundColor: theme.palette.success.main,
  },
  hubAvatar: {
    backgroundColor: theme.palette.primary.main,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: theme.spacing(1),
  },
  connectedStatus: {
    backgroundColor: theme.palette.success.main,
  },
  disconnectedStatus: {
    backgroundColor: theme.palette.error.main,
  },
  connectingStatus: {
    backgroundColor: theme.palette.warning.main,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
  },
  providerInfo: {
    flex: 1,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
});

const WhatsAppProviderSelector = ({
  value,
  onChange,
  label = "WhatsApp Provider",
  showStatus = true,
  showType = true,
  onlyActive = true,
  providerType = null, // 'baileys' | 'hub' | null para ambos
  disabled = false,
  required = false,
  helperText = null,
}) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar providers
  useEffect(() => {
    const fetchProviders = async () => {
      if (!user?.companyId) return;

      try {
        setLoading(true);
        const { data } = await api.get('/whatsapp-provider', {
          params: {
            companyId: user.companyId,
            onlyActive,
            providerType,
          }
        });

        setProviders(data.providers || []);
      } catch (err) {
        toastError(err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [user?.companyId, onlyActive, providerType]);

  const getProviderIcon = (type) => {
    switch (type) {
      case 'baileys':
        return <WhatsApp fontSize="small" />;
      case 'hub':
        return <Router fontSize="small" />;
      default:
        return <WhatsApp fontSize="small" />;
    }
  };

  const getProviderAvatarClass = (type) => {
    switch (type) {
      case 'baileys':
        return classes.baileysAvatar;
      case 'hub':
        return classes.hubAvatar;
      default:
        return classes.baileysAvatar;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONNECTED':
        return classes.connectedStatus;
      case 'DISCONNECTED':
        return classes.disconnectedStatus;
      case 'CONNECTING':
      case 'qrcode':
      case 'OPENING':
        return classes.connectingStatus;
      default:
        return classes.disconnectedStatus;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle fontSize="small" color="success" />;
      case 'DISCONNECTED':
        return <Error fontSize="small" color="error" />;
      default:
        return <SignalCellularConnectedNoInternet0Bar fontSize="small" color="action" />;
    }
  };

  const renderMenuItem = (provider) => {
    return (
      <MenuItem key={provider.id} value={provider.id} className={classes.menuItem}>
        <Avatar className={`${classes.providerAvatar} ${getProviderAvatarClass(provider.type)}`}>
          {getProviderIcon(provider.type)}
        </Avatar>

        <Box className={classes.providerInfo}>
          <Box display="flex" alignItems="center">
            <Typography variant="body2" style={{ fontWeight: 500 }}>
              {provider.name}
            </Typography>

            {provider.isDefault && (
              <Chip
                label="Padrão"
                size="small"
                color="primary"
                className={classes.providerChip}
              />
            )}
          </Box>

          {showType && (
            <Typography variant="caption" color="textSecondary">
              Tipo: {provider.type?.toUpperCase() || 'N/A'}
            </Typography>
          )}

          {showStatus && (
            <Box display="flex" alignItems="center" mt={0.5}>
              <div className={`${classes.statusDot} ${getStatusColor(provider.status)}`} />
              <Typography variant="caption" color="textSecondary">
                {provider.status === 'CONNECTED' && 'Conectado'}
                {provider.status === 'DISCONNECTED' && 'Desconectado'}
                {provider.status === 'CONNECTING' && 'Conectando'}
                {provider.status === 'qrcode' && 'QR Code'}
                {!['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'qrcode'].includes(provider.status) && provider.status}
              </Typography>
            </Box>
          )}
        </Box>

        {showStatus && (
          <Box ml={2}>
            {getStatusIcon(provider.status)}
          </Box>
        )}
      </MenuItem>
    );
  };

  const renderValue = (selectedValue) => {
    const selectedProvider = providers.find(p => p.id === selectedValue);

    if (!selectedProvider) {
      return <Typography color="textSecondary">Selecione um provider</Typography>;
    }

    return (
      <Box display="flex" alignItems="center">
        <Avatar className={`${classes.providerAvatar} ${getProviderAvatarClass(selectedProvider.type)}`}>
          {getProviderIcon(selectedProvider.type)}
        </Avatar>

        <Box flex={1}>
          <Typography variant="body2" style={{ fontWeight: 500 }}>
            {selectedProvider.name}
          </Typography>

          {showType && (
            <Typography variant="caption" color="textSecondary">
              {selectedProvider.type?.toUpperCase() || 'N/A'}
            </Typography>
          )}
        </Box>

        {showStatus && (
          <Box ml={1}>
            {getStatusIcon(selectedProvider.status)}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <FormControl variant="outlined" className={classes.formControl} required={required}>
        <InputLabel>{label}</InputLabel>
        <div className={classes.loadingContainer}>
          <CircularProgress size={20} />
          <Typography variant="body2" style={{ marginLeft: 8 }}>
            Carregando providers...
          </Typography>
        </div>
      </FormControl>
    );
  }

  return (
    <FormControl
      variant="outlined"
      className={classes.formControl}
      required={required}
      disabled={disabled}
    >
      <InputLabel>{label}</InputLabel>

      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        displayEmpty
        renderValue={renderValue}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
              width: 350,
            },
          },
        }}
      >
        <MenuItem value="" disabled>
          <Typography color="textSecondary">
            Selecione um provider
          </Typography>
        </MenuItem>

        {providers.length === 0 ? (
          <MenuItem disabled>
            <Typography color="textSecondary" style={{ textAlign: 'center', width: '100%' }}>
              Nenhum provider encontrado
            </Typography>
          </MenuItem>
        ) : (
          providers.map(renderMenuItem)
        )}
      </Select>

      {helperText && (
        <Typography variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export default WhatsAppProviderSelector;