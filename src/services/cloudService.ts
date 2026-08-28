/**
 * Unified Cloud Service Manager - AudioCar
 * Manages Multi-Cloud Providers (Google Drive, Microsoft OneDrive, Dropbox, Demo Mode).
 * Agnostic audio routing, folder traversal, session persistence and synchronization.
 */

import { AudioTrack, DriveFolder, CloudMusicProvider, CloudProviderType, CloudUserSession } from '../types';
import { googleDriveProvider } from './providers/GoogleDriveProvider';
import { oneDriveProvider } from './providers/OneDriveProvider';
import { dropboxProvider } from './providers/DropboxProvider';
import { demoProvider } from './providers/DemoProvider';
import { dbService } from './dbService';

const ACTIVE_PROVIDER_KEY = 'audiocar_active_cloud_provider';

type CloudListener = (activeProvider: CloudMusicProvider) => void;

class CloudService {
  private providers: Map<CloudProviderType, CloudMusicProvider> = new Map();
  private activeProviderId: CloudProviderType = 'drive';
  private listeners: Set<CloudListener> = new Set();

  constructor() {
    this.providers.set('drive', googleDriveProvider);
    this.providers.set('onedrive', oneDriveProvider);
    this.providers.set('dropbox', dropboxProvider);
    this.providers.set('demo', demoProvider);

    this.loadActiveProvider();
  }

  private loadActiveProvider() {
    try {
      const saved = localStorage.getItem(ACTIVE_PROVIDER_KEY) as CloudProviderType | null;
      if (saved && this.providers.has(saved)) {
        this.activeProviderId = saved;
      } else {
        // Auto-select first configured provider
        if (googleDriveProvider.isConfigured()) {
          this.activeProviderId = 'drive';
        } else if (oneDriveProvider.isConfigured()) {
          this.activeProviderId = 'onedrive';
        } else if (dropboxProvider.isConfigured()) {
          this.activeProviderId = 'dropbox';
        } else {
          this.activeProviderId = 'drive';
        }
      }
    } catch {
      this.activeProviderId = 'drive';
    }
  }

  public getActiveProviderId(): CloudProviderType {
    return this.activeProviderId;
  }

  public getActiveProvider(): CloudMusicProvider {
    return this.providers.get(this.activeProviderId) || googleDriveProvider;
  }

  public getProvider(id: CloudProviderType): CloudMusicProvider {
    return this.providers.get(id) || googleDriveProvider;
  }

  public setActiveProvider(id: CloudProviderType) {
    if (!this.providers.has(id)) return;
    this.activeProviderId = id;
    localStorage.setItem(ACTIVE_PROVIDER_KEY, id);
    this.notifyListeners();
  }

  public getAllSessions(): Record<CloudProviderType, CloudUserSession | null> {
    return {
      drive: googleDriveProvider.getSession(),
      onedrive: oneDriveProvider.getSession(),
      dropbox: dropboxProvider.getSession(),
      demo: demoProvider.getSession()
    };
  }

  public async syncLibrary(targetProviderId?: CloudProviderType): Promise<{ tracks: AudioTrack[]; folders: DriveFolder[] }> {
    const provider = targetProviderId ? this.getProvider(targetProviderId) : this.getActiveProvider();
    
    if (!provider.isConfigured() && provider.providerId !== 'demo') {
      return { tracks: [], folders: [] };
    }

    const [tracks, folders] = await Promise.all([
      provider.listTracks(),
      provider.listFolders()
    ]);

    if (tracks.length > 0) {
      await dbService.saveTracks(tracks).catch(() => {});
    }
    if (folders.length > 0) {
      await dbService.saveFolders(folders).catch(() => {});
    }

    return { tracks, folders };
  }

  /**
   * Agnostic streaming resolver
   * Dispatches to the corresponding cloud provider based on track source
   */
  public async getStreamUrl(track: AudioTrack): Promise<string> {
    if (track.cachedBlobUrl) {
      return track.cachedBlobUrl;
    }

    switch (track.source) {
      case 'onedrive':
        return await oneDriveProvider.getStreamUrl(track);
      case 'dropbox':
        return await dropboxProvider.getStreamUrl(track);
      case 'drive':
        return await googleDriveProvider.getStreamUrl(track);
      case 'demo':
        return await demoProvider.getStreamUrl(track);
      case 'local':
      default:
        return track.streamUrl || '';
    }
  }

  public async prefetchTrack(track: AudioTrack): Promise<boolean> {
    switch (track.source) {
      case 'onedrive':
        return await oneDriveProvider.prefetchStream(track);
      case 'dropbox':
        return await dropboxProvider.prefetchStream(track);
      case 'drive':
        return await googleDriveProvider.prefetchStream(track);
      default:
        return true;
    }
  }

  public async logoutProvider(id: CloudProviderType): Promise<void> {
    const provider = this.getProvider(id);
    await provider.logout();

    // If currently active provider was logged out, switch to another connected provider or drive
    if (this.activeProviderId === id) {
      const remainingSessions = this.getAllSessions();
      if (remainingSessions.drive) {
        this.setActiveProvider('drive');
      } else if (remainingSessions.onedrive) {
        this.setActiveProvider('onedrive');
      } else if (remainingSessions.dropbox) {
        this.setActiveProvider('dropbox');
      } else {
        this.setActiveProvider('drive');
      }
    } else {
      this.notifyListeners();
    }
  }

  public subscribe(listener: CloudListener): () => void {
    this.listeners.add(listener);
    listener(this.getActiveProvider());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const active = this.getActiveProvider();
    this.listeners.forEach((fn) => fn(active));
  }
}

export const cloudService = new CloudService();
