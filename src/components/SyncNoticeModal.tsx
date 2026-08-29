/**
 * Sync Notice & Alert Modal - AudioCar
 * Prompts user to connect Google Drive when trying to sync while disconnected,
 * or alerts and allows 1-click creation when the root "/mimusica" folder is missing in Drive.
 */

import React, { useState } from 'react';
import { Cloud, FolderPlus, AlertTriangle, CheckCircle2, X, RefreshCw, LogIn } from 'lucide-react';
import { authService } from '../services/authService';
import { driveService } from '../services/driveService';

export type SyncNoticeType = 'not_connected' | 'mimusica_not_found' | 'sync_success';

interface SyncNoticeModalProps {
  type: SyncNoticeType;
  userEmail?: string;
  foldersCount?: number;
  tracksCount?: number;
  onClose: () => void;
  onConnectSuccess: () => void;
  onFolderCreated: () => void;
}

export const SyncNoticeModal: React.FC<SyncNoticeModalProps> = ({
  type,
  userEmail,
  foldersCount = 0,
  tracksCount = 0,
  onClose,
  onConnectSuccess,
  onFolderCreated
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnectGoogle = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await authService.requestSignIn();
      onConnectSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google connect error:', err);
      setErrorMessage(err?.message || 'No se pudo conectar con Google Drive. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateMusicFolder = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const created = await driveService.createMusicRootFolder();
      if (created) {
        onFolderCreated();
        onClose();
      } else {
        throw new Error('No se pudo crear la carpeta en Google Drive.');
      }
    } catch (err: any) {
      console.error('Create mimusica folder error:', err);
      setErrorMessage(err?.message || 'Error al crear la carpeta en Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="hitbox-48 absolute top-5 right-5 w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. STATE: NOT CONNECTED TO GOOGLE DRIVE */}
        {type === 'not_connected' && (
          <>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Cloud className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Google Drive No Conectado
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Autenticación requerida para sincronizar pistas
                </p>
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-4 space-y-2 text-sm text-neutral-300">
              <p>
                Para sincronizar tu música personalizada y explorar tus carpetas desde la pantalla de Biblioteca, necesitas iniciar sesión con tu cuenta de <strong>Google Drive</strong>.
              </p>
              <p className="text-xs text-neutral-400">
                AudioCar buscará tu música en la carpeta <code className="text-amber-400 font-mono">/mimusica</code> sin transferir tus archivos a ningún servidor externo.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleConnectGoogle}
                disabled={isProcessing}
                className="w-full sm:flex-1 hitbox-48 h-12 px-5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span className="whitespace-nowrap">Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-black shrink-0" />
                    <span className="whitespace-nowrap">Elegir cuenta de Google</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full sm:w-auto hitbox-48 h-12 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* 2. STATE: MIMUSICA FOLDER NOT FOUND IN GOOGLE DRIVE */}
        {type === 'mimusica_not_found' && (
          <>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <FolderPlus className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Carpeta "/mimusica" No Encontrada
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-[280px]">
                  Cuenta: {userEmail || 'Google Drive'}
                </p>
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-4 space-y-2 text-sm text-neutral-300">
              <p>
                No se ha encontrado la carpeta principal <span className="text-amber-400 font-bold font-mono">/mimusica</span> en tu unidad de Google Drive.
              </p>
              <p className="text-xs text-neutral-400">
                AudioCar requiere esta carpeta para organizar tus álbumes, subcarpetas y carátulas de audio. ¿Deseas que AudioCar la cree automáticamente por ti?
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleCreateMusicFolder}
                disabled={isProcessing}
                className="w-full sm:flex-1 hitbox-48 h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Creando carpeta en Drive...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 text-black" />
                    <span>Crear "/mimusica" ahora</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full sm:w-auto hitbox-48 h-12 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </>
        )}

        {/* 3. STATE: SYNC SUCCESS & MIMUSICA DETECTED */}
        {type === 'sync_success' && (
          <>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Carpeta "/mimusica" Detectada
                </h3>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  Sincronización completada con éxito
                </p>
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-4 space-y-2 text-sm text-neutral-300">
              <p>
                Se ha detectado correctamente la carpeta raíz <span className="text-emerald-400 font-bold font-mono">/mimusica</span> en Google Drive ({userEmail}).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-black/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">Subcarpetas / Álbumes</span>
                  <span className="text-white font-mono text-base font-bold">{foldersCount}</span>
                </div>
                <div className="bg-black/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">Pistas de audio</span>
                  <span className="text-white font-mono text-base font-bold">{tracksCount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="w-full hitbox-48 h-12 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-lg"
              >
                Aceptar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
