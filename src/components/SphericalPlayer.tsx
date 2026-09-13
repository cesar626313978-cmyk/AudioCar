import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Disc, 
  Music, 
  HardDrive, 
  Folder, 
  Search, 
  Loader2, 
  RefreshCw, 
  Check, 
  ArrowLeft,
  Sparkles,
  Globe,
  Plus,
  Minus
} from 'lucide-react';
import { PlayerState, AudioTrack, DriveFolder, DriveAuthUser } from '../types';
import { audioEngine } from '../services/audioEngine';
import { authService } from '../services/authService';
import { driveService } from '../services/driveService';
import { DEMO_TRACKS } from '../data/demoTracks';
import { EclipseNeonBorder } from './EclipseNeonBorder';

interface SphericalPlayerProps {
  playerState: PlayerState;
  user: DriveAuthUser | null;
  tracks: AudioTrack[];
  folders: DriveFolder[];
  onTracksChange: (tracks: AudioTrack[]) => void;
  onFoldersChange: (folders: DriveFolder[]) => void;
  isLoadingDrive: boolean;
  setIsLoadingDrive: (loading: boolean) => void;
}

export function SphericalPlayer({
  playerState,
  user,
  tracks,
  folders,
  onTracksChange,
  onFoldersChange,
  isLoadingDrive,
  setIsLoadingDrive,
}: SphericalPlayerProps) {
  // View mode inside the sphere: 'player' | 'playlist' | 'drive_menu'
  const [innerView, setInnerView] = useState<'player' | 'playlist' | 'drive_menu'>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const sphereRef = useRef<HTMLDivElement>(null);
  const currentTrack = playerState.queue[playerState.currentTrackIndex] || null;

  // Track progress calculation
  const effectiveTime = isScrubbing && scrubTime !== null ? scrubTime : playerState.currentTime;
  const duration = playerState.duration > 0 ? playerState.duration : (currentTrack?.duration || 1);
  const progressFraction = Math.min(1, Math.max(0, effectiveTime / duration));
  const progressDegrees = progressFraction * 360;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Handle radial circumference scrub
  const handleRadialScrub = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!sphereRef.current || duration <= 0) return;
    const rect = sphereRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle clockwise from 12 o'clock (top)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const frac = angle / 360;
    const targetTime = frac * duration;
    setScrubTime(targetTime);
  };

  const handleMouseDownScrub = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    handleRadialScrub(e);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleRadialScrub(moveEvent);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsScrubbing(false);

      if (!sphereRef.current || duration <= 0) return;
      const rect = sphereRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let angle = Math.atan2(upEvent.clientY - centerY, upEvent.clientX - centerX) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      const finalTime = (angle / 360) * duration;
      audioEngine.seek(finalTime);
      setScrubTime(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStartScrub = (e: React.TouchEvent) => {
    setIsScrubbing(true);
    handleRadialScrub(e);

    const onTouchMove = (moveEvent: TouchEvent) => {
      handleRadialScrub(moveEvent);
    };

    const onTouchEnd = (endEvent: TouchEvent) => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      setIsScrubbing(false);

      if (!sphereRef.current || duration <= 0) return;
      const rect = sphereRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const touch = endEvent.changedTouches[0];
      if (touch) {
        let angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
        const finalTime = (angle / 360) * duration;
        audioEngine.seek(finalTime);
      }
      setScrubTime(null);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      setIsLoadingDrive(true);
      setSyncStatusText('Conectando con Google Drive...');
      await authService.requestSignIn();
      await scanDriveForMusic();
    } catch (err: any) {
      console.warn('Login error:', err);
      setSyncStatusText(err?.message || 'Error de conexión');
      setTimeout(() => setSyncStatusText(''), 4000);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Scan music from Google Drive
  const scanDriveForMusic = async () => {
    try {
      setIsLoadingDrive(true);
      setSyncStatusText('Buscando pistas de música...');
      
      // 1. Try finding 'mimusica' or existing selected folder
      let foundTracks = await driveService.listAudioFiles(undefined, undefined, (prog) => {
        setSyncStatusText(prog.step);
      });

      // 2. If empty, perform full drive audio search for any audio files
      if (!foundTracks || foundTracks.length === 0) {
        setSyncStatusText('Explorando biblioteca de audio en Drive...');
        foundTracks = await driveService.scanAllDriveAudioFiles(undefined, (prog) => {
          setSyncStatusText(prog.step);
        });
      }

      if (foundTracks && foundTracks.length > 0) {
        onTracksChange(foundTracks);
        audioEngine.setQueue(foundTracks, 0, false);
        setSyncStatusText(`¡${foundTracks.length} canciones cargadas!`);
      } else {
        setSyncStatusText('No se encontraron archivos de audio.');
      }
      setTimeout(() => setSyncStatusText(''), 3500);
    } catch (e: any) {
      console.error('Scan error:', e);
      setSyncStatusText(e?.message || 'Error al leer Drive');
      setTimeout(() => setSyncStatusText(''), 4000);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Pick folder with Google Picker
  const handlePickFolder = async () => {
    try {
      setIsLoadingDrive(true);
      setSyncStatusText('Abriendo selector de Google Drive...');
      const picked = await driveService.promptPickMusicFolder();
      if (picked) {
        setSyncStatusText(`Cargando carpeta ${picked.name}...`);
        const folderTracks = await driveService.listAudioFiles(picked.id, undefined, (p) => {
          setSyncStatusText(p.step);
        });
        if (folderTracks && folderTracks.length > 0) {
          onTracksChange(folderTracks);
          audioEngine.setQueue(folderTracks, 0, true);
        }
      }
    } catch (e: any) {
      console.warn('Picker cancelled or error:', e);
    } finally {
      setIsLoadingDrive(false);
      setTimeout(() => setSyncStatusText(''), 3000);
    }
  };

  // Load demo tracks
  const handleLoadDemoTracks = () => {
    onTracksChange(DEMO_TRACKS);
    audioEngine.setQueue(DEMO_TRACKS, 0, true);
    setInnerView('player');
  };

  // Cycle repeat mode: 'off' -> 'all' -> 'one'
  const handleToggleRepeat = () => {
    audioEngine.cycleRepeatMode();
  };

  // Toggle shuffle mode
  const handleToggleShuffle = () => {
    audioEngine.toggleShuffle();
  };

  // Filter tracks in internal playlist
  const filteredTracks = useMemo(() => {
    const list = tracks.length > 0 ? tracks : DEMO_TRACKS;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [tracks, searchQuery]);

  // Audio quality tag
  const audioQualityTag = useMemo(() => {
    if (!currentTrack) return 'AUDIO EN ESPERA';
    if (currentTrack.bitrate?.toLowerCase().includes('flac') || currentTrack.name.toLowerCase().endsWith('.flac')) {
      return 'FLAC • 24-BIT BIT-PERFECT';
    }
    if (currentTrack.mimeType.includes('wav')) {
      return 'WAV • PCM LOSSLESS';
    }
    return currentTrack.bitrate || 'DRIVE STREAM • 320 KBPS';
  }, [currentTrack]);

  return (
    <div id="spherical-player-root" className="relative flex items-center justify-center p-2 sm:p-4 pointer-events-auto">
      {/* Dynamic Solar Eclipse Neon Corona - Reacts in Real Time to Music Frequency & Intensity */}
      <EclipseNeonBorder isPlaying={playerState.isPlaying} />
      
      {/* THE SPHERICAL GLOBE CONTAINER (Optimized for Car Touch Screens) */}
      <div 
        ref={sphereRef}
        id="earth-sphere-container"
        className="relative w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] md:w-[560px] md:h-[560px] lg:w-[600px] lg:h-[600px] rounded-full overflow-hidden select-none border-2 border-cyan-400/50 bg-[#030712] shadow-[0_0_60px_rgba(6,182,212,0.35),inset_0_0_100px_rgba(0,0,0,0.98)] flex flex-col items-center justify-between transition-all duration-300"
      >
        {/* TERRESTRIAL GLOBE WIREFRAME (Parallels & Meridians) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 520 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Latitude Parallels */}
          <ellipse cx="260" cy="260" rx="252" ry="252" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 6" />
          <ellipse cx="260" cy="260" rx="252" ry="70" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
          <ellipse cx="260" cy="180" rx="230" ry="50" stroke="#38bdf8" strokeWidth="0.6" opacity="0.4" />
          <ellipse cx="260" cy="340" rx="230" ry="50" stroke="#38bdf8" strokeWidth="0.6" opacity="0.4" />
          <ellipse cx="260" cy="110" rx="170" ry="30" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
          <ellipse cx="260" cy="410" rx="170" ry="30" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
          
          {/* Longitude Meridians */}
          <line x1="260" y1="8" x2="260" y2="512" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
          <line x1="8" y1="260" x2="512" y2="260" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
          <ellipse cx="260" cy="260" rx="80" ry="252" stroke="#38bdf8" strokeWidth="0.6" opacity="0.4" />
          <ellipse cx="260" cy="260" rx="160" ry="252" stroke="#38bdf8" strokeWidth="0.6" opacity="0.4" />
        </svg>

        {/* CIRCUMFERENCE SCRUBBING RING (The Orbital 360° Progress Ring) */}
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10"
          viewBox="0 0 520 520"
        >
          {/* Track background */}
          <circle
            cx="260"
            cy="260"
            r="252"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
          />
          {/* Active progress */}
          <circle
            cx="260"
            cy="260"
            r="252"
            fill="none"
            stroke="url(#earthProgressGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 252}
            strokeDashoffset={(2 * Math.PI * 252) * (1 - progressFraction)}
            className="transition-all duration-75 ease-linear"
          />
          <defs>
            <linearGradient id="earthProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Orbit Scrubber Handle Trigger along the perimeter */}
        <div 
          id="orbital-scrub-ring"
          className="absolute inset-0 rounded-full cursor-pointer z-20 touch-none pointer-events-auto"
          style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 6% 6%, 6% 94%, 94% 94%, 94% 6%, 6% 6%)' }}
          onMouseDown={handleMouseDownScrub}
          onTouchStart={handleTouchStartScrub}
          title="Arrastra o haz clic a lo largo de la circunferencia para avanzar o retroceder"
        />

        {/* Floating Scrubber Time Tooltip when dragging */}
        {isScrubbing && scrubTime !== null && (
          <div className="absolute top-12 z-30 px-3 py-1 bg-cyan-950/90 text-cyan-300 text-xs font-mono font-bold rounded-full border border-cyan-400 shadow-lg pointer-events-none">
            {formatTime(scrubTime)}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: MAIN SPHERICAL PLAYER CONTROLS (OPTIMIZED FOR CAR TOUCH SCREENS) */}
        {/* ========================================================================= */}
        {innerView === 'player' && (
          <div className="relative w-full h-full flex flex-col justify-between items-center p-5 sm:p-7 md:p-8 z-20 text-white select-none">
            
            {/* 1. NORTHERN POLAR REGION: Quick-Touch Drive Status & Audio Format */}
            <div className="flex flex-col items-center gap-2 pt-2 sm:pt-4 w-full max-w-[340px]">
              {/* Google Drive Status Button - Large Touch Target */}
              <button
                id="btn-drive-status"
                onClick={() => setInnerView('drive_menu')}
                className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full bg-cyan-950/70 hover:bg-cyan-900/80 active:scale-95 border-2 border-cyan-400/40 text-xs sm:text-sm font-semibold text-cyan-200 transition-all shadow-md backdrop-blur-md min-h-[44px]"
              >
                <HardDrive className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="truncate max-w-[180px]">
                  {user ? (user.name || user.email.split('@')[0]) : 'Conectar Drive'}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${user ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400'}`} />
              </button>

              {/* Status Notice or Audio Format Badge */}
              {syncStatusText ? (
                <div className="text-[11px] sm:text-xs font-mono text-cyan-300 animate-pulse tracking-wide truncate max-w-[280px]">
                  {syncStatusText}
                </div>
              ) : (
                <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-slate-300/90 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  {audioQualityTag}
                </div>
              )}
            </div>

            {/* 2. EQUATORIAL CORE: Car Touch Playback Triad & Big Song Title */}
            <div className="flex flex-col items-center text-center w-full px-2 sm:px-4 my-auto">
              {/* Big Song Title (High Contrast for Daytime/Nighttime driving glance) */}
              <h2 
                id="track-title"
                className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 max-w-[280px] sm:max-w-[400px] drop-shadow-lg"
                title={currentTrack?.title || 'Sin reproducción'}
              >
                {currentTrack ? currentTrack.title : 'Esfera Terrestre'}
              </h2>

              {/* Artist / Album Name */}
              <p 
                id="track-artist"
                className="text-sm sm:text-base text-cyan-300 font-semibold tracking-wide mt-1.5 truncate max-w-[280px] sm:max-w-[360px]"
              >
                {currentTrack ? currentTrack.artist : 'Google Drive Music'}
              </p>

              {/* High-Visibility Tactile Playback Row (All inside equatorial max-width) */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 mt-4 sm:mt-6 w-full max-w-[330px] sm:max-w-[440px]">
                {/* Shuffle Button */}
                <button
                  id="btn-toggle-shuffle"
                  onClick={handleToggleShuffle}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border-2 shrink-0 ${
                    playerState.isShuffle 
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                      : 'bg-slate-950/70 text-slate-400 border-cyan-500/20 hover:text-white'
                  }`}
                  title={playerState.isShuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'}
                  aria-label="Modo aleatorio"
                >
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Previous Track - Big Car Touch Button */}
                <button
                  id="btn-previous-track"
                  onClick={() => audioEngine.previous()}
                  className="w-12 h-12 sm:w-15 sm:h-15 md:w-16 md:h-16 rounded-full bg-slate-900/80 hover:bg-cyan-950/90 active:scale-90 border-2 border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg transition-all shrink-0"
                  title="Pista anterior"
                  aria-label="Pista anterior"
                >
                  <SkipBack className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {/* Central Play/Pause - Massive Core Button */}
                <button
                  id="btn-play-pause-main"
                  onClick={() => audioEngine.togglePlay()}
                  disabled={playerState.isLoading}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-cyan-500/40 via-cyan-400/30 to-blue-600/50 hover:from-cyan-400/50 hover:to-blue-500/60 active:scale-95 border-3 border-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.55)] flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
                  title={playerState.isPlaying ? 'Pausar' : 'Reproducir'}
                  aria-label={playerState.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {playerState.isLoading ? (
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-200 animate-spin" />
                  ) : playerState.isPlaying ? (
                    <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white" />
                  ) : (
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white ml-1" />
                  )}
                </button>

                {/* Next Track - Big Car Touch Button */}
                <button
                  id="btn-next-track"
                  onClick={() => audioEngine.next()}
                  className="w-12 h-12 sm:w-15 sm:h-15 md:w-16 md:h-16 rounded-full bg-slate-900/80 hover:bg-cyan-950/90 active:scale-90 border-2 border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg transition-all shrink-0"
                  title="Siguiente pista"
                  aria-label="Siguiente pista"
                >
                  <SkipForward className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {/* Repeat Button */}
                <button
                  id="btn-toggle-repeat"
                  onClick={handleToggleRepeat}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border-2 shrink-0 ${
                    playerState.repeatMode !== 'off' 
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                      : 'bg-slate-950/70 text-slate-400 border-cyan-500/20 hover:text-white'
                  }`}
                  title={`Repetición: ${playerState.repeatMode}`}
                  aria-label="Modo repetición"
                >
                  {playerState.repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-200" />
                  ) : (
                    <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {/* Time display: 01:24 / 03:45 */}
              <div className="font-mono text-xs sm:text-sm text-cyan-200 font-bold tracking-widest mt-3">
                <span>{formatTime(effectiveTime)}</span>
                <span className="mx-1.5 text-slate-500">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 3. SOUTHERN POLAR REGION: Tactile Volume & In-Sphere Playlist Button (Safely Contained) */}
            <div className="flex flex-col items-center gap-2.5 pb-5 sm:pb-7 md:pb-8 w-full max-w-[270px] sm:max-w-[320px]">
              
              {/* Tactile Volume Control with Step Buttons - Contained Width */}
              <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/35 text-sm shadow-md w-full">
                {/* Mute / Unmute Button */}
                <button
                  id="btn-toggle-mute"
                  onClick={() => audioEngine.toggleMute()}
                  className="w-8 h-8 rounded-full bg-cyan-950/60 hover:bg-cyan-900/80 active:scale-90 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all border border-cyan-500/20 shrink-0"
                  title={playerState.isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {playerState.isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : playerState.volume > 0.5 ? (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                  ) : (
                    <Volume1 className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                </button>

                {/* Quick Volume Down Step Button */}
                <button
                  id="btn-vol-down"
                  onClick={() => audioEngine.setVolume(Math.max(0, playerState.volume - 0.1))}
                  className="w-8 h-8 rounded-full bg-cyan-950/50 hover:bg-cyan-900/80 active:scale-90 text-cyan-200 flex items-center justify-center border border-cyan-500/30 font-bold shrink-0"
                  title="Bajar volumen"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Tactile Volume Slider */}
                <input
                  id="input-volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={playerState.isMuted ? 0 : playerState.volume}
                  onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-2.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer min-w-[50px]"
                  title={`Volumen: ${Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}%`}
                />

                {/* Quick Volume Up Step Button */}
                <button
                  id="btn-vol-up"
                  onClick={() => audioEngine.setVolume(Math.min(1, playerState.volume + 0.1))}
                  className="w-8 h-8 rounded-full bg-cyan-950/50 hover:bg-cyan-900/80 active:scale-90 text-cyan-200 flex items-center justify-center border border-cyan-500/30 font-bold shrink-0"
                  title="Subir volumen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <span className="font-mono text-[11px] sm:text-xs font-bold text-cyan-300 w-7 text-right shrink-0">
                  {Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}%
                </span>
              </div>

              {/* Centered In-Sphere Playlist Button - Perfectly positioned inside bottom curvature */}
              <button
                id="btn-open-in-sphere-playlist"
                onClick={() => setInnerView('playlist')}
                className="flex items-center justify-center gap-2 py-2 px-5 rounded-full bg-cyan-950/80 hover:bg-cyan-900 active:scale-95 border-2 border-cyan-400/50 text-cyan-100 text-xs sm:text-sm font-bold transition-all shadow-md min-h-[42px] max-w-[210px]"
                title="Ver lista de pistas dentro de la esfera"
              >
                <Disc className="w-4 h-4 text-cyan-300 animate-spin-slow shrink-0" />
                <span className="truncate">Pistas ({tracks.length > 0 ? tracks.length : DEMO_TRACKS.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CIRCULAR IN-SPHERE TRACKLIST (BROWSE SONGS INSIDE THE GLOBE) */}
        {/* ========================================================================= */}
        {innerView === 'playlist' && (
          <div className="relative w-full h-full flex flex-col justify-between p-5 sm:p-7 md:p-8 z-20 text-white select-none">
            {/* Top Bar inside Sphere */}
            <div className="flex items-center justify-between pt-2 border-b border-cyan-500/30 pb-3">
              <button
                id="btn-back-to-player-view"
                onClick={() => setInnerView('player')}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:text-white px-3.5 py-2 rounded-full bg-cyan-950/70 border border-cyan-400/40 active:scale-90 transition-all min-h-[42px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-200 font-bold">
                Biblioteca
              </span>

              <button
                id="btn-refresh-tracks"
                onClick={user ? scanDriveForMusic : handleLoadDemoTracks}
                disabled={isLoadingDrive}
                className="w-10 h-10 flex items-center justify-center text-cyan-300 hover:text-white rounded-full bg-cyan-950/50 border border-cyan-500/30 active:scale-90"
                title="Actualizar canciones"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Search - Car Touch Input */}
            <div className="relative my-2.5">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canción o artista..."
                className="w-full bg-cyan-950/50 border border-cyan-500/30 rounded-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Scrollable Song List strictly fitted inside the circle */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 my-1 max-h-[230px] sm:max-h-[300px] scrollbar-thin scrollbar-thumb-cyan-700">
              {filteredTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Music className="w-10 h-10 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-300 font-medium">No hay canciones disponibles</p>
                  {!user && (
                    <button
                      onClick={handleLoadDemoTracks}
                      className="mt-3 px-4 py-2 rounded-full bg-cyan-600/50 hover:bg-cyan-600 text-xs sm:text-sm text-white font-semibold transition-all"
                    >
                      Cargar canciones de demostración
                    </button>
                  )}
                </div>
              ) : (
                filteredTracks.map((t, idx) => {
                  const isCurrent = currentTrack?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const originalIndex = playerState.queue.findIndex(item => item.id === t.id);
                        if (originalIndex >= 0) {
                          audioEngine.transitionToTrackIndex(originalIndex);
                        } else {
                          audioEngine.setQueue(filteredTracks, idx, true);
                        }
                        setInnerView('player');
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all min-h-[48px] active:scale-[0.98] ${
                        isCurrent 
                          ? 'bg-cyan-500/30 border-2 border-cyan-400 text-white shadow-md' 
                          : 'hover:bg-cyan-950/50 text-slate-200 border border-cyan-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {isCurrent && playerState.isPlaying ? (
                          <div className="flex gap-1 items-end h-4 w-4 shrink-0">
                            <span className="w-1 h-full bg-cyan-400 animate-pulse" />
                            <span className="w-1 h-2/3 bg-cyan-300 animate-pulse" />
                            <span className="w-1 h-4/5 bg-cyan-200 animate-pulse" />
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 w-5 text-center shrink-0">{idx + 1}</span>
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-xs sm:text-sm truncate">{t.title}</p>
                          <p className="text-[11px] sm:text-xs text-cyan-300/80 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-400 ml-2 shrink-0">
                        {formatTime(t.duration)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Quick Switch */}
            <div className="pt-2.5 border-t border-cyan-500/30 flex justify-center">
              <button
                onClick={() => setInnerView('player')}
                className="text-xs sm:text-sm text-cyan-300 hover:text-white flex items-center gap-2 py-2 px-4 rounded-full bg-cyan-950/60 border border-cyan-500/30 active:scale-95"
              >
                <Globe className="w-4 h-4" />
                <span>Volver al Reproductor Central</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: GOOGLE DRIVE CONNECTION & FOLDER HUB (INSIDE THE SPHERE) */}
        {/* ========================================================================= */}
        {innerView === 'drive_menu' && (
          <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-8 z-20 text-white">
            {/* Header */}
            <div className="flex items-center justify-between pt-2 border-b border-cyan-500/20 pb-2">
              <button
                onClick={() => setInnerView('player')}
                className="flex items-center gap-1 text-xs text-cyan-300 hover:text-white px-2 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Google Drive
              </span>
              <div className="w-6" />
            </div>

            {/* Drive Connection Status Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-3">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
                <HardDrive className="w-7 h-7" />
              </div>

              {user ? (
                <>
                  <div>
                    <h3 className="text-base font-bold text-white">{user.name}</h3>
                    <p className="text-xs text-cyan-300 font-mono">{user.email}</p>
                    <p className="text-xs text-emerald-400 mt-1 flex items-center justify-center gap-1 font-medium">
                      <Check className="w-4 h-4" /> Conectado (Solo lectura)
                    </p>
                  </div>

                  <div className="w-full max-w-[260px] space-y-2.5 pt-2">
                    {/* Pick Folder Button */}
                    <button
                      onClick={handlePickFolder}
                      disabled={isLoadingDrive}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-xs sm:text-sm font-bold text-white transition-all shadow-md min-h-[46px]"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Elegir Carpeta de Música</span>
                    </button>

                    {/* Scan Whole Drive Button */}
                    <button
                      onClick={scanDriveForMusic}
                      disabled={isLoadingDrive}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-xs sm:text-sm text-cyan-200 transition-all min-h-[44px]"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      <span>Escanear Todo Google Drive</span>
                    </button>

                    {/* Disconnect Button */}
                    <button
                      onClick={async () => {
                        await authService.signOut();
                        setInnerView('player');
                      }}
                      className="w-full text-xs text-rose-400 hover:underline pt-1 py-1"
                    >
                      Cerrar sesión de Drive
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-base font-bold text-white">Google Drive</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-[260px]">
                      Conéctate para reproducir tus archivos de música en streaming de alta fidelidad.
                    </p>
                    <p className="text-[11px] text-cyan-400 font-mono mt-1">
                      (Solo lectura • Sin permisos sensibles)
                    </p>
                  </div>

                  <div className="w-full max-w-[260px] space-y-2.5 pt-2">
                    {/* Sign in with Google Button */}
                    <button
                      id="btn-google-drive-login"
                      onClick={handleGoogleSignIn}
                      disabled={isLoadingDrive}
                      className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-900 text-xs sm:text-sm font-bold shadow-lg transition-transform min-h-[48px]"
                    >
                      {isLoadingDrive ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.92H1.26v3.15C3.25 21.36 7.35 24 12 24z" />
                          <path fill="#FBBC05" d="M5.32 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.57H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.43l4.06-3.15z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.64 1.26 6.57l4.06 3.15c.94-2.82 3.58-4.97 6.68-4.97z" />
                        </svg>
                      )}
                      <span>Iniciar sesión con Google</span>
                    </button>

                    {/* Fallback to Demo Music */}
                    <button
                      onClick={handleLoadDemoTracks}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-xs sm:text-sm font-semibold text-cyan-200 transition-colors min-h-[44px]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Probar pistas de muestra</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Back to Player */}
            <div className="pt-2.5 border-t border-cyan-500/30 flex justify-center">
              <button
                onClick={() => setInnerView('player')}
                className="text-xs sm:text-sm text-cyan-300 hover:text-white flex items-center gap-2 py-2 px-4 rounded-full bg-cyan-950/60 border border-cyan-500/30 active:scale-95"
              >
                <Globe className="w-4 h-4" />
                <span>Volver a la Esfera</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
