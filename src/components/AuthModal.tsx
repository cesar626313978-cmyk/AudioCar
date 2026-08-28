import React, { useState, useEffect } from 'react';
import { cloudService } from '../services/cloudService';
import { googleDriveProvider } from '../services/providers/GoogleDriveProvider';
import { oneDriveProvider } from '../services/providers/OneDriveProvider';
import { dropboxProvider } from '../services/providers/DropboxProvider';
import { CloudProviderType, CloudUserSession } from '../types';
import { 
  X, 
  Cloud, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  FolderOpen, 
  AlertCircle, 
  RotateCw, 
  Radio, 
  CheckCircle2, 
  Key, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Info,
  RefreshCw,
  LogOut
} from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [activeProviderId, setActiveProviderId] = useState<CloudProviderType>(cloudService.getActiveProviderId());
  const [sessions, setSessions] = useState<Record<CloudProviderType, CloudUserSession | null>>(cloudService.getAllSessions());
  const [loadingProvider, setLoadingProvider] = useState<CloudProviderType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'guide'>('services');

  // Manual token & Client ID configuration toggles
  const [showOneDriveConfig, setShowOneDriveConfig] = useState(false);
  const [oneDriveTokenInput, setOneDriveTokenInput] = useState('');
  const [oneDriveClientIdInput, setOneDriveClientIdInput] = useState(oneDriveProvider.getClientId());

  const [showDropboxConfig, setShowDropboxConfig] = useState(false);
  const [dropboxTokenInput, setDropboxTokenInput] = useState('');
  const [dropboxAppKeyInput, setDropboxAppKeyInput] = useState(dropboxProvider.getAppKey());

  const refreshSessions = () => {
    setSessions(cloudService.getAllSessions());
    setActiveProviderId(cloudService.getActiveProviderId());
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const handleSelectActiveProvider = async (providerId: CloudProviderType) => {
    setActiveProviderId(providerId);
    cloudService.setActiveProvider(providerId);
    setErrorMessage(null);
    try {
      await cloudService.syncLibrary(providerId);
      onSuccess();
    } catch (e: any) {
      console.warn('Sync library warning:', e);
    }
  };

  const handleConnectGoogle = async () => {
    setLoadingProvider('drive');
    setErrorMessage(null);
    try {
      await googleDriveProvider.login();
      refreshSessions();
      await handleSelectActiveProvider('drive');
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setErrorMessage(err.message || 'Error al conectar con Google Drive.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleConnectOneDrive = async () => {
    setLoadingProvider('onedrive');
    setErrorMessage(null);
    try {
      await oneDriveProvider.login();
      refreshSessions();
      await handleSelectActiveProvider('onedrive');
    } catch (err: any) {
      console.error('OneDrive Sign-in error:', err);
      setErrorMessage(err.message || 'Error al conectar con Microsoft OneDrive. Puedes introducir un token manual o configurar tu Client ID.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleConnectDropbox = async () => {
    setLoadingProvider('dropbox');
    setErrorMessage(null);
    try {
      await dropboxProvider.login();
      refreshSessions();
      await handleSelectActiveProvider('dropbox');
    } catch (err: any) {
      console.error('Dropbox Sign-in error:', err);
      setErrorMessage(err.message || 'Error al conectar con Dropbox. Puedes introducir un token de acceso manual o configurar tu App Key.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSaveOneDriveManual = async () => {
    if (oneDriveClientIdInput.trim()) {
      oneDriveProvider.setClientId(oneDriveClientIdInput.trim());
    }
    if (oneDriveTokenInput.trim()) {
      oneDriveProvider.setDirectSession(oneDriveTokenInput.trim());
      refreshSessions();
      await handleSelectActiveProvider('onedrive');
      setShowOneDriveConfig(false);
      setOneDriveTokenInput('');
    }
  };

  const handleSaveDropboxManual = async () => {
    if (dropboxAppKeyInput.trim()) {
      dropboxProvider.setAppKey(dropboxAppKeyInput.trim());
    }
    if (dropboxTokenInput.trim()) {
      dropboxProvider.setDirectSession(dropboxTokenInput.trim());
      refreshSessions();
      await handleSelectActiveProvider('dropbox');
      setShowDropboxConfig(false);
      setDropboxTokenInput('');
    }
  };

  const handleDisconnect = async (providerId: CloudProviderType) => {
    setLoadingProvider(providerId);
    try {
      await cloudService.logoutProvider(providerId);
      refreshSessions();
      onSuccess();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="bg-[#0c0c0c] border border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-white relative flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-gradient-to-b from-neutral-900/90 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
              <Cloud className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Conectar Nubes de Música</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Selector multicuenta para Google Drive, OneDrive y Dropbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hitbox-48 w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700/80 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 px-4 sm:px-6 pt-3 gap-2 bg-[#080808]">
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'services'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Servicios Nube</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Guía /mimusica</span>
          </button>
        </div>

        {/* Tab 1: Cloud Services Multi-Selector */}
        {activeTab === 'services' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
            
            {/* Universal Convention Tip */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300 leading-relaxed">
                Guarda tu música en la carpeta <strong className="text-white font-mono bg-black/60 px-1.5 py-0.5 rounded border border-neutral-700">/mimusica</strong> de tu cuenta conectada para sincronizar pistas y carátulas automáticamente.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-200 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>Aviso de conexión</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Provider 1: Google Drive */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeProviderId === 'drive' && sessions.drive
                ? 'bg-neutral-900 border-white/40 ring-1 ring-white/20 shadow-lg'
                : 'bg-[#111111] border-neutral-800 hover:border-neutral-700'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-black/80 border border-neutral-800 flex items-center justify-center shrink-0 p-2.5">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Google Drive</span>
                      {sessions.drive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Conectado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate max-w-[220px] sm:max-w-xs">
                      {sessions.drive ? sessions.drive.email : 'Streaming desde /mimusica en Google Drive'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {sessions.drive ? (
                    <>
                      <button
                        onClick={() => handleSelectActiveProvider('drive')}
                        className={`hitbox-48 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeProviderId === 'drive'
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {activeProviderId === 'drive' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Fuente Activa</span>
                          </>
                        ) : (
                          <span>Activar</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect('drive')}
                        title="Desconectar cuenta"
                        className="hitbox-48 h-10 px-3 rounded-xl bg-neutral-800/80 hover:bg-red-950/80 text-neutral-400 hover:text-red-300 border border-neutral-700/80 hover:border-red-800 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      disabled={loadingProvider === 'drive'}
                      className="hitbox-56 h-11 px-5 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingProvider === 'drive' ? (
                        <RotateCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <span>Conectar</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Provider 2: Microsoft OneDrive */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeProviderId === 'onedrive' && sessions.onedrive
                ? 'bg-neutral-900 border-sky-400/40 ring-1 ring-sky-400/20 shadow-lg'
                : 'bg-[#111111] border-neutral-800 hover:border-neutral-700'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#0078D4]/10 border border-sky-500/30 flex items-center justify-center shrink-0 p-2.5">
                    {/* Microsoft OneDrive Icon */}
                    <svg className="w-full h-full" viewBox="0 0 32 32" fill="none">
                      <path d="M21.5 12C20.5 8.5 17 6 13 6C8.6 6 5 9.6 5 14C2.2 14.5 0 17 0 20C0 23.3 2.7 26 6 26H24C27.3 26 30 23.3 30 20C30 16.9 27.6 14.3 24.6 14C24.1 12.8 22.9 12 21.5 12Z" fill="#0078D4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Microsoft OneDrive / 365</span>
                      {sessions.onedrive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                          Conectado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate max-w-[220px] sm:max-w-xs">
                      {sessions.onedrive ? sessions.onedrive.email : 'Microsoft Graph API desde /mimusica'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {sessions.onedrive ? (
                    <>
                      <button
                        onClick={() => handleSelectActiveProvider('onedrive')}
                        className={`hitbox-48 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeProviderId === 'onedrive'
                            ? 'bg-sky-400 text-black shadow-md'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {activeProviderId === 'onedrive' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-black" />
                            <span>Fuente Activa</span>
                          </>
                        ) : (
                          <span>Activar</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect('onedrive')}
                        title="Desconectar cuenta"
                        className="hitbox-48 h-10 px-3 rounded-xl bg-neutral-800/80 hover:bg-red-950/80 text-neutral-400 hover:text-red-300 border border-neutral-700/80 hover:border-red-800 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnectOneDrive}
                      disabled={loadingProvider === 'onedrive'}
                      className="hitbox-56 h-11 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingProvider === 'onedrive' ? (
                        <RotateCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <span>Conectar</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Token / Config Expandable */}
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80">
                <button
                  onClick={() => setShowOneDriveConfig(!showOneDriveConfig)}
                  className="text-[11px] font-bold text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3 text-sky-400" />
                  <span>Configuración avanzada / Token manual de Microsoft Graph</span>
                  {showOneDriveConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showOneDriveConfig && (
                  <div className="mt-3 p-3 rounded-xl bg-black/60 border border-neutral-800 space-y-2.5 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Microsoft App Client ID (Opcional):</label>
                      <input
                        type="text"
                        value={oneDriveClientIdInput}
                        onChange={(e) => setOneDriveClientIdInput(e.target.value)}
                        placeholder="Ej: 9372df34-4530-4e58-b636-f6eb8053229b"
                        className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Pegar Access Token de Microsoft Graph (Bearer):</label>
                      <input
                        type="password"
                        value={oneDriveTokenInput}
                        onChange={(e) => setOneDriveTokenInput(e.target.value)}
                        placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOi..."
                        className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <button
                      onClick={handleSaveOneDriveManual}
                      className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs cursor-pointer"
                    >
                      Guardar y Conectar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Provider 3: Dropbox */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeProviderId === 'dropbox' && sessions.dropbox
                ? 'bg-neutral-900 border-indigo-400/40 ring-1 ring-indigo-400/20 shadow-lg'
                : 'bg-[#111111] border-neutral-800 hover:border-neutral-700'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#0061FF]/10 border border-indigo-500/30 flex items-center justify-center shrink-0 p-2.5">
                    {/* Dropbox Isometric Box Icon */}
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="#0061FF">
                      <path d="M6 2l6 3.82L6 9.64 0 5.82 6 2zm12 0l6 3.82-6 3.82-6-3.82L18 2zM0 13.45l6 3.82 6-3.82-6-3.81-6 3.81zm24 0l-6-3.81-6 3.81 6 3.82 6-3.82zM6 18.55l6 3.82 6-3.82-6-3.82-6 3.82z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Dropbox</span>
                      {sessions.dropbox && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          Conectado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate max-w-[220px] sm:max-w-xs">
                      {sessions.dropbox ? sessions.dropbox.email : 'Dropbox API v2 Direct CDN Streaming'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {sessions.dropbox ? (
                    <>
                      <button
                        onClick={() => handleSelectActiveProvider('dropbox')}
                        className={`hitbox-48 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeProviderId === 'dropbox'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {activeProviderId === 'dropbox' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Fuente Activa</span>
                          </>
                        ) : (
                          <span>Activar</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect('dropbox')}
                        title="Desconectar cuenta"
                        className="hitbox-48 h-10 px-3 rounded-xl bg-neutral-800/80 hover:bg-red-950/80 text-neutral-400 hover:text-red-300 border border-neutral-700/80 hover:border-red-800 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnectDropbox}
                      disabled={loadingProvider === 'dropbox'}
                      className="hitbox-56 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingProvider === 'dropbox' ? (
                        <RotateCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <span>Conectar</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Token / Config Expandable */}
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80">
                <button
                  onClick={() => setShowDropboxConfig(!showDropboxConfig)}
                  className="text-[11px] font-bold text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3 text-indigo-400" />
                  <span>Configuración avanzada / Token manual de Dropbox</span>
                  {showDropboxConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showDropboxConfig && (
                  <div className="mt-3 p-3 rounded-xl bg-black/60 border border-neutral-800 space-y-2.5 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Dropbox App Key (Opcional):</label>
                      <input
                        type="text"
                        value={dropboxAppKeyInput}
                        onChange={(e) => setDropboxAppKeyInput(e.target.value)}
                        placeholder="Ej: 7m9qf92kd43l9p2"
                        className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Pegar Access Token de Dropbox Developer:</label>
                      <input
                        type="password"
                        value={dropboxTokenInput}
                        onChange={(e) => setDropboxTokenInput(e.target.value)}
                        placeholder="sl.u.AF3j98..."
                        className="w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <button
                      onClick={handleSaveDropboxManual}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Guardar y Conectar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Provider 4: Demo Mode */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeProviderId === 'demo'
                ? 'bg-neutral-900 border-amber-400/40 ring-1 ring-amber-400/20 shadow-lg'
                : 'bg-[#111111] border-neutral-800 hover:border-neutral-700'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 p-2.5 text-amber-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Modo Demo (Sin Cuenta)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Prueba rápida
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Pistas de prueba de alta fidelidad integradas para reproducir offline
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectActiveProvider('demo')}
                  className={`hitbox-48 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeProviderId === 'demo'
                      ? 'bg-amber-400 text-black shadow-md font-extrabold'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                >
                  {activeProviderId === 'demo' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>Activa</span>
                    </>
                  ) : (
                    <span>Probar</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Universal Guide */}
        {activeTab === 'guide' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-neutral-300 custom-scrollbar flex-1">
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Estructura Universal en tu Cuenta (Drive, OneDrive o Dropbox)</span>
              </h3>
              
              <p className="text-neutral-400 text-xs leading-relaxed">
                Tanto en Google Drive como en OneDrive y Dropbox, AudioCar lee exclusivamente la carpeta <strong className="text-white">/mimusica</strong> y sus subcarpetas.
              </p>

              <div className="bg-black/90 p-4 rounded-2xl border border-neutral-800 font-mono text-[11px] space-y-1.5 text-neutral-300 leading-relaxed">
                <div className="text-amber-300 font-bold">📁 Raíz de tu Cuenta (Drive / OneDrive / Dropbox)</div>
                <div className="pl-4 text-white font-bold">└── 📁 mimusica <span className="text-emerald-400 font-normal">← (Carpeta principal requerida)</span></div>
                <div className="pl-8 text-neutral-300">├── 📁 Rock Clásico</div>
                <div className="pl-12 text-neutral-400">├── 🎵 Bohemian Rhapsody.mp3</div>
                <div className="pl-12 text-purple-400">└── 🖼️ cover.jpg <span className="text-neutral-500">(Carátula de la carpeta)</span></div>
                <div className="pl-8 text-neutral-300">├── 📁 Éxitos 2026</div>
                <div className="pl-12 text-neutral-400">├── 🎵 Cancion1.flac</div>
                <div className="pl-12 text-neutral-400">└── 🎵 Cancion2.m4a</div>
                <div className="pl-8 text-neutral-300">└── 🎵 Single_Suelta.mp3</div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-white">Formatos Compatibles:</h4>
              <ul className="grid grid-cols-2 gap-2 text-neutral-400 text-[11px]">
                <li className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <strong className="text-white">Audio:</strong> MP3, FLAC, M4A, AAC, WAV, OGG, OPUS, WEBM
                </li>
                <li className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <strong className="text-white">Carátulas:</strong> JPG, PNG, WEBP, GIF
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab('services')}
                className="hitbox-48 w-full h-12 rounded-2xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Volver a Servicios en la Nube</span>
              </button>
            </div>
          </div>
        )}

        {/* Fixed Bottom Save / Action Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/90 bg-neutral-950/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Música protegida en tu propia nube personal</span>
          </div>

          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="hitbox-56 px-7 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-white/20"
          >
            <Check className="w-4 h-4 text-black stroke-[3]" />
            <span>Guardar y Cerrar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
