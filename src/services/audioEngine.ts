/**
 * Automotive Audio Engine & Media Session API Controller - Sophisticated Dark
 * Features:
 * - HTML5 Audio playback with retry logic for automotive network drops
 * - Real Web Audio API Dual-Engine Crossfade (Fundido Cruzado 1s-12s)
 * - Desvanecimiento (Smooth Fade In & Fade Out on Play / Pause / Seek / Track Switch)
 * - 4 Playback Modes: Lineal, Suflé (Shuffle), Continuo (Loop All), Repetir 1 (Loop Track)
 * - Web Audio API 3-Band Equalizer (DSP) & Realtime Analyser for Visualizer
 * - Next-track buffer preloader for zero-latency gapless transitions
 * - navigator.mediaSession handlers (Steering wheel controls & Car HUD metadata with Album Art)
 */

import { AudioTrack, PlayerState, RepeatMode, PlaybackMode, PlaybackScope, ImageFormat } from '../types';
import { dbService } from './dbService';
import { driveService } from './driveService';
import { cloudService } from './cloudService';
import { teslaKeepAlive } from './teslaKeepAliveService';

type StateListener = (state: PlayerState) => void;

class AudioEngine {
  private audioA: HTMLAudioElement;
  private audioB: HTMLAudioElement;
  private activePlayerIndex: 0 | 1 = 0; // 0 for audioA, 1 for audioB

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Nodes for Audio A
  private sourceA: MediaElementAudioSourceNode | null = null;
  private gainNodeA: GainNode | null = null;

  // Nodes for Audio B
  private sourceB: MediaElementAudioSourceNode | null = null;
  private gainNodeB: GainNode | null = null;

  // Master Gain & EQ Filters
  private masterGain: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  // Automotive Volume Normalization (Auto-Leveling / Dynamics Compressor DSP)
  private compressor: DynamicsCompressorNode | null = null;
  private normalizationGain: GainNode | null = null;

  private allAvailableTracks: AudioTrack[] = [];

  private state: PlayerState = {
    isPlaying: false,
    currentTrackIndex: -1,
    queue: [],
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    isMuted: false,
    isShuffle: false,
    repeatMode: 'off',
    playbackMode: 'linear',
    playbackScope: 'all_folders',
    isCrossfadeEnabled: false,
    crossfadeDuration: 4,
    isFadeInOutEnabled: true,
    fadeInOutDuration: 3,
    playbackRate: 1.0,
    isLoading: false,
    bufferedEnd: 0,
    error: null,
    eqPreset: 'Balanced',
    isNormalizationEnabled: true,
    normalizationPreset: 'balanced',
    bufferAheadCount: 3,
    preloadedTrackIds: [],
    isPreloading: false
  };

  private listeners: Set<StateListener> = new Set();
  private originalQueueOrder: AudioTrack[] = [];
  private retryCount = 0;
  private readonly MAX_RETRIES = 4;
  private isCrossfading = false;
  private crossfadeTimer: any = null;
  private silentCarrierStarted = false;
  private mediaSessionSyncInterval: any = null;

  constructor() {
    this.audioA = new Audio();
    this.audioA.preload = 'auto';
    this.audioA.crossOrigin = 'anonymous';

    this.audioB = new Audio();
    this.audioB.preload = 'auto';
    this.audioB.crossOrigin = 'anonymous';

    this.attachAudioListeners(this.audioA, 0);
    this.attachAudioListeners(this.audioB, 1);
    this.setupMediaSession();
    this.restoreSavedSettings();
    this.setupKeepAliveIntegration();
  }

  private setupKeepAliveIntegration() {
    if (typeof window === 'undefined') return;

    // 1. Listen for scheduled seamless auto-refresh
    const onAutoRefresh = () => {
      if (this.state.queue.length > 0) {
        teslaKeepAlive.triggerSeamlessRefresh(this.state);
      }
    };
    window.addEventListener('incar-auto-refresh-triggered', onAutoRefresh);
    window.addEventListener('auto-refresh-triggered', onAutoRefresh);

    // 2. Listen for watchdog health check (prevents silence / frozen audio after 4-5 songs)
    const onWatchdogCheck = async () => {
      if (!this.state.isPlaying) return;

      const isHealthy = teslaKeepAlive.checkPlaybackHealth(
        this.state.isPlaying,
        this.activeAudio.currentTime,
        this.state.isLoading
      );

      if (!isHealthy) {
        console.warn('Watchdog: Playback stall detected. Auto-recovering stream pipeline...');
        try {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          if (this.activeAudio.paused && this.state.isPlaying) {
            await this.activeAudio.play();
          } else if (this.state.isPlaying) {
            // Re-trigger current track seamlessly at current second
            const savedSec = this.activeAudio.currentTime;
            await this.playCurrentTrack();
            if (savedSec > 2) {
              this.seek(savedSec);
            }
          }
        } catch (e) {
          console.warn('Watchdog auto-recovery attempt notice:', e);
        }
      }
    };
    window.addEventListener('incar-watchdog-check', onWatchdogCheck);
    window.addEventListener('watchdog-check', onWatchdogCheck);

    // 3. Attempt instantaneous session restoration on initial startup / after auto-refresh
    setTimeout(() => {
      this.restorePersistedSession();
    }, 500);
  }

