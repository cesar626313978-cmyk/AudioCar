/**
 * Dropbox Cloud Music Provider
 * Integrates Dropbox API v2 with OAuth 2.0 PKCE authentication,
 * recursive folder exploration under /mimusica, and high-speed audio streaming with /2/files/get_temporary_link.
 */

import { AudioTrack, DriveFolder, ImageFormat, CloudMusicProvider, CloudUserSession } from '../../types';
import { dbService } from '../dbService';
import { sanitizeAudioMimeType, DriveService } from '../driveService';
import { generateCodeVerifier, generateCodeChallenge, generateRandomState } from '../pkce';

const STORAGE_KEY = 'audiocar_dropbox_session';
const APP_KEY_STORAGE = 'audiocar_dropbox_app_key';

// Default Dropbox App Key for browser SPA (configurable by user)
const DEFAULT_APP_KEY = '7m9qf92kd43l9p2';
const DROPBOX_API_ROOT = 'https://api.dropboxapi.com/2';

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'flac', 'm4a', 'wav', 'ogg', 'aac', 'opus', 'wma',
  'alac', 'aiff', 'aif', 'm4b', 'm4p', 'webm'
]);

export class DropboxProvider implements CloudMusicProvider {
  public providerId = 'dropbox' as const;
  public name = 'Dropbox';
  public iconName = 'dropbox';

  private currentSession: CloudUserSession | null = null;
  private blobCache: Map<string, string> = new Map();
  private temporaryLinkCache: Map<string, { url: string; expiresAt: number }> = new Map();
  private folderArtworkCache: Map<string, { url: string; format: ImageFormat }> = new Map();

  constructor() {
    this.loadPersistedSession();
  }

