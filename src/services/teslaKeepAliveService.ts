/**
 * In-Car Keep-Alive & Auto-Refresh Resilience Engine
 * Prevents in-car browser freezing, audio subsystem throttling, and autoplay dropouts.
 * 
 * Features:
 * 1. Screen Wake Lock API (keeps CPU & screen from sleeping).
 * 2. Inaudible WebAudio keep-alive pulse (prevents audio pipeline suspension).
 * 3. Continuous local state persistence (queue, position, volume, mode).
 * 4. Periodic auto-refresh (e.g., every 5 minutes) with seamless playback restoration from cache.
 * 5. Audio stall watchdog (detects if audio currentTime freezes for >6s and auto-recovers).
 */

import { AudioTrack, PlaybackMode, PlaybackScope } from '../types';
import { dbService } from './dbService';
import { preferencesService } from './preferencesService';

export interface InCarPersistedSession {
  queue: AudioTrack[];
  currentTrackIndex: number;
  currentTime: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  playbackScope: PlaybackScope;
  volume: number;
  eqPreset: string;
  timestamp: number;
}

export type KeepAliveListener = (status: {
  wakeLockActive: boolean;
  autoRefreshMinutes: number;
  nextRefreshInSeconds: number;
  autoRecoveryEnabled: boolean;
}) => void;

const SESSION_STORAGE_KEY = 'incar_playback_session';
const AUTO_REFRESH_KEY = 'incar_auto_refresh_interval';
const AUTO_RECOVERY_KEY = 'incar_auto_recovery_enabled';

class InCarKeepAliveService {
  private wakeLockSentinel: any = null;
  private wakeLockActive: boolean = false;
  private autoRefreshMinutes: number = 5; // Default: 5 minutes as requested
  private autoRecoveryEnabled: boolean = true;
  private nextRefreshInSeconds: number = 300;
  