  public async restorePersistedSession() {
    const saved = teslaKeepAlive.getSavedSession();
    if (!saved || !saved.queue || saved.queue.length === 0) return;

    try {
      this.state.queue = saved.queue;
      this.originalQueueOrder = [...saved.queue];
      this.state.currentTrackIndex = Math.max(0, Math.min(saved.currentTrackIndex, saved.queue.length - 1));
      this.state.playbackMode = saved.playbackMode || this.state.playbackMode;
      this.state.playbackScope = saved.playbackScope || this.state.playbackScope;
      this.state.volume = saved.volume !== undefined ? saved.volume : this.state.volume;
      this.state.isShuffle = this.state.playbackMode === 'shuffle';
      this.state.repeatMode = this.state.playbackMode === 'continuous' ? 'all' : this.state.playbackMode === 'repeat_one' ? 'one' : 'off';
      this.state.eqPreset = saved.eqPreset || this.state.eqPreset;

      this.audioA.volume = this.state.volume;
      this.audioB.volume = this.state.volume;

      const currentTrack = this.getCurrentTrack();
      if (currentTrack) {
        this.updateMediaSessionMetadata(currentTrack);
      }

      this.notifyListeners();

      // If it was actively playing before the 5-minute auto-refresh or page restart, resume automatically
      if (saved.isPlaying && teslaKeepAlive.getStatus().autoRecoveryEnabled) {
        await this.playCurrentTrack();
        if (saved.currentTime > 1) {
          this.seek(saved.currentTime);
        }
      }
    } catch (err) {
      console.warn('Could not auto-restore persisted session:', err);
    }
  }

  private get activeAudio(): HTMLAudioElement {
    return this.activePlayerIndex === 0 ? this.audioA : this.audioB;
  }

  private get inactiveAudio(): HTMLAudioElement {
    return this.activePlayerIndex === 0 ? this.audioB : this.audioA;
  }

  private get activeGainNode(): GainNode | null {
    return this.activePlayerIndex === 0 ? this.gainNodeA : this.gainNodeB;
  }

  private get inactiveGainNode(): GainNode | null {
    return this.activePlayerIndex === 0 ? this.gainNodeB : this.gainNodeA;
  }

  private async restoreSavedSettings() {
    try {
      const savedVolume = await dbService.getSetting<number>('player_volume', 0.85);
      const savedMode = await dbService.getSetting<PlaybackMode>('player_mode', 'linear');
      const savedScope = await dbService.getSetting<PlaybackScope>('player_scope', 'all_folders');
      const savedSpeed = await dbService.getSetting<number>('player_speed', 1.0);
      const savedEq = await dbService.getSetting<string>('player_eq', 'Balanced');
      const savedCrossfade = await dbService.getSetting<boolean>('player_crossfade', false);
      const savedCrossfadeDur = await dbService.getSetting<number>('player_crossfade_dur', 4);
      const savedFadeInOut = await dbService.getSetting<boolean>('player_fade_in_out', true);
      const savedFadeDur = await dbService.getSetting<number>('player_fade_dur', 3);
      const savedNormEnabled = await dbService.getSetting<boolean>('player_norm_enabled', true);
      const savedNormPreset = await dbService.getSetting<'balanced' | 'dynamic' | 'night'>('player_norm_preset', 'balanced');
      const savedBufferCount = await dbService.getSetting<number>('player_buffer_ahead', 3);

      this.state.volume = savedVolume;
      this.state.playbackMode = savedMode;
      this.state.playbackScope = savedScope;
      this.state.isShuffle = savedMode === 'shuffle';
      this.state.repeatMode = savedMode === 'continuous' ? 'all' : savedMode === 'repeat_one' ? 'one' : 'off';
      this.state.playbackRate = savedSpeed;
      this.state.eqPreset = savedEq;
      this.state.isCrossfadeEnabled = savedCrossfade;
      this.state.crossfadeDuration = savedCrossfadeDur;
      this.state.isFadeInOutEnabled = savedFadeInOut;
      this.state.fadeInOutDuration = savedFadeDur;
      this.state.isNormalizationEnabled = savedNormEnabled;
      this.state.normalizationPreset = savedNormPreset;
      this.state.bufferAheadCount = savedBufferCount;

      this.audioA.volume = savedVolume;
      this.audioB.volume = savedVolume;
      this.audioA.playbackRate = savedSpeed;
      this.audioB.playbackRate = savedSpeed;
      this.notifyListeners();
    } catch (e) {
      console.warn('Could not restore audio settings:', e);
    }
  }

  private initWebAudio() {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.state.isMuted ? 0 : this.state.volume, this.audioContext.currentTime);

      this.gainNodeA = this.audioContext.createGain();
      this.gainNodeA.gain.setValueAtTime(1.0, this.audioContext.currentTime);

      this.gainNodeB = this.audioContext.createGain();
      this.gainNodeB.gain.setValueAtTime(0.0, this.audioContext.currentTime);