  private loadPersistedSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored) as CloudUserSession;
        if (session.expiresAt && session.expiresAt > Date.now()) {
          this.currentSession = session;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          this.currentSession = null;
        }
      }
    } catch (e) {
      console.warn('Could not parse Dropbox session:', e);
    }
  }

  public getAppKey(): string {
    return localStorage.getItem(APP_KEY_STORAGE) || DEFAULT_APP_KEY;
  }

  public setAppKey(key: string) {
    if (key.trim()) {
      localStorage.setItem(APP_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(APP_KEY_STORAGE);
    }
  }

  public isConfigured(): boolean {
    return !!this.currentSession && this.currentSession.expiresAt > Date.now();
  }

  public getSession(): CloudUserSession | null {
    if (this.currentSession && this.currentSession.expiresAt > Date.now()) {
      return this.currentSession;
    }
    return null;
  }

  private getAccessToken(): string | null {
    const session = this.getSession();
    return session ? session.accessToken : null;
  }

  private getHeaders(): HeadersInit {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No hay sesión activa de Dropbox.');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * OAuth 2.0 PKCE Login Flow for Dropbox
   */
  public async login(): Promise<CloudUserSession> {
    const appKey = this.getAppKey();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateRandomState();
    const redirectUri = window.location.origin;

    sessionStorage.setItem('dropbox_pkce_verifier', verifier);
    sessionStorage.setItem('dropbox_auth_state', state);

    const scopes = ['files.metadata.read', 'files.content.read', 'account_info.read'].join(' ');
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(
      appKey
    )}&response_type=code&code_challenge=${encodeURIComponent(
      challenge
    )}&code_challenge_method=S256&token_access_type=offline&scope=${encodeURIComponent(
      scopes
    )}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return new Promise<CloudUserSession>((resolve, reject) => {
      const popupWidth = 600;
      const popupHeight = 700;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      const popup = window.open(
        authUrl,
        'dropbox_oauth_popup',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      );

      if (!popup) {
        reject(new Error('El navegador ha bloqueado la ventana emergente de Dropbox. Permite los pop-ups en tu navegador.'));
        return;
      }

      let interval: NodeJS.Timeout;

      const cleanup = () => {
        clearInterval(interval);
        window.removeEventListener('message', messageHandler);
      };

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'DROPBOX_AUTH_CODE' && event.data.code) {
          cleanup();
          popup.close();
          try {
            const session = await this.exchangeCodeForToken(event.data.code, verifier, redirectUri);
            resolve(session);
          } catch (err) {
            reject(err);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      interval = setInterval(async () => {
        if (popup.closed) {
          cleanup();
          reject(new Error('Inicio de sesión cancelado o ventana cerrada.'));
          return;
        }

        try {
          const href = popup.location.href;
          if (href && href.startsWith(redirectUri)) {
            const url = new URL(href);
            const code = url.searchParams.get('code');
            const err = url.searchParams.get('error_description') || url.searchParams.get('error');

            cleanup();
            popup.close();

            if (err) {
              reject(new Error(`Error de Dropbox: ${err}`));
              return;
            }

            if (code) {
              const session = await this.exchangeCodeForToken(code, verifier, redirectUri);
              resolve(session);
            } else {
              reject(new Error('No se recibió el código de autorización de Dropbox.'));
            }
          }
        } catch {
          // Cross-origin safety while on dropbox.com
        }
      }, 600);
    });
  }

  private async exchangeCodeForToken(code: string, verifier: string, redirectUri: string): Promise<CloudUserSession> {
    const appKey = this.getAppKey();
    const tokenUrl = 'https://api.dropboxapi.com/oauth2/token';

    const bodyParams = new URLSearchParams({
      code: code,
      grant_type: 'authorization_code',
      client_id: appKey,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error_description || errData.error || 'Error al canjear el token de Dropbox.');
    }

    const data = await res.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 14400; // Dropbox standard is 4h

    // Fetch user account info
    const account = await this.fetchAccountInfo(accessToken);

    const session: CloudUserSession = {
      provider: 'dropbox',
      email: account.email || 'usuario@dropbox.com',
      name: account.name?.display_name || 'Usuario Dropbox',
      picture: account.profile_photo_url || '',
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000 - 60000
    };

    this.currentSession = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  private async fetchAccountInfo(accessToken: string): Promise<any> {
    try {
      const res = await fetch(`${DROPBOX_API_ROOT}/users/get_current_account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: 'null'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch Dropbox account info:', e);
    }
    return {};
  }

  public setDirectSession(accessToken: string, email = 'usuario@dropbox.com', name = 'Usuario Dropbox'): CloudUserSession {
    const session: CloudUserSession = {
      provider: 'dropbox',
      email,
      name,
      accessToken,
      expiresAt: Date.now() + 24 * 3600 * 1000,
      isManual: true
    };
    this.currentSession = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  public async logout(): Promise<void> {
    this.currentSession = null;
    localStorage.removeItem(STORAGE_KEY);
    this.blobCache.clear();
    this.temporaryLinkCache.clear();
    this.folderArtworkCache.clear();
  }

  /**
   * Explores folder structure under /mimusica in Dropbox
   */
  public async listFolders(_parentId?: string): Promise<DriveFolder[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    try {
      const folders: DriveFolder[] = [];
      const res = await fetch(`${DROPBOX_API_ROOT}/files/list_folder`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          path: '/mimusica',
          recursive: true
        })
      });

      if (!res.ok) {
        // If /mimusica not found, fallback to root folder list
        return this.listRootFolders();
      }

      const data = await res.json();
      const entries = data.entries || [];

      for (const entry of entries) {
        if (entry['.tag'] === 'folder') {
          folders.push({
            id: entry.id,
            name: entry.name,
            parentId: 'root',
            path: entry.path_display || `/${entry.name}`
          });
        }
      }

      await dbService.saveFolders(folders).catch(() => {});
      return folders;
    } catch (e) {
      console.warn('Dropbox listFolders error:', e);
      return [];
    }
  }

  private async listRootFolders(): Promise<DriveFolder[]> {
    try {
      const res = await fetch(`${DROPBOX_API_ROOT}/files/list_folder`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          path: '',
          recursive: false
        })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.entries || [])
        .filter((e: any) => e['.tag'] === 'folder')
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          parentId: 'root',
          path: e.path_display || `/${e.name}`
        }));
    } catch {
      return [];
    }
  }

  /**
   * Discovers and lists all audio tracks in Dropbox /mimusica
   */
  public async listTracks(_folderPath?: string): Promise<AudioTrack[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Usuario no autenticado en Dropbox');

    const driveHelper = new DriveService();
    const tracks: AudioTrack[] = [];

    try {
      let targetPath = '/mimusica';
      let res = await fetch(`${DROPBOX_API_ROOT}/files/list_folder`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          path: targetPath,
          recursive: true,
          include_media_info: true
        })
      });

      if (!res.ok) {
        // Fallback to root path if /mimusica does not exist
        targetPath = '';
        res = await fetch(`${DROPBOX_API_ROOT}/files/list_folder`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            path: targetPath,
            recursive: true,
            include_media_info: true
          })
        });
      }

      if (!res.ok) return [];

      let data = await res.json();
      let entries: any[] = data.entries || [];
      let hasMore = data.has_more;
      let cursor = data.cursor;

      // Handle pagination
      while (hasMore && cursor) {
        const contRes = await fetch(`${DROPBOX_API_ROOT}/files/list_folder/continue`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ cursor })
        });
        if (!contRes.ok) break;

        const contData = await contRes.json();
        entries.push(...(contData.entries || []));
        hasMore = contData.has_more;
        cursor = contData.cursor;
      }

      // Filter and map audio files
      for (const entry of entries) {
        if (entry['.tag'] !== 'file') continue;

        const name = (entry.name || '').toLowerCase();
        const ext = name.split('.').pop() || '';
        if (!AUDIO_EXTENSIONS.has(ext)) continue;

        const parsed = driveHelper.parseAudioFilename(entry.name);
        const pathParts = (entry.path_display || '').split('/');
        const parentFolder = pathParts.length > 2 ? pathParts[pathParts.length - 2] : 'mimusica';
        const albumName = parentFolder !== 'mimusica' ? parentFolder : (parsed.album || 'Dropbox Music');

        const duration = entry.media_info?.metadata?.duration ? Math.round(entry.media_info.metadata.duration / 1000) : 0;
        const safeMime = sanitizeAudioMimeType(undefined, entry.name);

        const track: AudioTrack = {
          id: `dropbox_${entry.id}`,
          cloudFileId: entry.id,
          cloudPath: entry.path_lower || entry.path_display,
          driveFileId: entry.id,
          name: entry.name,
          title: parsed.title,
          artist: parsed.artist,
          album: albumName,
          duration,
          size: entry.size || 0,
          mimeType: safeMime,
          thumbnailUrl: '',
          artworkFormat: 'JPG',
          streamUrl: '',
          folderId: parentFolder,
          folderPath: entry.path_display || `/${entry.name}`,
          source: 'dropbox',
          addedAt: new Date(entry.server_modified || Date.now()).getTime()
        };

        tracks.push(track);
      }

      if (tracks.length > 0) {
        await dbService.saveTracks(tracks).catch(() => {});
      }

      return tracks;
    } catch (err) {
      console.error('Dropbox listTracks error:', err);
      return [];
    }
  }

  /**
   * Generates a high-speed streaming direct link for Dropbox tracks using /2/files/get_temporary_link
   * Returns a direct CDN URL that supports HTTP Range requests for seamless seeking.
   */
  public async getStreamUrl(track: AudioTrack): Promise<string> {
    const fileId = track.cloudFileId || track.driveFileId || track.id;
    const path = track.cloudPath || track.folderPath || fileId;

    // 1. Check RAM cache
    if (this.blobCache.has(fileId)) {
      return this.blobCache.get(fileId)!;
    }

    // 2. Check temporary link cache (valid for 4 hours)
    const cachedLink = this.temporaryLinkCache.get(fileId);
    if (cachedLink && cachedLink.expiresAt > Date.now()) {
      return cachedLink.url;
    }

    // 3. Check IndexedDB cache
    try {
      const cachedBlob = await dbService.getAudioBlob(fileId);
      if (cachedBlob) {
        const blobUrl = URL.createObjectURL(new Blob([cachedBlob], { type: track.mimeType || 'audio/mpeg' }));
        this.blobCache.set(fileId, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('IndexedDB read warning:', e);
    }

    // 4. Request temporary link from Dropbox API
    const token = this.getAccessToken();
    if (!token) throw new Error('Sesión de Dropbox expirada.');

    try {
      const res = await fetch(`${DROPBOX_API_ROOT}/files/get_temporary_link`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ path })
      });

      if (!res.ok) {
        throw new Error(`Error en Dropbox API: HTTP ${res.status}`);
      }

      const data = await res.json();
      const directLink = data.link;

      if (directLink) {
        // Cache link for 3.5 hours (Dropbox links last 4h)
        this.temporaryLinkCache.set(fileId, {
          url: directLink,
          expiresAt: Date.now() + 3.5 * 3600 * 1000
        });
        return directLink;
      }
    } catch (err) {
      console.error('Error fetching Dropbox temporary streaming link:', err);
    }

    return track.streamUrl || '';
  }

  public async prefetchStream(track: AudioTrack): Promise<boolean> {
    const fileId = track.cloudFileId || track.driveFileId || track.id;
    if (!fileId) return false;

    if (this.blobCache.has(fileId)) return true;

    try {
      const hasInDb = await dbService.hasAudioBlob(fileId);
      if (hasInDb) return true;

      const url = await this.getStreamUrl(track);
      if (!url) return false;

      const res = await fetch(url);
      if (!res.ok) return false;

      const blob = await res.blob();
      const audioBlob = new Blob([blob], { type: track.mimeType || 'audio/mpeg' });
      await dbService.saveAudioBlob(fileId, audioBlob);
      return true;
    } catch {
      return false;
    }
  }
}

export const dropboxProvider = new DropboxProvider();
