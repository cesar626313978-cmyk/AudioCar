/**
 * Header Component - Skeuomorphic Icon Set Top Bar
 * Left-aligned: App Logo + 8 Luxury Skeuomorphic Gold-Bezel Buttons:
 * [Logo AudioCar] -> [1. Cloud] [2. Vinyl] [3. Folder] [4. Equalizer] [5. Sun/Moon] [6. Coffee] [7. Heart] [8. Help]
 */

import React from 'react';
import { DriveAuthUser } from '../types';
import {
  SkeuomorphicCloudIcon,
  SkeuomorphicVinylIcon,
  SkeuomorphicFolderIcon,
  SkeuomorphicEqualizerIcon,
  SkeuomorphicSunMoonIcon,
  SkeuomorphicCoffeeIcon,
  SkeuomorphicHeartIcon,
  SkeuomorphicHelpIcon
} from './SkeuomorphicIcons';

interface HeaderProps {
  user: DriveAuthUser | null;
  activeOverlay: 'none' | 'library' | 'settings' | 'auth' | 'donation' | 'contact' | 'help';
  isPlaying?: boolean;
  isSyncing?: boolean;
  syncPercent?: number;
  syncStep?: string;
  onOpenPlayer: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenDonation: () => void;
  onOpenContact: () => void;
  onOpenHelp: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeOverlay,
  isPlaying = false,
  isSyncing = false,
  syncPercent = 0,
  syncStep = '',
  onOpenPlayer,
  onOpenLibrary,
  onOpenSettings,
  onOpenAuth,
  onOpenDonation,
  onOpenContact,
  onOpenHelp,
  theme,
  toggleTheme
}) => {
  return (
    <header className="h-20 bg-[#090909]/95 backdrop-blur-xl border-b border-neutral-800/90 px-3 sm:px-6 flex items-center justify-start z-30 shrink-0 select-none shadow-xl gap-2 sm:gap-4 overflow-x-auto custom-scrollbar">
      
      {/* Brand Logo & Title (Far Left) */}
      <div 
        onClick={onOpenPlayer}
        className="flex items-center gap-2.5 cursor-pointer group shrink-0 pr-2 sm:pr-4 border-r border-neutral-800/80 mr-1"
        title="AudioCar - Cloud Audio System"
      >
        <div className="hitbox-48 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black p-1 border border-neutral-800 group-hover:border-sky-500/50 shadow-lg group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
          <img 
            src="/audiocar-logo.svg" 
            alt="AudioCar Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="hidden md:flex flex-col">
          <span className="text-sm font-black tracking-widest text-white whitespace-nowrap leading-none">
            AUDIO<span className="text-amber-400">CAR</span>
          </span>
          <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase">
            Cloud System
          </span>
        </div>
      </div>

      {/* 7 Skeuomorphic Navigation Buttons - Left Justified */}
      <nav className="flex items-center gap-2 sm:gap-3 py-1.5 shrink-0">
        
        {/* 1. Conectar Nube (Cloud Sync with Chain Link) */}
        <button
          onClick={onOpenAuth}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'auth'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]'
          }`}
          title={user ? `Nube Conectada (${user.name || user.email})` : 'Conectar Nube de Música (/mimusica)'}
          aria-label="Conectar Nube de Música"
        >
          <SkeuomorphicCloudIcon 
            isActive={activeOverlay === 'auth'} 
            statusBadge={Boolean(user)} 
          />
        </button>

        {/* 2. Reproductor (Grooved Vinyl Record with Blue Play Badge) */}
        <button
          onClick={onOpenPlayer}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'none'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]'
          }`}
          title="Reproductor Principal (Cockpit)"
          aria-label="Reproductor"
        >
          <SkeuomorphicVinylIcon 
            isActive={activeOverlay === 'none'} 
            isSpinning={isPlaying}
          />
        </button>

        {/* 3. Biblioteca (Golden Folder with Music Notes) */}
        <button
          onClick={onOpenLibrary}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'library'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]'
          }`}
          title="Biblioteca de Música y Carpetas"
          aria-label="Biblioteca"
        >
          <SkeuomorphicFolderIcon 
            isActive={activeOverlay === 'library'} 
          />
        </button>

        {/* 4. Ecualizador DSP (Golden Mixer Sliders) */}
        <button
          onClick={onOpenSettings}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'settings'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]'
          }`}
          title="Ecualizador DSP y Ajustes de Audio"
          aria-label="Ajustes y Ecualizador"
        >
          <SkeuomorphicEqualizerIcon 
            isActive={activeOverlay === 'settings'} 
          />
        </button>

        {/* 5. Tema / Ambiente (Golden Sun Face & Crescent Moon) */}
        <button
          onClick={toggleTheme}
          className="hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
          title={theme === 'dark' ? 'Modo Día (Brillo Alto)' : 'Modo Noche (Ambiente Oscuro)'}
          aria-label={theme === 'dark' ? 'Modo Día' : 'Modo Noche'}
        >
          <SkeuomorphicSunMoonIcon 
            isActive={false} 
          />
        </button>

        {/* 6. Un Café (Vintage Porcelain Espresso Cup with Gold Steam) */}
        <button
          onClick={onOpenDonation}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'donation'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]'
          }`}
          title="Invitar a un Café (Apoyo al Proyecto)"
          aria-label="Invitar a un café"
        >
          <SkeuomorphicCoffeeIcon 
            isActive={activeOverlay === 'donation'} 
          />
        </button>

        {/* 7. Contacto y Feedback (Glowing Cyan Glass Heart with Silhouette) */}
        <button
          onClick={onOpenContact}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'contact'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]'
          }`}
          title="Sugerencias, Soporte Técnico y Contacto"
          aria-label="Contacto y Soporte"
        >
          <SkeuomorphicHeartIcon 
            isActive={activeOverlay === 'contact'} 
          />
        </button>

        {/* 8. Ayuda y Guía de Inicio (Skeuomorphic Lifebuoy / Help Compass) */}
        <button
          onClick={onOpenHelp}
          className={`hitbox-48 relative w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 group ${
            activeOverlay === 'help'
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.5)] scale-105'
              : 'hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]'
          }`}
          title="Guía de Inicio Rápido y Ayuda Paso a Paso"
          aria-label="Guía de Inicio y Ayuda"
        >
          <SkeuomorphicHelpIcon 
            isActive={activeOverlay === 'help'} 
          />
        </button>

        {/* Real-Time Cloud Sync Progress Pill (Visible during Google Drive sync) */}
        {isSyncing && (
          <div 
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 bg-neutral-900/90 hover:bg-neutral-800 border border-amber-500/40 rounded-full px-3.5 py-1.5 shadow-lg shadow-amber-500/10 cursor-pointer animate-in fade-in zoom-in-95 duration-200 shrink-0 ml-2"
            title={syncStep || 'Sincronizando biblioteca con Google Drive...'}
          >
            <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
            <div className="flex flex-col max-w-[160px] sm:max-w-[220px]">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span className="truncate">{syncStep || 'Sincronizando...'}</span>
                <span className="font-mono ml-1.5">{syncPercent}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1 mt-0.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, syncPercent)}%` }}
                />
              </div>
            </div>
          </div>
        )}


      </nav>
    </header>
  );
};
