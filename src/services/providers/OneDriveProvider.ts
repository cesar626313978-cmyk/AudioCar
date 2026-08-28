/**
 * Microsoft OneDrive / Microsoft 365 Cloud Music Provider
 * Integrates Microsoft Graph API v1.0 with OAuth 2.0 PKCE authentication,
 * recursive folder exploration under /mimusica, and high-speed audio streaming with @microsoft.graph.downloadUrl.
 */

import { AudioTrack, DriveFolder, ImageFormat, CloudMusicProvider, CloudUserSession } from '../../types';
import { dbService } from '../dbService';
import { sanitizeAudioMimeType, DriveService } from '../driveService';
import { generateCodeVerifier, generateCodeChallenge, generateRandomState } from '../pkce';

const STORAGE_KEY = 'audiocar_onedrive_session';
const CLIENT_ID_KEY = 'audiocar_onedrive_client_id';

// Default public Microsoft App Client ID for SPA (configurable by user)
const DEFAULT_CLIENT_ID = '9372df34-4530-4e58-b636-f6eb8053229b';
const GRAPH_API_ROOT = 'https://graph.microsoft.com/v1.0';

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'flac', 'm4a', 'wav', 'ogg', 'aac', 'opus', 'wma',
  'alac', 'aiff', 'aif', 'm4b', 'm4p', 'webm'
]);

export class OneDriveProvider implements CloudMusicProvider {
  public providerId = 'onedrive' as const;
  public name = 'Microsoft OneDrive';
  public iconName = 'onedrive';