  private listeners: Set<KeepAliveListener> = new Set();
  private timerInterval: any = null;
  private watchdogInterval: any = null;
  private silentAudioContext: AudioContext | null = null;
  private silentSource: AudioBufferSourceNode | null = null;
  private lastKnownCurrentTime: number = 0;
  private stalledCounter: number = 0;
  private isRefreshing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSettings();
      this.setupWakeLock();
      this.startWatchdog();
      this.startTimerLoop();
    }
  }

  private async initSettings() {
    try {
      const savedInterval = await dbService.getSetting<number>(AUTO_REFRESH_KEY, 5);
      const savedRecovery = await dbService.getSetting<boolean>(AUTO_RECOVERY_KEY, true);
      this.autoRefreshMinutes = savedInterval;
      this.autoRecoveryEnabled = savedRecovery;
      this.nextRefreshInSeconds = savedInterval > 0 ? savedInterval * 60 : 0;
      this.notifyListeners();
    } catch {
      // Use defaults
    }
  }

  /**
   * Screen Wake Lock API Management
   */
  public async setupWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockActive = true;
      this.notifyListeners();

      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockActive = false;
        this.notifyListeners();
      });
    } catch (e) {
      console.warn('Wake Lock request notice:', e);
      this.wakeLockActive = false;
    }

    // Auto-reacquire when returning to tab / refocusing browser
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && !this.wakeLockActive) {
        try {
          if ('wakeLock' in navigator) {
            this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
            this.wakeLockActive = true;
            this.notifyListeners();
          }
        } catch {
          // Non-blocking
        }
      }
    });
  }

  /**
   * Start inaudible silent heartbeat to keep audio subsystem awake
   */
  public startSilentAudioCarrier() {
    if (this.silentAudioContext) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.silentAudioContext = new AudioCtx();
      // 1 second silent buffer
      const buffer = this.silentAudioContext.createBuffer(1, this.silentAudioContext.sampleRate, this.silentAudioContext.sampleRate);
      const source = this.silentAudioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.silentAudioContext.createGain();
      gain.gain.value = 0.00001; // Inaudible

      source.connect(gain);
      gain.connect(this.silentAudioContext.destination);
      source.start();
      this.silentSource = source;
    } catch (e) {
      console.warn('Silent audio carrier notice:', e);
    }
  }

  /**
   * Continuous session save
   */
  public saveSession(session: Omit<InCarPersistedSession, 'timestamp'>) {
    if (this.isRefreshing) return;
    try {
      const fullSession: InCarPersistedSession = {
        ...session,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fullSession));
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fullSession));
    } catch {
      // Storage quota or disabled
    }
  }

  /**
   * Retrieve saved session for instantaneous recovery
   */
  public getSavedSession(): InCarPersistedSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as InCarPersistedSession;
      // Allow recovery if session was saved within the last 4 hours
      if (Date.now() - parsed.timestamp < 1000 * 60 * 60 * 4) {
        return parsed;
      }
    } catch {
      // Invalid JSON
    }
    return null;
  }

  public clearSavedSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  public async loadUserPreferences(userEmail?: string) {
    try {
      const prefs = await preferencesService.loadPreferencesForUser(userEmail);
      const minutes = typeof prefs.autoRefreshMinutes === 'number' ? prefs.autoRefreshMinutes : 5;
      this.autoRefreshMinutes = minutes;
      this.nextRefreshInSeconds = minutes > 0 ? minutes * 60 : 0;
      this.notifyListeners();
    } catch {
      // Use fallback
    }
  }

  /**
   * Set Auto-Refresh Interval in Minutes (0 = Disabled, 3, 5, 10, 15)
   */
  public async setAutoRefreshInterval(minutes: number) {
    this.autoRefreshMinutes = Math.max(0, minutes);
    this.nextRefreshInSeconds = minutes > 0 ? minutes * 60 : 0;
    await dbService.setSetting(AUTO_REFRESH_KEY, this.autoRefreshMinutes);
    preferencesService.updateCurrentPreference('autoRefreshMinutes', this.autoRefreshMinutes);
    this.notifyListeners();
  }

  public async setAutoRecoveryEnabled(enabled: boolean) {
    this.autoRecoveryEnabled = enabled;
    await dbService.setSetting(AUTO_RECOVERY_KEY, enabled);
    this.notifyListeners();
  }

  /**
   * Triggers a seamless refresh while keeping playback state
   */
  public triggerSeamlessRefresh(audioEngineState?: any) {
    if (typeof window === 'undefined' || this.isRefreshing) return;
    this.isRefreshing = true;

    if (audioEngineState) {
      this.saveSession({
        queue: audioEngineState.queue || [],
        currentTrackIndex: audioEngineState.currentTrackIndex || 0,
        currentTime: (audioEngineState.currentTime || 0) + 0.5,
        isPlaying: audioEngineState.isPlaying || false,
        playbackMode: audioEngineState.playbackMode || 'linear',
        playbackScope: audioEngineState.playbackScope || 'all_folders',
        volume: audioEngineState.volume !== undefined ? audioEngineState.volume : 0.85,
        eqPreset: audioEngineState.eqPreset || 'Balanced'
      });
    }

    // Gentle page reload to clean memory and clear browser timer throttling
    window.location.reload();
  }

  private startTimerLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.autoRefreshMinutes <= 0) return;

      if (this.nextRefreshInSeconds > 0) {
        this.nextRefreshInSeconds--;
        this.notifyListeners();
      } else {
        // Time to auto-refresh
        this.nextRefreshInSeconds = this.autoRefreshMinutes * 60;
        // Import and execute via global or event
        const event = new CustomEvent('incar-auto-refresh-triggered');
        window.dispatchEvent(event);
      }
    }, 1000);
  }

  /**
   * Stall Watchdog: Monitors if playback stops advancing while isPlaying is active
   */
  private startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    this.watchdogInterval = setInterval(() => {
      const event = new CustomEvent('incar-watchdog-check');
      window.dispatchEvent(event);
    }, 4000);
  }

  public checkPlaybackHealth(isPlaying: boolean, currentTime: number, isLoading: boolean): boolean {
    if (!isPlaying || isLoading) {
      this.stalledCounter = 0;
      this.lastKnownCurrentTime = currentTime;
      return true;
    }

    if (Math.abs(currentTime - this.lastKnownCurrentTime) < 0.1) {
      this.stalledCounter++;
      if (this.stalledCounter >= 3) {
        // Stalled for > 8-12 seconds
        this.stalledCounter = 0;
        return false; // Indicates stall detected!
      }
    } else {
      this.stalledCounter = 0;
      this.lastKnownCurrentTime = currentTime;
    }

    return true;
  }

  public getStatus() {
    return {
      wakeLockActive: this.wakeLockActive,
      autoRefreshMinutes: this.autoRefreshMinutes,
      nextRefreshInSeconds: this.nextRefreshInSeconds,
      autoRecoveryEnabled: this.autoRecoveryEnabled
    };
  }

  public subscribe(listener: KeepAliveListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const s = this.getStatus();
    this.listeners.forEach((l) => l(s));
  }
}

export const inCarKeepAlive = new InCarKeepAliveService();
// Backward compatibility alias for any unrefactored references
export const teslaKeepAlive = inCarKeepAlive;
export type TeslaPersistedSession = InCarPersistedSession;
