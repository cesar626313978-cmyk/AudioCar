/**
 * User Preferences Management Service - AudioCar
 * Saves, loads, and applies audio, DSP, and app configuration per Gmail/Google Account.
 * Each user retains their own playback modes, crossfade, EQ, normalization, buffer, theme, etc.
 */

import { UserPreferences, PlaybackMode, PlaybackScope } from '../types';
import { dbService } from './dbService';
import { authService } from './authService';

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'email'> = {
  playbackMode: 'linear',
  playbackScope: 'all_folders',
  volume: 0.85,
  playbackRate: 1.0,
  eqPreset: 'Balanced',
  isCrossfadeEnabled: false,
  crossfadeDuration: 4,
  isFadeInOutEnabled: true,
  fadeInOutDuration: 3,
  isNormalizationEnabled: true,
  normalizationPreset: 'balanced',
  bufferAheadCount: 3,
  theme: 'dark',
  hideDemoTracks: false,
  lastUpdated: Date.now()
};

const STORAGE_PREFIX = 'audiocar_user_prefs_';
type PreferencesListener = (prefs: UserPreferences) => void;

class PreferencesService {
  private currentPreferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    email: 'default'
  };
  private listeners: Set<PreferencesListener> = new Set();
  private isApplying: boolean = false;

  constructor() {
    // Initial load
    const user = authService.getUser();
    const initialEmail = user?.email || 'default';
    this.currentPreferences.email = initialEmail;
    this.loadPreferencesForUser(initialEmail).catch(() => {});
  }

  public getActiveEmail(): string {
    const user = authService.getUser();
    return user?.email ? user.email.toLowerCase().trim() : 'default';
  }

  private getStorageKey(email: string): string {
    const sanitized = email.toLowerCase().trim() || 'default';
    return `${STORAGE_PREFIX}${sanitized}`;
  }

  /**
   * Loads the saved preferences for a given user email from IndexedDB and localStorage.
   */
  public async loadPreferencesForUser(userEmail?: string): Promise<UserPreferences> {
    const email = (userEmail || this.getActiveEmail()).toLowerCase().trim();
    const storageKey = this.getStorageKey(email);

    let savedPrefs: Partial<UserPreferences> | null = null;

    // 1. Try IndexedDB
    try {
      savedPrefs = await dbService.getSetting<UserPreferences | null>(storageKey, null);
    } catch (e) {
      console.warn('Could not read user preferences from IndexedDB:', e);
    }

    // 2. Fallback to localStorage
    if (!savedPrefs) {
      try {
        const local = localStorage.getItem(storageKey);
        if (local) {
          savedPrefs = JSON.parse(local);
        }
      } catch (e) {
        console.warn('Could not read user preferences from localStorage:', e);
      }
    }

    // 3. Fallback to global legacy settings if default or first-time user
    if (!savedPrefs) {
      savedPrefs = await this.readLegacyGlobalSettings();
    }

    const merged: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(savedPrefs || {}),
      email,
      lastUpdated: savedPrefs?.lastUpdated || Date.now()
    };

    this.currentPreferences = merged;
    this.notifyListeners();
    return merged;
  }

  private async readLegacyGlobalSettings(): Promise<Partial<UserPreferences>> {
    try {
      const [
        volume,
        mode,
        scope,
        speed,
        eq,
        crossfade,
        crossfadeDur,
        fadeInOut,
        fadeDur,
        normEnabled,
        normPreset,
        bufferCount,
        hideDemo
      ] = await Promise.all([
        dbService.getSetting<number>('player_volume', 0.85),
        dbService.getSetting<PlaybackMode>('player_mode', 'linear'),
        dbService.getSetting<PlaybackScope>('player_scope', 'all_folders'),
        dbService.getSetting<number>('player_speed', 1.0),
        dbService.getSetting<string>('player_eq', 'Balanced'),
        dbService.getSetting<boolean>('player_crossfade', false),
        dbService.getSetting<number>('player_crossfade_dur', 4),
        dbService.getSetting<boolean>('player_fade_in_out', true),
        dbService.getSetting<number>('player_fade_dur', 3),
        dbService.getSetting<boolean>('player_norm_enabled', true),
        dbService.getSetting<'balanced' | 'dynamic' | 'night'>('player_norm_preset', 'balanced'),
        dbService.getSetting<number>('player_buffer_ahead', 3),
        dbService.isDemoTracksHidden()
      ]);

      const theme = (localStorage.getItem('audiocar_theme') as 'dark' | 'light') || 'dark';

      return {
        volume,
        playbackMode: mode,
        playbackScope: scope,
        playbackRate: speed,
        eqPreset: eq,
        isCrossfadeEnabled: crossfade,
        crossfadeDuration: crossfadeDur,
        isFadeInOutEnabled: fadeInOut,
        fadeInOutDuration: fadeDur,
        isNormalizationEnabled: normEnabled,
        normalizationPreset: normPreset,
        bufferAheadCount: bufferCount,
        theme,
        hideDemoTracks: hideDemo
      };
    } catch {
      return {};
    }
  }

  /**
   * Saves updated preferences for a given user (or active user).
   */
  public async savePreferences(
    partial: Partial<UserPreferences>,
    targetEmail?: string
  ): Promise<UserPreferences> {
    const email = (targetEmail || this.getActiveEmail()).toLowerCase().trim();
    const storageKey = this.getStorageKey(email);

    const updated: UserPreferences = {
      ...this.currentPreferences,
      ...partial,
      email,
      lastUpdated: Date.now()
    };

    this.currentPreferences = updated;

    // 1. Save to IndexedDB
    try {
      await dbService.setSetting(storageKey, updated);
    } catch (e) {
      console.warn('Could not save user preferences to IndexedDB:', e);
    }

    // 2. Save to localStorage for quick bootstrap
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save user preferences to localStorage:', e);
    }

    this.notifyListeners();
    return updated;
  }

  /**
   * Updates a single preference key for the currently active user.
   */
  public async updateCurrentPreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    if (this.isApplying) return;
    await this.savePreferences({ [key]: value });
  }

  /**
   * Resets preferences for the active user back to recommended car audio defaults.
   */
  public async resetToDefaults(targetEmail?: string): Promise<UserPreferences> {
    const email = (targetEmail || this.getActiveEmail()).toLowerCase().trim();
    return await this.savePreferences(
      {
        ...DEFAULT_PREFERENCES,
        email,
        lastUpdated: Date.now()
      },
      email
    );
  }

  public getCurrentPreferences(): UserPreferences {
    return { ...this.currentPreferences };
  }

  public subscribe(listener: PreferencesListener): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentPreferences());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const prefs = this.getCurrentPreferences();
    this.listeners.forEach((l) => l(prefs));
  }

  public setApplying(applying: boolean) {
    this.isApplying = applying;
  }
}

export const preferencesService = new PreferencesService();