  private currentSession: CloudUserSession | null = null;
  private blobCache: Map<string, string> = new Map();
  private folderArtworkCache: Map<string, { url: string; format: ImageFormat }> = new Map();
  private folderMap: Map<string, DriveFolder> = new Map();

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
          // Token expired, clear or keep for refresh
          localStorage.removeItem(STORAGE_KEY);
          this.currentSession = null;
        }
      }
    } catch (e) {
      console.warn('Could not parse OneDrive session:', e);
    }
  }

  public getClientId(): string {
    return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
  }

  public setClientId(clientId: string) {
    if (clientId.trim()) {
      localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(CLIENT_ID_KEY);
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
      throw new Error('No hay sesión activa de Microsoft OneDrive.');
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    };
  }

  /**
   * OAuth 2.0 PKCE Login Flow for Microsoft Identity Platform
   */
  public async login(): Promise<CloudUserSession> {
    const clientId = this.getClientId();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateRandomState();
    const redirectUri = window.location.origin;

    sessionStorage.setItem('onedrive_pkce_verifier', verifier);
    sessionStorage.setItem('onedrive_auth_state', state);

    const scopes = ['Files.Read', 'User.Read', 'offline_access'].join(' ');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
      clientId
    )}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(
      state
    )}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&prompt=select_account`;

    return new Promise<CloudUserSession>((resolve, reject) => {
      const popupWidth = 600;
      const popupHeight = 700;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      const popup = window.open(
        authUrl,
        'onedrive_oauth_popup',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      );

      if (!popup) {
        reject(new Error('El navegador ha bloqueado la ventana emergente de Microsoft. Permite los pop-ups en tu navegador.'));
        return;
      }

      let interval: NodeJS.Timeout;

      const cleanup = () => {
        clearInterval(interval);
        window.removeEventListener('message', messageHandler);
      };

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'ONEDRIVE_AUTH_CODE' && event.data.code) {
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
              reject(new Error(`Error de Microsoft: ${err}`));
              return;
            }

            if (code) {
              const session = await this.exchangeCodeForToken(code, verifier, redirectUri);
              resolve(session);
            } else {
              reject(new Error('No se recibió el código de autorización de Microsoft.'));
            }
          }
        } catch {
          // Cross-origin safety while on login.microsoftonline.com
        }
      }, 600);
    });
  }

  private async exchangeCodeForToken(code: string, verifier: string, redirectUri: string): Promise<CloudUserSession> {
    const clientId = this.getClientId();
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
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
      throw new Error(errData.error_description || errData.error || 'Error al canjear el token de Microsoft.');
    }

    const data = await res.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 3600;

    // Fetch user profile from Microsoft Graph
    const profile = await this.fetchUserProfile(accessToken);

    const session: CloudUserSession = {
      provider: 'onedrive',
      email: profile.mail || profile.userPrincipalName || 'usuario@microsoft.com',
      name: profile.displayName || 'Usuario OneDrive',
      picture: '',
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000 - 60000
    };

    this.currentSession = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  private async fetchUserProfile(accessToken: string): Promise<any> {
    try {
      const res = await fetch(`${GRAPH_API_ROOT}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch Microsoft profile:', e);
    }
    return {};
  }

  public setDirectSession(accessToken: string, email = 'usuario@microsoft.com', name = 'Usuario OneDrive'): CloudUserSession {
    const session: CloudUserSession = {
      provider: 'onedrive',
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
    this.folderArtworkCache.clear();
    this.folderMap.clear();
  }

  /**
   * Explores folder structure under /mimusica recursively
   */
  public async listFolders(parentId?: string): Promise<DriveFolder[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    try {
      let url = `${GRAPH_API_ROOT}/me/drive/root:/mimusica:/children?$filter=folder ne null&$top=100`;
      if (parentId && parentId !== 'root' && parentId !== 'root_all') {
        url = `${GRAPH_API_ROOT}/me/drive/items/${parentId}/children?$filter=folder ne null&$top=100`;
      }

      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        // If /mimusica does not exist at root, try listing from root
        if (res.status === 404 && (!parentId || parentId === 'root')) {
          return this.listRootFallbackFolders();
        }
        return [];
      }

      const data = await res.json();
      const items = data.value || [];

      const folders: DriveFolder[] = items
        .filter((item: any) => item.folder)
        .map((item: any) => {
          const folderObj: DriveFolder = {
            id: item.id,
            name: item.name,
            parentId: parentId || 'root',
            path: `/mimusica/${item.name}`
          };
          this.folderMap.set(item.id, folderObj);
          return folderObj;
        });

      await dbService.saveFolders(folders).catch(() => {});
      return folders;
    } catch (e) {
      console.warn('OneDrive listFolders error:', e);
      return [];
    }
  }

  private async listRootFallbackFolders(): Promise<DriveFolder[]> {
    try {
      const res = await fetch(`${GRAPH_API_ROOT}/me/drive/root/children?$filter=folder ne null&$top=50`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.value || [])
        .filter((i: any) => i.folder)
        .map((i: any) => ({
          id: i.id,
          name: i.name,
          parentId: 'root',
          path: `/${i.name}`
        }));
    } catch {
      return [];
    }
  }

  /**
   * Discovers and lists all audio tracks in /mimusica and its subfolders
   */
  public async listTracks(folderPath?: string): Promise<AudioTrack[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Usuario no autenticado en Microsoft OneDrive');

    const driveHelper = new DriveService();
    const tracks: AudioTrack[] = [];

    try {
      // 1. Recursive list or specific folder
      let url = `${GRAPH_API_ROOT}/me/drive/root:/mimusica:/children?$top=200&$expand=thumbnails`;
      if (folderPath && folderPath !== 'root' && folderPath !== 'root_all') {
        url = `${GRAPH_API_ROOT}/me/drive/items/${folderPath}/children?$top=200&$expand=thumbnails`;
      }

      let nextLink: string | null = url;
      const allItems: any[] = [];

      while (nextLink) {
        const res = await fetch(nextLink, { headers: this.getHeaders() });
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('Carpeta /mimusica no encontrada en OneDrive. Explorando raíz...');
            // Try fetching from root directly
            const rootRes = await fetch(`${GRAPH_API_ROOT}/me/drive/root/children?$top=200&$expand=thumbnails`, {
              headers: this.getHeaders()
            });
            if (rootRes.ok) {
              const rootData = await rootRes.json();
              allItems.push(...(rootData.value || []));
            }
          }
          break;
        }

        const data = await res.json();
        if (data.value && Array.isArray(data.value)) {
          allItems.push(...data.value);
        }
        nextLink = data['@odata.nextLink'] || null;
      }

      // Also explore subfolders recursively
      const subfolderItems = allItems.filter((i: any) => i.folder);
      for (const sub of subfolderItems.slice(0, 15)) {
        try {
          const subUrl = `${GRAPH_API_ROOT}/me/drive/items/${sub.id}/children?$top=200&$expand=thumbnails`;
          const subRes = await fetch(subUrl, { headers: this.getHeaders() });
          if (subRes.ok) {
            const subData = await subRes.json();
            const childItems = (subData.value || []).map((ci: any) => ({
              ...ci,
              parentFolderName: sub.name,
              parentFolderId: sub.id
            }));
            allItems.push(...childItems);
          }
        } catch (e) {
          console.warn('Subfolder discovery error:', e);
        }
      }

      // Filter and build AudioTrack objects
      for (const item of allItems) {
        if (item.folder) continue;

        const name = (item.name || '').toLowerCase();
        const ext = name.split('.').pop() || '';
        if (!AUDIO_EXTENSIONS.has(ext) && !item.audio) continue;

        const parsed = driveHelper.parseAudioFilename(item.name);
        const parentName = item.parentFolderName || item.parentReference?.name || 'mimusica';
        const albumName = parentName !== 'mimusica' && parentName !== 'root' ? parentName : (parsed.album || 'OneDrive Music');

        // Extract streaming URL: Microsoft Graph downloadUrl is direct and supports HTTP Range Requests
        const downloadUrl = item['@microsoft.graph.downloadUrl'] || '';
        const thumbnailUrl = item.thumbnails?.[0]?.large?.url || item.thumbnails?.[0]?.medium?.url || '';

        const safeMime = sanitizeAudioMimeType(item.file?.mimeType, item.name);

        const track: AudioTrack = {
          id: `onedrive_${item.id}`,
          cloudFileId: item.id,
          driveFileId: item.id,
          name: item.name,
          title: parsed.title,
          artist: parsed.artist,
          album: albumName,
          duration: item.audio?.duration ? Math.round(item.audio.duration / 1000) : 0,
          size: item.size || 0,
          mimeType: safeMime,
          thumbnailUrl: thumbnailUrl,
          artworkFormat: 'JPG',
          streamUrl: downloadUrl,
          folderId: item.parentFolderId || item.parentReference?.id || 'root',
          folderPath: `/mimusica/${parentName}`,
          source: 'onedrive',
          addedAt: new Date(item.lastModifiedDateTime || Date.now()).getTime()
        };

        tracks.push(track);
      }

      if (tracks.length > 0) {
        await dbService.saveTracks(tracks).catch(() => {});
      }

      return tracks;
    } catch (err) {
      console.error('OneDrive listTracks error:', err);
      return [];
    }
  }

  /**
   * Retrieves high-speed streaming URL for Microsoft OneDrive tracks
   * Uses direct @microsoft.graph.downloadUrl or authenticated media stream with IndexedDB offline caching.
   */
  public async getStreamUrl(track: AudioTrack): Promise<string> {
    const fileId = track.cloudFileId || track.driveFileId;
    if (!fileId) return track.streamUrl || '';

    // 1. Check RAM cache
    if (this.blobCache.has(fileId)) {
      return this.blobCache.get(fileId)!;
    }

    // 2. Check IndexedDB cache
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

    // 3. If streamUrl exists and is recent downloadUrl, test or use directly
    if (track.streamUrl) {
      return track.streamUrl;
    }

    // 4. Fetch fresh item metadata with @microsoft.graph.downloadUrl
    const token = this.getAccessToken();
    if (!token) throw new Error('Sesión de Microsoft OneDrive expirada.');

    try {
      const res = await fetch(`${GRAPH_API_ROOT}/me/drive/items/${fileId}`, {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        throw new Error(`Error en OneDrive API: HTTP ${res.status}`);
      }

      const item = await res.json();
      const directUrl = item['@microsoft.graph.downloadUrl'];
      if (directUrl) {
        return directUrl;
      }

      // Fallback: Fetch media blob directly
      const mediaRes = await fetch(`${GRAPH_API_ROOT}/me/drive/items/${fileId}/content`, {
        headers: this.getHeaders()
      });
      if (mediaRes.ok) {
        const rawBlob = await mediaRes.blob();
        const audioBlob = new Blob([rawBlob], { type: track.mimeType || 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        this.blobCache.set(fileId, blobUrl);
        dbService.saveAudioBlob(fileId, audioBlob).catch(() => {});
        return blobUrl;
      }
    } catch (err) {
      console.error('Error fetching OneDrive stream:', err);
    }

    return track.streamUrl || '';
  }

  public async prefetchStream(track: AudioTrack): Promise<boolean> {
    const fileId = track.cloudFileId || track.driveFileId;
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

export const oneDriveProvider = new OneDriveProvider();
