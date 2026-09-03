/**
 * Modo Cockpit - Minimalist In-Car Fullscreen Player (AudioCar)
 * High-performance, distraction-free in-car interface.
 * Unified two-column layout matching the Main Player, perfectly centered on any screen.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerState, PlaybackMode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { AudioVisualizer } from './AudioVisualizer';
import { AlbumArtwork } from './AlbumArtwork';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Sliders,
  ListMusic,
  Maximize2,
  Minimize2,
  X,
  Disc3,
  Waves,
  ArrowRight,
  Folder,
  FolderTree,
  Library,
  Car,
  Music2,
  ShieldCheck,
  Wifi,
  Sparkles,
  RefreshCw,
  Shield,
  Clock,
  Cloud
} from 'lucide-react';

interface TeslaDashboardSimulatorProps {
  playerState: PlayerState;
  onExitTeslaMode?: () => void;
  onOpenSettings?: () => void;
}

type TeslaLedColor =
  | 'sport-red'
  | 'cyber-cyan'
  | 'electric-blue'
  | 'solar-amber'
  | 'highland-emerald'
  | 'synth-violet'
  | 'pure-white'
  | 'rainbow'
  | 'off';

const LED_CONFIGS: Record<
  TeslaLedColor,
  {
    name: string;
    dotColor: string;
    cssVars?: React.CSSProperties;
  }
> = {
  'sport-red': {
    name: 'Sport Red',
    dotColor: '#E82127',
    cssVars: {
      ['--led-color' as any]: '#E82127',
      ['--led-color-subtle' as any]: 'rgba(232, 33, 39, 0.55)',
      ['--led-color-glow' as any]: 'rgba(232, 33, 39, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(232, 33, 39, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(232,33,39,0.95), rgba(232,33,39,0.25) 45%, rgba(232,33,39,0.95))'
    }
  },
  'cyber-cyan': {
    name: 'Cyber Cyan',
    dotColor: '#00F0FF',
    cssVars: {
      ['--led-color' as any]: '#00F0FF',
      ['--led-color-subtle' as any]: 'rgba(0, 240, 255, 0.55)',
      ['--led-color-glow' as any]: 'rgba(0, 240, 255, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(0, 240, 255, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(0,240,255,0.95), rgba(0,240,255,0.25) 45%, rgba(0,240,255,0.95))'
    }
  },
  'electric-blue': {
    name: 'Electric Blue',
    dotColor: '#3B82F6',
    cssVars: {
      ['--led-color' as any]: '#3B82F6',
      ['--led-color-subtle' as any]: 'rgba(59, 130, 246, 0.55)',
      ['--led-color-glow' as any]: 'rgba(59, 130, 246, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(59, 130, 246, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(59,130,246,0.25) 45%, rgba(59,130,246,0.95))'
    }
  },
  'solar-amber': {
    name: 'Solar Amber',
    dotColor: '#F59E0B',
    cssVars: {
      ['--led-color' as any]: '#F59E0B',
      ['--led-color-subtle' as any]: 'rgba(245, 158, 11, 0.55)',
      ['--led-color-glow' as any]: 'rgba(245, 158, 11, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(245, 158, 11, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(245,158,11,0.25) 45%, rgba(245,158,11,0.95))'
    }
  },
  'highland-emerald': {
    name: 'Highland Emerald',
    dotColor: '#10B981',
    cssVars: {
      ['--led-color' as any]: '#10B981',
      ['--led-color-subtle' as any]: 'rgba(16, 185, 129, 0.55)',
      ['--led-color-glow' as any]: 'rgba(16, 185, 129, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(16, 185, 129, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(16,185,129,0.25) 45%, rgba(16,185,129,0.95))'
    }
  },
  'synth-violet': {
    name: 'Synth Violet',
    dotColor: '#A855F7',
    cssVars: {
      ['--led-color' as any]: '#A855F7',
      ['--led-color-subtle' as any]: 'rgba(168, 85, 247, 0.55)',
      ['--led-color-glow' as any]: 'rgba(168, 85, 247, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(168, 85, 247, 0.22)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(168,85,247,0.95), rgba(168,85,247,0.25) 45%, rgba(168,85,247,0.95))'
    }
  },
  'pure-white': {
    name: 'Studio White',
    dotColor: '#FFFFFF',
    cssVars: {
      ['--led-color' as any]: '#FFFFFF',
      ['--led-color-subtle' as any]: 'rgba(255, 255, 255, 0.55)',
      ['--led-color-glow' as any]: 'rgba(255, 255, 255, 0.4)',
      ['--led-color-ambient' as any]: 'rgba(255, 255, 255, 0.2)',
      ['--led-border-gradient' as any]:
        'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.95))'
    }
  },
  'rainbow': {
    name: 'RGB Rainbow',
    dotColor: 'conic-gradient(from 180deg at 50% 50%, #FF0055 0deg, #00F0FF 120deg, #10B981 240deg, #FF0055 360deg)',
    cssVars: {
      ['--led-color' as any]: '#FF0055',
      ['--led-color-subtle' as any]: 'rgba(255, 0, 85, 0.55)',
      ['--led-color-glow' as any]: 'rgba(0, 240, 255, 0.45)',
      ['--led-color-ambient' as any]: 'rgba(16, 185, 129, 0.22)',
      ['--led-border-gradient' as any]: 'linear-gradient(135deg, #FF0055, #00F0FF 50%, #10B981)'
    }
  },
  'off': {
    name: 'LED Off',
    dotColor: '#262626',
    cssVars: {}
  }
};

export const TeslaDashboardSimulator: React.FC<TeslaDashboardSimulatorProps> = ({
  playerState,
  onExitTeslaMode,
  onOpenSettings
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Ambient LED State (Synced with localStorage)
  const [ledColor, setLedColor] = useState<TeslaLedColor>(() => {
    const saved = localStorage.getItem('audiocar_led_color');
    if (saved && saved in LED_CONFIGS) return saved as TeslaLedColor;
    return 'sport-red';
  });

  const [isLedPulseActive, setIsLedPulseActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('audiocar_led_pulse');
    return saved !== 'false';
  });

  const changeLedColor = (col: TeslaLedColor) => {
    setLedColor(col);
    localStorage.setItem('audiocar_led_color', col);
  };

  const toggleLedPulse = () => {
    setIsLedPulseActive((prev) => {
      const next = !prev;
      localStorage.setItem('audiocar_led_pulse', String(next));
      return next;
    });
  };

  const currentTrack = audioEngine.getCurrentTrack();
  const activeLedConfig = LED_CONFIGS[ledColor];

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === null || seconds === undefined || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const val = parseFloat(e.target.value);
    setScrubValue(val);
    if (!isScrubbing) setIsScrubbing(true);
  };

  const handleSeekCommit = () => {
    setIsScrubbing(false);
    audioEngine.seek(scrubValue);
  };

  const toggleFavorite = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (currentTrack) {
      const isFav = await dbService.toggleFavorite(currentTrack.id);
      currentTrack.isFavorite = isFav;
      audioEngine.subscribe(() => {})?.();
    }
  };

  // Auto-fullscreen trigger on entering Cockpit Mode (like F11)
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const docEl = document.documentElement as any;
        const requestFS =
          docEl.requestFullscreen ||
          docEl.webkitRequestFullscreen ||
          docEl.mozRequestFullScreen ||
          docEl.msRequestFullscreen;

        if (requestFS && !document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          await requestFS.call(docEl);
          setIsFullscreen(true);
        }
      } catch (err) {
        console.log('Fullscreen request pending user gesture:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      const isFS = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFS);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleBrowserFullscreen = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      const isCurrentlyFS = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

      if (!isCurrentlyFS) {
        const requestFS =
          docEl.requestFullscreen ||
          docEl.webkitRequestFullscreen ||
          docEl.mozRequestFullScreen ||
          docEl.msRequestFullscreen;
        if (requestFS) {
          await requestFS.call(docEl);
          setIsFullscreen(true);
        }
      } else {
        const exitFS =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;
        if (exitFS) {
          await exitFS.call(doc);
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle:', e);
    }
  };

  // Robust duration and progress resolution
  const knownDuration = (playerState.duration && isFinite(playerState.duration) && playerState.duration > 0)
    ? playerState.duration
    : (currentTrack?.duration && currentTrack.duration > 0)
      ? currentTrack.duration
      : 0;

  const currentPlayTime = isScrubbing ? scrubValue : playerState.currentTime;
  const effectiveMaxDuration = knownDuration > 0
    ? Math.max(knownDuration, currentPlayTime)
    : Math.max(currentPlayTime + 1, 100);

  const progressPercent = knownDuration > 0
    ? Math.min(100, Math.max(0, (currentPlayTime / knownDuration) * 100))
    : 0;

  const playbackModes: { id: PlaybackMode; label: string; icon: React.FC<any>; desc: string }[] = [
    { id: 'linear', label: 'Linear', icon: ArrowRight, desc: 'Standard sequence' },
    { id: 'shuffle', label: 'Shuffle', icon: Shuffle, desc: 'Dynamic random order' },
    { id: 'continuous', label: 'Continuous', icon: Repeat, desc: 'Repeat full queue' },
    { id: 'repeat_one', label: 'Repeat 1', icon: Repeat1, desc: 'Repeat current track' }
  ];

  return (
    <div className="flex-1 w-full h-full bg-[#070707] text-white flex flex-col justify-between overflow-hidden select-none font-sans relative">
      
      {/* 2. CENTERED HERO PLAYER (Compact & Square-optimized for Automotive Viewport) */}
      <main className="flex-1 w-full max-w-[780px] lg:max-w-[840px] mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col justify-center items-center min-h-0 overflow-hidden my-auto">
        <div className="w-full flex flex-col gap-3 sm:gap-4 max-h-full">
          
          {/* Ambient LED Mood Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black/60 rounded-full border border-neutral-800 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-neutral-300 ml-1" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-300">
                Ambient LED:
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-extrabold text-white">
                {activeLedConfig.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(Object.keys(LED_CONFIGS) as TeslaLedColor[]).map((colKey) => {
                const config = LED_CONFIGS[colKey];
                const isSelected = ledColor === colKey;
                return (
                  <button
                    key={colKey}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeLedColor(colKey);
                    }}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all flex items-center justify-center relative cursor-pointer active:scale-90 ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110 shadow-lg'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    title={config.name}
                    aria-label={config.name}
                  >
                    <span
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-neutral-700/80 shadow-inner"
                      style={{ background: config.dotColor }}
                    />
                  </button>
                );
              })}

              {/* Pulse sync toggle */}
              {ledColor !== 'off' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleLedPulse();
                  }}
                  className={`hitbox-48 h-6 sm:h-7 px-2.5 sm:px-3 ml-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    isLedPulseActive
                      ? 'bg-white text-black shadow-md font-extrabold'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Pulse ambient light to music beat"
                  aria-label="LED Pulse"
                >
                  <Waves className="w-3 h-3" />
                  <span>Pulse {isLedPulseActive ? 'ON' : 'OFF'}</span>
                </button>
              )}
            </div>
          </div>

          {/* A. RECTANGULAR COMPACT TRACK BANNER (Framed by Ambient LED Strip) */}
          <div
            className={`w-full bg-[#101010] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 sm:gap-4 relative overflow-hidden transition-colors duration-300 ${
              ledColor !== 'off'
                ? `car-led-frame car-led-glow ${
                    playerState.isPlaying && isLedPulseActive
                      ? ledColor === 'rainbow'
                        ? 'animate-led-rainbow'
                        : 'animate-led-pulse'
                      : ''
                  }`
                : 'border border-neutral-800/90'
            }`}
            style={activeLedConfig.cssVars}
          >
            {/* Ambient Diffuse Backlight Reflection */}
            {ledColor !== 'off' && (
              <div
                className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, var(--led-color, #E82127) 0%, transparent 80%)`
                }}
              />
            )}

            {/* DYNAMIC SONG INFO CONTAINER: Smooth animated transition when changing tracks */}
            <div className="flex-1 min-w-0 relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentTrack?.id || `track-${playerState.currentTrackIndex}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
                  className="w-full flex items-center gap-3 sm:gap-4 min-w-0"
                >
                  {/* Left: Compact Artwork Thumbnail */}
                  <div className="relative shrink-0 z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700/80 shadow-lg flex items-center justify-center">
                      <AlbumArtwork
                        track={currentTrack}
                        size="fluid"
                        isPlaying={playerState.isPlaying}
                        showVinyl={false}
                        showFormatBadge={true}
                        allowZoom={true}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Middle: Title, Artist, Track Count & Live Visualizer */}
                  <div className="flex-1 min-w-0 space-y-1 z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 truncate">
                          {currentTrack?.album || 'AudioCar Cloud'}
                        </span>
                      </div>

                      <span className="text-[10px] sm:text-xs font-mono font-bold text-neutral-400 bg-neutral-900/90 px-2 py-0.5 rounded-full border border-neutral-800 shrink-0">
                        Track {playerState.queue.length > 0 ? playerState.currentTrackIndex + 1 : 0} of {playerState.queue.length}
                      </span>
                    </div>

                    <div className="min-h-[1.75rem] sm:min-h-[2rem] flex items-center">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight truncate leading-tight w-full">
                        {currentTrack?.title || currentTrack?.name || 'Select a song'}
                      </h1>
                    </div>

                    <div className="flex items-center justify-between gap-3 min-h-[1.25rem]">
                      <p className="text-xs sm:text-sm font-medium text-neutral-400 truncate">
                        {currentTrack?.artist || 'Google Drive Cloud Audio'}
                      </p>

                      {/* Inline Compact Spectrum Visualizer */}
                      <div className="w-24 sm:w-32 md:w-40 shrink-0 hidden xs:block">
                        <AudioVisualizer
                          isPlaying={playerState.isPlaying}
                          height={18}
                          barColor={ledColor !== 'off' && ledColor !== 'rainbow' ? activeLedConfig.dotColor : '#FFFFFF'}
                        />
                      </div>
                    </div>

                    {/* Notice when track is in Google Drive but not connected */}
                    {audioEngine.isTrackRequiringAuth(currentTrack) && (
                      <div 
                        onClick={() => audioEngine.notifyAuthRequired('drive', currentTrack || undefined)}
                        className="mt-1 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs cursor-pointer hover:bg-amber-500/20 transition-all"
                        role="button"
                        tabIndex={0}
                      >
                        <Cloud className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="font-semibold truncate">Drive Disconnected • Tap to connect</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: Tactile Favorite Heart Button */}
            <div className="shrink-0 z-10 pl-1 flex items-center justify-center">
              <button
                type="button"
                onClick={toggleFavorite}
                className="hitbox-48 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-white transition-all flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
                title={currentTrack?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label="Favorite toggle"
              >
                <Heart
                  className={`w-5 h-5 transition-transform ${
                    currentTrack?.isFavorite ? 'fill-white text-white' : 'text-neutral-300 hover:text-white'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* B. PROGRESS SCRUBBER & OPTIONAL SKIP 15s CONTROLS */}
          <div className="w-full space-y-1.5 px-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={effectiveMaxDuration}
                step="0.1"
                value={Math.min(currentPlayTime, effectiveMaxDuration)}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                className="automotive-slider w-full h-7 z-10 cursor-pointer"
                aria-label="Playback position"
              />
              {/* Visual white progress track */}
              <div className="absolute left-0 right-0 h-2 bg-neutral-800 rounded-full pointer-events-none overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 rounded-full ${
                    isScrubbing || progressPercent === 0 ? 'transition-none' : 'transition-[width] duration-150 ease-linear'
                  }`}
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: ledColor !== 'off' && ledColor !== 'rainbow' ? activeLedConfig.dotColor : '#FFFFFF'
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-neutral-400 px-0.5">
              <div className="flex items-center gap-2">
                <span>{formatTime(currentPlayTime)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    audioEngine.skipSeconds(-15);
                  }}
                  className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[10px] font-sans font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Rewind 15 seconds"
                  aria-label="-15 seconds"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>-15s</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    audioEngine.skipSeconds(15);
                  }}
                  className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[10px] font-sans font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Forward 15 seconds"
                  aria-label="+15 seconds"
                >
                  <span>+15s</span>
                  <RotateCw className="w-3 h-3" />
                </button>
                <span>{knownDuration > 0 ? formatTime(knownDuration) : '--:--'}</span>
              </div>
            </div>
          </div>

          {/* C. TACTILE AUTOMOTIVE TRANSPORT DOCK (Framed by Ambient LED Strip) */}
          <div
            className={`w-full bg-[#101010] p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col gap-3 sm:gap-4 shadow-2xl transition-colors duration-300 ${
              ledColor !== 'off'
                ? `car-led-frame car-led-glow ${
                    playerState.isPlaying && isLedPulseActive
                      ? ledColor === 'rainbow'
                        ? 'animate-led-rainbow'
                        : 'animate-led-pulse'
                      : ''
                  }`
                : 'border border-neutral-800/90'
            }`}
            style={activeLedConfig.cssVars}
          >
            {/* Ambient Diffuse Backlight Reflection */}
            {ledColor !== 'off' && (
              <div
                className="absolute inset-0 opacity-15 pointer-events-none transition-opacity duration-700"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, var(--led-color, #E82127) 0%, transparent 80%)`
                }}
              />
            )}
            
            {/* 1. FILA CENTRAL: [🔀 Shuffle]  [|◀ Anterior]  [▶ PLAY / PAUSA]  [Siguiente ▶|]  [🔁 Repetir] */}
            <div className="flex items-center justify-between max-w-lg mx-auto w-full px-2 sm:px-4">
              {/* Shuffle / Aleatorio */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  audioEngine.toggleShuffle();
                }}
                className={`hitbox-48 w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all flex items-center justify-center border cursor-pointer active:scale-95 ${
                  playerState.playbackMode === 'shuffle'
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10 font-bold'
                    : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white hover:border-neutral-500'
                }`}
                title={playerState.playbackMode === 'shuffle' ? 'Shuffle Active' : 'Enable Shuffle'}
                aria-label="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Previous Track */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  audioEngine.previous();
                }}
                className="hitbox-56 w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer hover:bg-neutral-900/60"
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              </button>

              {/* MAIN PLAY / PAUSE BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  audioEngine.togglePlay();
                }}
                disabled={playerState.queue.length === 0}
                className="hitbox-64 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black shadow-[0_0_35px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 mx-1 sm:mx-2"
                title={playerState.isPlaying ? 'Pause' : 'Play'}
                aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
              >
                {playerState.isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-black" />
                ) : (
                  <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-black ml-1" />
                )}
              </button>

              {/* Next Track */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  audioEngine.next();
                }}
                className="hitbox-56 w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer hover:bg-neutral-900/60"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              </button>

              {/* Repeat Mode Cycle (Lineal -> Continuo -> Repetir 1) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  audioEngine.cycleRepeatMode();
                }}
                className={`hitbox-48 w-12 h-12 sm:w-13 sm:h-13 rounded-full transition-all flex items-center justify-center border cursor-pointer active:scale-95 ${
                  playerState.playbackMode === 'continuous' || playerState.playbackMode === 'repeat_one'
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10 font-bold'
                    : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white hover:border-neutral-500'
                }`}
                title={`Repeat Mode: ${playerState.playbackMode === 'repeat_one' ? 'Repeat Track' : playerState.playbackMode === 'continuous' ? 'Repeat All' : 'Off'}`}
                aria-label="Repeat Mode"
              >
                {playerState.playbackMode === 'repeat_one' ? (
                  <Repeat1 className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* 2. FILA INFERIOR: [🔊 ━━━━⚪━━━ 85%]   [🔤 Velocidad 1.0x]   [☰ Lista (122)] */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-2.5 border-t border-neutral-800/80 px-1 gap-2.5">
              {/* Volume Control with direct mute */}
              <div className="flex items-center gap-2.5 w-full sm:w-72">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    audioEngine.toggleMute();
                  }}
                  className="hitbox-48 w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all flex items-center justify-center cursor-pointer border border-neutral-800 active:scale-90"
                  title={playerState.isMuted || playerState.volume === 0 ? 'Unmute' : 'Mute'}
                  aria-label="Mute toggle"
                >
                  {playerState.isMuted || playerState.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={playerState.isMuted ? 0 : playerState.volume}
                    onChange={(e) => {
                      e.preventDefault();
                      audioEngine.setVolume(parseFloat(e.target.value));
                    }}
                    className="automotive-slider w-full h-4 cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-neutral-400 w-9 text-right">
                  {playerState.isMuted ? '0%' : `${Math.round(playerState.volume * 100)}%`}
                </span>
              </div>

              {/* Quick Actions Right: Speed Selector & Queue Drawer Button */}
              <div className="flex items-center gap-2 max-w-full justify-end w-full sm:w-auto">
                {/* Playback speed selector */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const speeds = [1.0, 1.25, 1.5, 0.8];
                    const cur = playerState.playbackRate || 1.0;
                    const nextIdx = (speeds.indexOf(cur) + 1) % speeds.length;
                    audioEngine.setPlaybackRate(speeds[nextIdx]);
                  }}
                  className="hitbox-48 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Change playback speed"
                >
                  <span>{playerState.playbackRate || 1.0}x</span>
                </button>

                {/* Queue / Playlist Drawer Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowQueueDrawer(true);
                  }}
                  className="hitbox-48 px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/80 hover:border-neutral-500 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  title="View and select queue tracks"
                  aria-label="Queue list"
                >
                  <ListMusic className="w-4 h-4 text-amber-400" />
                  <span>Queue ({playerState.queue.length})</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 3. SLIDE-OVER QUEUE DRAWER (Floating overlay panel) */}
      {showQueueDrawer && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowQueueDrawer(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e0e0e] border-l border-neutral-800 h-full p-4 sm:p-6 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-white" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Queue ({playerState.queue.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowQueueDrawer(false);
                }}
                className="hitbox-48 w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center border border-neutral-700 transition-colors cursor-pointer"
                title="Close queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable List inside Drawer */}
            <div className="flex-1 overflow-y-auto space-y-2 py-3 min-h-0 pr-1">
              {playerState.queue.length === 0 ? (
                <div className="py-20 text-center text-neutral-500 space-y-2">
                  <Music2 className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm">No tracks in queue</p>
                </div>
              ) : (
                playerState.queue.map((track, idx) => {
                  const isCurrent = idx === playerState.currentTrackIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={(e) => {
                        e.preventDefault();
                        audioEngine.setQueue(playerState.queue, idx, true);
                      }}
                      className={`hitbox-48 w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                        isCurrent
                          ? 'bg-white text-black border-white shadow-md font-bold'
                          : 'bg-[#141414] hover:bg-[#1a1a1a] text-white border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <span className={`w-5 text-center text-xs font-mono font-bold shrink-0 ${isCurrent ? 'text-black' : 'text-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                          <AlbumArtwork
                            track={track}
                            size="sm"
                            showFormatBadge={false}
                            allowZoom={false}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <div className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-black' : 'text-white group-hover:text-neutral-200'}`}>
                            {track.title}
                          </div>
                          <div className={`text-[11px] truncate ${isCurrent ? 'text-neutral-700 font-medium' : 'text-neutral-400'}`}>
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent && playerState.isPlaying ? (
                          <div className="flex items-center gap-0.5 h-3 px-1">
                            <span className="w-1 h-3 bg-black animate-pulse rounded-full" />
                            <span className="w-1 h-3.5 bg-black animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2 bg-black animate-pulse delay-150 rounded-full" />
                          </div>
                        ) : (
                          <span className={`text-xs font-mono ${isCurrent ? 'text-neutral-800' : 'text-neutral-500'}`}>
                            {track.duration ? formatTime(track.duration) : '--:--'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Drawer Action */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0">
              <span>{playerState.queue.length} tracks in queue</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowQueueDrawer(false);
                }}
                className="px-4 py-1.5 bg-white text-black font-bold uppercase tracking-wider rounded-full text-[11px] hover:bg-neutral-200 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