      // Filters
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 250;

      this.midFilter = this.audioContext.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1000;
      this.midFilter.Q.value = 1.0;

      this.trebleFilter = this.audioContext.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 4000;

      // Dynamics Compressor (Volume Normalization / Rebalance / Auto-gain)
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.normalizationGain = this.audioContext.createGain();
      this.normalizationGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);

      // Sources
      this.sourceA = this.audioContext.createMediaElementSource(this.audioA);
      this.sourceB = this.audioContext.createMediaElementSource(this.audioB);

      // Connections:
      // sourceA -> gainNodeA \
      //                       -> masterGain -> bass -> mid -> treble -> compressor -> normalizationGain -> analyser -> destination
      // sourceB -> gainNodeB /
      this.sourceA.connect(this.gainNodeA);
      this.sourceB.connect(this.gainNodeB);

      this.gainNodeA.connect(this.masterGain);
      this.gainNodeB.connect(this.masterGain);

      this.masterGain.connect(this.bassFilter);
      this.bassFilter.connect(this.midFilter);
      this.midFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.compressor);
      this.compressor.connect(this.normalizationGain);
      this.normalizationGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.applyEQPreset(this.state.eqPreset);
      this.applyNormalizationSettings();

      // Media Session & Audio Focus In-Car Keep-Alive Carrier:
      // Feeds a subliminal continuous stream to the hardware destination
      // Prevents browser audio thread from releasing audio focus to the FM car radio during track changes or network buffer blips
      if (!this.silentCarrierStarted) {
        try {
          const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
          const carrier = this.audioContext.createBufferSource();
          carrier.buffer = buffer;
          carrier.loop = true;
          const carrierGain = this.audioContext.createGain();
          carrierGain.gain.setValueAtTime(0.00001, this.audioContext.currentTime);
          carrier.connect(carrierGain);
          carrierGain.connect(this.audioContext.destination);
          carrier.start();
          this.silentCarrierStarted = true;
        } catch (carrierErr) {
          console.warn('Silent keepalive node skipped:', carrierErr);
        }
      }
    } catch (err) {
      console.warn('Web Audio API not supported or blocked:', err);
    }
  }

  private attachAudioListeners(audioEl: HTMLAudioElement, playerIndex: 0 | 1) {
    audioEl.addEventListener('play', () => {
      if (this.activePlayerIndex === playerIndex) {
        this.state.isPlaying = true;
        this.state.isLoading = false;
        this.state.error = null;
        this.notifyListeners();
        this.startMediaSessionPositionSync();
        teslaKeepAlive.setupWakeLock();
        teslaKeepAlive.startSilentAudioCarrier();
        this.persistCurrentSessionState();
      }
    });

    audioEl.addEventListener('pause', () => {
      if (this.activePlayerIndex === playerIndex && !this.isCrossfading) {
        this.state.isPlaying = false;
        this.stopMediaSessionPositionSync();
        this.notifyListeners();
        this.updateMediaSessionPosition();
        this.persistCurrentSessionState();
      }
    });

    audioEl.addEventListener('timeupdate', () => {
      if (this.activePlayerIndex === playerIndex) {
        this.state.currentTime = audioEl.currentTime;
        if (audioEl.buffered.length > 0) {
          this.state.bufferedEnd = audioEl.buffered.end(audioEl.buffered.length - 1);
        }

        // Check for Crossfade trigger
        if (
          this.state.isCrossfadeEnabled &&
          !this.isCrossfading &&
          audioEl.duration > 0 &&
          audioEl.currentTime >= audioEl.duration - this.state.crossfadeDuration &&
          audioEl.duration > this.state.crossfadeDuration * 2
        ) {
          this.triggerCrossfadeToNext();
        }

        this.notifyListeners();
        this.updateMediaSessionPosition();
        
        // Save session state periodically during playback
        if (Math.floor(audioEl.currentTime) % 3 === 0) {
          this.persistCurrentSessionState();
        }
      }
    });

    audioEl.addEventListener('durationchange', () => {
      if (this.activePlayerIndex === playerIndex && !isNaN(audioEl.duration)) {
        this.state.duration = audioEl.duration;
        this.notifyListeners();
      }
    });

    audioEl.addEventListener('waiting', () => {
      if (this.activePlayerIndex === playerIndex) {
        this.state.isLoading = true;
        this.notifyListeners();
      }
    });

    audioEl.addEventListener('playing', () => {
      if (this.activePlayerIndex === playerIndex) {
        this.state.isLoading = false;
        this.retryCount = 0;
        this.notifyListeners();
      }
    });

    audioEl.addEventListener('ended', () => {
      if (this.activePlayerIndex === playerIndex && !this.isCrossfading) {
        this.handleTrackEnded();
      }
    });

    audioEl.addEventListener('error', (e) => {
      if (this.activePlayerIndex === playerIndex) {
        console.error('Audio playback error:', audioEl.error, e);
        if (this.retryCount < this.MAX_RETRIES && this.getCurrentTrack()) {
          this.retryCount++;
          setTimeout(() => this.playCurrentTrack(), 1000);
        } else {
          this.state.isLoading = false;
          this.state.isPlaying = false;
          this.state.error = 'Error al reproducir pista. Comprueba la conexión o sesión de Drive.';
          this.notifyListeners();
        }
      }
    });
  }

  private setupMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => this.play());
    ms.setActionHandler('pause', () => this.pause());
    ms.setActionHandler('previoustrack', () => this.previous());
    ms.setActionHandler('nexttrack', () => this.next());

    try {
      ms.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          this.seek(details.seekTime);
        }
      });
      ms.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seek(Math.min(this.activeAudio.currentTime + skipTime, this.activeAudio.duration || 0));
      });
      ms.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seek(Math.max(this.activeAudio.currentTime - skipTime, 0));
      });
      ms.setActionHandler('stop', () => this.pause());
    } catch (e) {
      console.warn('MediaSession handler warning:', e);
    }
  }

  private updateMediaSessionMetadata(track: AudioTrack) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const baseArt = track.thumbnailUrl || '/audiocar-logo.svg';
    const artwork = [
      { src: baseArt, sizes: '96x96', type: 'image/jpeg' },
      { src: baseArt, sizes: '128x128', type: 'image/jpeg' },
      { src: baseArt, sizes: '192x192', type: 'image/jpeg' },
      { src: baseArt, sizes: '256x256', type: 'image/jpeg' },
      { src: baseArt, sizes: '384x384', type: 'image/jpeg' },
      { src: baseArt, sizes: '512x512', type: 'image/jpeg' }
    ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || track.name,
      artist: track.artist || 'AudioCar',
      album: track.album || 'Google Drive Cloud',
      artwork
    });

    this.updateMediaSessionPosition();
  }

  private startMediaSessionPositionSync() {
    this.stopMediaSessionPositionSync();
    this.updateMediaSessionPosition();
    // 300ms interval Keep-Alive to prevent mobile OS Garbage Collection / thread sleeping
    this.mediaSessionSyncInterval = setInterval(() => {
      if (this.state.isPlaying && !this.activeAudio.paused) {
        this.updateMediaSessionPosition();
      }
    }, 300);
  }

  private stopMediaSessionPositionSync() {
    if (this.mediaSessionSyncInterval) {
      clearInterval(this.mediaSessionSyncInterval);
      this.mediaSessionSyncInterval = null;
    }
  }

  private updateMediaSessionPosition() {
    if (
      typeof window !== 'undefined' &&
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      !isNaN(this.activeAudio.duration) &&
      this.activeAudio.duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.activeAudio.duration,
          playbackRate: this.activeAudio.playbackRate || 1.0,
          position: Math.min(Math.max(0, this.activeAudio.currentTime), this.activeAudio.duration)
        });
      } catch (e) {
        // Suppress rapid seek sync warnings
      }
    }
  }

  public setAllAvailableTracks(tracks: AudioTrack[]) {
    if (tracks && tracks.length > 0) {
      this.allAvailableTracks = [...tracks];
    }
  }

  public getAllAvailableTracks(): AudioTrack[] {
    return this.allAvailableTracks;
  }

  public async setPlaybackScope(scope: PlaybackScope, allTracks?: AudioTrack[]) {
    this.state.playbackScope = scope;
    await dbService.setSetting('player_scope', scope);

    const libraryTracks = (allTracks && allTracks.length > 0)
      ? allTracks
      : (this.allAvailableTracks.length > 0 ? this.allAvailableTracks : this.originalQueueOrder);

    if (libraryTracks.length === 0) {
      this.notifyListeners();
      return;
    }

    this.allAvailableTracks = [...libraryTracks];
    const currentTrack = this.getCurrentTrack();

    if (scope === 'selected_folder') {
      if (currentTrack) {
        // Filter by current track's folder or album
        const folderTracks = libraryTracks.filter((t) => {
          if (currentTrack.folderId) {
            return t.folderId === currentTrack.folderId;
          }
          if (currentTrack.folderPath) {
            return t.folderPath === currentTrack.folderPath;
          }
          if (currentTrack.album && currentTrack.album !== 'Google Drive Cloud' && currentTrack.album !== 'mimusica') {
            return t.album === currentTrack.album;
          }
          return !t.folderId || t.folderId === 'root';
        });

        const targetList = folderTracks.length > 0 ? folderTracks : [currentTrack];
        const newIndex = targetList.findIndex((t) => t.id === currentTrack.id);
        this.originalQueueOrder = [...targetList];
        this.state.queue = this.state.isShuffle ? this.shuffleArray([...targetList]) : [...targetList];
        this.state.currentTrackIndex = newIndex !== -1 ? (this.state.isShuffle ? this.state.queue.findIndex((t) => t.id === currentTrack.id) : newIndex) : 0;
      }
    } else {
      // all_folders
      if (currentTrack) {
        const newIndex = libraryTracks.findIndex((t) => t.id === currentTrack.id);
        this.originalQueueOrder = [...libraryTracks];
        this.state.queue = this.state.isShuffle ? this.shuffleArray([...libraryTracks]) : [...libraryTracks];
        this.state.currentTrackIndex = newIndex !== -1 ? (this.state.isShuffle ? this.state.queue.findIndex((t) => t.id === currentTrack.id) : newIndex) : 0;
      } else {
        this.originalQueueOrder = [...libraryTracks];
        this.state.queue = this.state.isShuffle ? this.shuffleArray([...libraryTracks]) : [...libraryTracks];
        this.state.currentTrackIndex = 0;
      }
    }

    this.notifyListeners();
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public async setQueue(tracks: AudioTrack[], startIndex: number = 0, autoPlay: boolean = true) {
    if (tracks.length === 0) return;

    this.originalQueueOrder = [...tracks];
    this.state.queue = this.state.isShuffle ? this.shuffleArray([...tracks]) : [...tracks];
    this.state.currentTrackIndex = Math.max(0, Math.min(startIndex, this.state.queue.length - 1));
    this.retryCount = 0;
    this.notifyListeners();

    if (autoPlay) {
      await this.playCurrentTrack();
    }
  }

  public getCurrentTrack(): AudioTrack | null {
    if (this.state.currentTrackIndex >= 0 && this.state.currentTrackIndex < this.state.queue.length) {
      return this.state.queue[this.state.currentTrackIndex];
    }
    return null;
  }

  public async playTrackById(trackId: string, trackList?: AudioTrack[]) {
    const list = trackList || this.state.queue;
    const index = list.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      if (trackList) {
        await this.setQueue(trackList, index, true);
      } else {
        await this.transitionToTrackIndex(index);
      }
    }
  }

  private async getTrackStreamUrl(track: AudioTrack): Promise<string> {
    const url = await cloudService.getStreamUrl(track);
    if (url) return url;
    if (track.source === 'drive' && track.driveFileId) {
      return await driveService.getStreamBlobUrl(track.driveFileId, track.mimeType);
    }
    return track.streamUrl || '';
  }

  private async playCurrentTrack() {
    const track = this.getCurrentTrack();
    if (!track) return;

    this.initWebAudio();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this.state.isLoading = true;
    this.state.error = null;
    this.state.currentTime = 0;
    this.state.duration = track.duration || 0;
    this.notifyListeners();
    this.updateMediaSessionMetadata(track);

    try {
      const streamUrl = await this.getTrackStreamUrl(track);
      if (!streamUrl) throw new Error('No audio URL found for this track');

      const currentAudio = this.activeAudio;
      currentAudio.src = streamUrl;
      currentAudio.playbackRate = this.state.playbackRate;

      // Desvanecimiento (Fade In)
      if (this.state.isFadeInOutEnabled && this.activeGainNode && this.audioContext) {
        const now = this.audioContext.currentTime;
        this.activeGainNode.gain.cancelScheduledValues(now);
        this.activeGainNode.gain.setValueAtTime(0, now);
        this.activeGainNode.gain.linearRampToValueAtTime(1.0, now + this.state.fadeInOutDuration);
      } else if (this.activeGainNode && this.audioContext) {
        this.activeGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      }

      await currentAudio.play();
      await dbService.logTrackPlayed(track.id);
      
      // Trigger background Mega-Buffer for upcoming tracks
      this.prefetchUpcomingTracks().catch(() => {});
    } catch (err: any) {
      console.error('playCurrentTrack error:', err);
      this.state.isLoading = false;
      this.state.isPlaying = false;
      this.state.error = err.message || 'Error al reproducir audio';
      this.notifyListeners();
    }
  }

  /**
   * Seamless Crossfade / Fade Transition to Any Target Track Index
   */
  public async transitionToTrackIndex(targetIdx: number) {
    if (targetIdx < 0 || targetIdx >= this.state.queue.length) return;
    if (targetIdx === this.state.currentTrackIndex && this.state.isPlaying) return;

    const targetTrack = this.state.queue[targetIdx];
    if (!targetTrack) return;

    // If not currently playing or both transitions disabled, perform standard direct play
    const shouldUseTransition = this.state.isPlaying && (this.state.isCrossfadeEnabled || this.state.isFadeInOutEnabled);
    if (!shouldUseTransition) {
      this.state.currentTrackIndex = targetIdx;
      await this.playCurrentTrack();
      return;
    }

    const duration = this.state.isCrossfadeEnabled
      ? this.state.crossfadeDuration
      : this.state.fadeInOutDuration;

    this.isCrossfading = true;
    const nextPlayerIndex = this.activePlayerIndex === 0 ? 1 : 0;
    const incomingAudio = nextPlayerIndex === 0 ? this.audioA : this.audioB;
    const outgoingAudio = this.activeAudio;
    const incomingGain = nextPlayerIndex === 0 ? this.gainNodeA : this.gainNodeB;
    const outgoingGain = this.activeGainNode;

    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const streamUrl = await this.getTrackStreamUrl(targetTrack);
      if (!streamUrl) throw new Error('No stream URL available');

      incomingAudio.src = streamUrl;
      incomingAudio.playbackRate = this.state.playbackRate;

      const now = this.audioContext ? this.audioContext.currentTime : 0;

      if (this.audioContext && incomingGain && outgoingGain) {
        incomingGain.gain.cancelScheduledValues(now);
        incomingGain.gain.setValueAtTime(0, now);
        incomingGain.gain.linearRampToValueAtTime(1.0, now + duration);

        outgoingGain.gain.cancelScheduledValues(now);
        outgoingGain.gain.setValueAtTime(1.0, now);
        outgoingGain.gain.linearRampToValueAtTime(0, now + duration);
      }

      await incomingAudio.play();

      this.activePlayerIndex = nextPlayerIndex;
      this.state.currentTrackIndex = targetIdx;
      this.updateMediaSessionMetadata(targetTrack);
      this.notifyListeners();
      await dbService.logTrackPlayed(targetTrack.id);
      this.prefetchUpcomingTracks().catch(() => {});

      if (this.crossfadeTimer) clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = setTimeout(() => {
        outgoingAudio.pause();
        outgoingAudio.currentTime = 0;
        this.isCrossfading = false;
      }, duration * 1000);
    } catch (e) {
      console.warn('Transition execution failed, falling back to standard playback:', e);
      this.isCrossfading = false;
      this.state.currentTrackIndex = targetIdx;
      await this.playCurrentTrack();
    }
  }

  private async triggerCrossfadeToNext() {
    const nextIdx = this.getNextTrackIndex();
    if (nextIdx === null || nextIdx === this.state.currentTrackIndex) return;
    await this.transitionToTrackIndex(nextIdx);
  }

  private getNextTrackIndex(): number | null {
    if (this.state.queue.length === 0) return null;

    if (this.state.playbackMode === 'repeat_one') {
      return this.state.currentTrackIndex;
    }

    if (this.state.currentTrackIndex + 1 < this.state.queue.length) {
      return this.state.currentTrackIndex + 1;
    }

    // At the end of queue
    if (this.state.playbackMode === 'continuous' || this.state.repeatMode === 'all') {
      return 0; // loop back to first track
    }

    return null; // Stop at end for 'linear' mode
  }

  public async play() {
    if (this.activeAudio.src && this.state.currentTrackIndex !== -1) {
      try {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        // Desvanecimiento (Fade in)
        if (this.state.isFadeInOutEnabled && this.activeGainNode && this.audioContext) {
          const now = this.audioContext.currentTime;
          this.activeGainNode.gain.cancelScheduledValues(now);
          this.activeGainNode.gain.setValueAtTime(0, now);
          this.activeGainNode.gain.linearRampToValueAtTime(1.0, now + this.state.fadeInOutDuration);
        }

        await this.activeAudio.play();
      } catch (e) {
        console.warn('Play interrupted:', e);
      }
    } else if (this.state.queue.length > 0) {
      this.state.currentTrackIndex = 0;
      await this.playCurrentTrack();
    }
  }

  public pause() {
    // Desvanecimiento (Fade out)
    if (this.state.isFadeInOutEnabled && this.activeGainNode && this.audioContext && this.state.isPlaying) {
      const now = this.audioContext.currentTime;
      this.activeGainNode.gain.cancelScheduledValues(now);
      this.activeGainNode.gain.setValueAtTime(1.0, now);
      this.activeGainNode.gain.linearRampToValueAtTime(0, now + this.state.fadeInOutDuration);

      setTimeout(() => {
        this.activeAudio.pause();
        this.state.isPlaying = false;
        this.notifyListeners();
      }, this.state.fadeInOutDuration * 1000);
    } else {
      this.activeAudio.pause();
      this.state.isPlaying = false;
      this.notifyListeners();
    }
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public async next() {
    if (this.state.queue.length === 0) return;

    if (this.state.playbackMode === 'repeat_one') {
      this.seek(0);
      await this.play();
      return;
    }

    const nextIndex = this.getNextTrackIndex();
    if (nextIndex !== null) {
      await this.transitionToTrackIndex(nextIndex);
    } else {
      this.pause();
      this.seek(0);
    }
  }

  public async previous() {
    if (this.state.queue.length === 0) return;

    // If more than 3 seconds in, restart track
    if (this.activeAudio.currentTime > 3) {
      this.seek(0);
      return;
    }

    let prevIndex = -1;
    if (this.state.currentTrackIndex > 0) {
      prevIndex = this.state.currentTrackIndex - 1;
    } else if (this.state.playbackMode === 'continuous' || this.state.repeatMode === 'all') {
      prevIndex = this.state.queue.length - 1;
    }

    if (prevIndex !== -1) {
      await this.transitionToTrackIndex(prevIndex);
    } else {
      this.seek(0);
    }
  }

  private handleTrackEnded() {
    if (this.state.playbackMode === 'repeat_one') {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  public seek(seconds: number) {
    if (!isNaN(seconds) && isFinite(seconds)) {
      this.activeAudio.currentTime = Math.max(0, Math.min(seconds, this.activeAudio.duration || 0));
      this.state.currentTime = this.activeAudio.currentTime;
      this.notifyListeners();
      this.updateMediaSessionPosition();
    }
  }

  public skipSeconds(seconds: number) {
    this.seek(this.activeAudio.currentTime + seconds);
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(vol, 1));
    this.audioA.volume = clamped;
    this.audioB.volume = clamped;
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;

    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }

    this.notifyListeners();
    dbService.setSetting('player_volume', clamped);
  }

  public toggleMute() {
    if (this.state.isMuted) {
      const vol = this.state.volume || 0.85;
      this.setVolume(vol);
      this.state.isMuted = false;
    } else {
      this.setVolume(0);
      this.state.isMuted = true;
    }
    this.notifyListeners();
  }

  public setPlaybackRate(rate: number) {
    this.audioA.playbackRate = rate;
    this.audioB.playbackRate = rate;
    this.state.playbackRate = rate;
    this.notifyListeners();
    this.updateMediaSessionPosition();
    dbService.setSetting('player_speed', rate);
  }

  /**
   * Set Playback Mode (Lineal, Suflé, Continuo, Repetir 1)
   */
  public setPlaybackMode(mode: PlaybackMode) {
    this.state.playbackMode = mode;
    this.state.isShuffle = mode === 'shuffle';
    this.state.repeatMode = mode === 'continuous' ? 'all' : mode === 'repeat_one' ? 'one' : 'off';

    const currentTrack = this.getCurrentTrack();

    if (mode === 'shuffle') {
      this.state.queue = this.shuffleArray([...this.originalQueueOrder]);
      if (currentTrack) {
        const newIdx = this.state.queue.findIndex((t) => t.id === currentTrack.id);
        if (newIdx !== -1) {
          const temp = this.state.queue[0];
          this.state.queue[0] = this.state.queue[newIdx];
          this.state.queue[newIdx] = temp;
          this.state.currentTrackIndex = 0;
        }
      }
    } else {
      this.state.queue = [...this.originalQueueOrder];
      if (currentTrack) {
        const originalIdx = this.state.queue.findIndex((t) => t.id === currentTrack.id);
        this.state.currentTrackIndex = originalIdx !== -1 ? originalIdx : 0;
      }
    }

    this.notifyListeners();
    dbService.setSetting('player_mode', mode);
  }

  public cyclePlaybackMode() {
    const modes: PlaybackMode[] = ['linear', 'shuffle', 'continuous', 'repeat_one'];
    const nextIdx = (modes.indexOf(this.state.playbackMode) + 1) % modes.length;
    this.setPlaybackMode(modes[nextIdx]);
  }

  public toggleShuffle() {
    if (this.state.playbackMode === 'shuffle') {
      this.setPlaybackMode('linear');
    } else {
      this.setPlaybackMode('shuffle');
    }
  }

  public cycleRepeatMode() {
    if (this.state.playbackMode === 'linear') {
      this.setPlaybackMode('continuous');
    } else if (this.state.playbackMode === 'continuous') {
      this.setPlaybackMode('repeat_one');
    } else {
      this.setPlaybackMode('linear');
    }
  }

  /**
   * Configure Crossfade (Crosfade)
   */
  public setCrossfade(enabled: boolean, durationSeconds?: number) {
    this.state.isCrossfadeEnabled = enabled;
    if (durationSeconds !== undefined) {
      this.state.crossfadeDuration = Math.max(1, Math.min(12, durationSeconds));
    }
    this.notifyListeners();
    dbService.setSetting('player_crossfade', enabled);
    if (durationSeconds !== undefined) {
      dbService.setSetting('player_crossfade_dur', this.state.crossfadeDuration);
    }
  }

  /**
   * Configure Desvanecimiento (Fade In / Fade Out)
   */
  public setFadeInOut(enabled: boolean, durationSeconds?: number) {
    this.state.isFadeInOutEnabled = enabled;
    if (durationSeconds !== undefined) {
      this.state.fadeInOutDuration = Math.max(0.1, Math.min(2.0, durationSeconds));
    }
    this.notifyListeners();
    dbService.setSetting('player_fade_in_out', enabled);
    if (durationSeconds !== undefined) {
      dbService.setSetting('player_fade_dur', this.state.fadeInOutDuration);
    }
  }

  public applyEQPreset(presetName: string) {
    this.state.eqPreset = presetName;
    this.notifyListeners();
    dbService.setSetting('player_eq', presetName);

    if (!this.bassFilter || !this.midFilter || !this.trebleFilter) return;

    switch (presetName) {
      case 'Bass Boost':
        this.bassFilter.gain.value = 6;
        this.midFilter.gain.value = 1;
        this.trebleFilter.gain.value = 2;
        break;
      case 'Vocal Clear':
        this.bassFilter.gain.value = -2;
        this.midFilter.gain.value = 5;
        this.trebleFilter.gain.value = 4;
        break;
      case 'Electronic / Dance':
        this.bassFilter.gain.value = 7;
        this.midFilter.gain.value = -1;
        this.trebleFilter.gain.value = 5;
        break;
      case 'Acoustic / Roadtrip':
        this.bassFilter.gain.value = 3;
        this.midFilter.gain.value = 2;
        this.trebleFilter.gain.value = 4;
        break;
      case 'Balanced':
      default:
        this.bassFilter.gain.value = 0;
        this.midFilter.gain.value = 0;
        this.trebleFilter.gain.value = 0;
        break;
    }
  }

  /**
   * Automatic Volume Normalization & Rebalancing (Auto-Leveling / Dynamics Compressor DSP)
   * Equalizes loudness across older tracks and modern loud masters for an even automotive sound level.
   */
  public setNormalization(enabled: boolean, preset?: 'balanced' | 'dynamic' | 'night') {
    this.state.isNormalizationEnabled = enabled;
    if (preset) {
      this.state.normalizationPreset = preset;
    }
    this.applyNormalizationSettings();
    this.notifyListeners();
    dbService.setSetting('player_norm_enabled', enabled);
    if (preset) {
      dbService.setSetting('player_norm_preset', preset);
    }
  }

  private applyNormalizationSettings() {
    if (!this.compressor || !this.normalizationGain || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    if (!this.state.isNormalizationEnabled) {
      // Bypass compression
      this.compressor.threshold.setValueAtTime(0, now);
      this.compressor.knee.setValueAtTime(0, now);
      this.compressor.ratio.setValueAtTime(1, now);
      this.compressor.attack.setValueAtTime(0.01, now);
      this.compressor.release.setValueAtTime(0.25, now);
      this.normalizationGain.gain.setValueAtTime(1.0, now);
      return;
    }

    switch (this.state.normalizationPreset) {
      case 'dynamic':
        // Gentle audiophile leveling (preserves large dynamic peaks while taming spikes)
        this.compressor.threshold.setValueAtTime(-18, now);
        this.compressor.knee.setValueAtTime(20, now);
        this.compressor.ratio.setValueAtTime(4, now);
        this.compressor.attack.setValueAtTime(0.005, now);
        this.compressor.release.setValueAtTime(0.25, now);
        this.normalizationGain.gain.setValueAtTime(1.15, now);
        break;

      case 'night':
        // Aggressive night/highway compression (brings up quiet whisper sections and limits loud thumps)
        this.compressor.threshold.setValueAtTime(-30, now);
        this.compressor.knee.setValueAtTime(40, now);
        this.compressor.ratio.setValueAtTime(16, now);
        this.compressor.attack.setValueAtTime(0.002, now);
        this.compressor.release.setValueAtTime(0.18, now);
        this.normalizationGain.gain.setValueAtTime(1.45, now);
        break;

      case 'balanced':
      default:
        // Standard Automotive Broadcast Normalization (optimal for car audio & mixed genres)
        this.compressor.threshold.setValueAtTime(-24, now);
        this.compressor.knee.setValueAtTime(30, now);
        this.compressor.ratio.setValueAtTime(10, now);
        this.compressor.attack.setValueAtTime(0.003, now);
        this.compressor.release.setValueAtTime(0.22, now);
        this.normalizationGain.gain.setValueAtTime(1.3, now);
        break;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  public async setBufferAheadCount(count: number) {
    this.state.bufferAheadCount = Math.max(1, Math.min(count, 5));
    this.notifyListeners();
    await dbService.setSetting('player_buffer_ahead', this.state.bufferAheadCount);
    this.prefetchUpcomingTracks().catch(() => {});
  }

  public async prefetchUpcomingTracks() {
    if (this.state.queue.length === 0) return;
    const count = this.state.bufferAheadCount || 3;
    const currentIdx = this.state.currentTrackIndex;
    const tracksToPrefetch: AudioTrack[] = [];

    for (let i = 1; i <= count; i++) {
      const nextIdx = (currentIdx + i) % this.state.queue.length;
      const track = this.state.queue[nextIdx];
      if (track && (track.cloudFileId || track.driveFileId)) {
        tracksToPrefetch.push(track);
      }
    }

    if (tracksToPrefetch.length === 0) return;

    this.state.isPreloading = true;
    this.notifyListeners();

    const loadedIds: string[] = [...(this.state.preloadedTrackIds || [])];

    for (const track of tracksToPrefetch) {
      try {
        const ok = await cloudService.prefetchTrack(track);
        if (ok && !loadedIds.includes(track.id)) {
          loadedIds.push(track.id);
        }
      } catch {
        // Non-blocking prefetch
      }
    }

    this.state.preloadedTrackIds = loadedIds;
    this.state.isPreloading = false;
    this.notifyListeners();
  }

  public async clearBufferCache() {
    await dbService.clearAudioBlobCache();
    this.state.preloadedTrackIds = [];
    this.notifyListeners();
    this.prefetchUpcomingTracks().catch(() => {});
  }

  public persistCurrentSessionState() {
    if (this.state.queue.length > 0) {
      teslaKeepAlive.saveSession({
        queue: this.state.queue,
        currentTrackIndex: this.state.currentTrackIndex,
        currentTime: this.state.currentTime,
        isPlaying: this.state.isPlaying,
        playbackMode: this.state.playbackMode,
        playbackScope: this.state.playbackScope,
        volume: this.state.volume,
        eqPreset: this.state.eqPreset
      });
    }
  }

  public getState(): PlayerState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }
}

export const audioEngine = new AudioEngine();
