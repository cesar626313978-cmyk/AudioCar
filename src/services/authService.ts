/**
 * Google Authentication Service (Firebase Auth + Google Identity Services)
 * Manages OAuth 2.0 Access Tokens for Google Drive API v3
 * Configured with the official Cloud Project OAuth Client ID
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { AudioTrack, DriveAuthUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { swService } from './swService';

declare global {
  interface Window {
    google?: any;
  }
}

const AUTH_STORAGE_KEY = 'tesladrive_auth_session';
const CLIENT_ID_KEY = 'tesladrive_custom_client_id';

// Default provisioned client ID from Google Cloud Console project setup
const DEFAULT_CLIENT_ID = (firebaseConfig as any).oAuthClientId || '1094273500016-jj1hfi1cv2p7ihqsvakmprpevd38ldau.apps.googleusercontent.com';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

type AuthListener = (user: DriveAuthUser | null) => void;

class AuthService {
  private currentUser: DriveAuthUser | null = null;
  private tokenClient: any = null;
  private listeners: Set<AuthListener> = new Set();
  private isSigningIn = false;
  private pendingAuthResolve: ((user: DriveAuthUser) => void) | null = null;
  private pendingAuthReject: ((err: any) => void) | null = null;

  constructor() {
    this.loadPersistedSession();
    this.setupFirebaseListener();
  }

  private setupFirebaseListener() {
    onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (!firebaseUser) {
        if (!this.currentUser?.isManual) {
          // Keep current user only if valid persisted session with token exists
          const current = this.getUser();
          if (!current) {
            this.currentUser = null;
            localStorage.removeItem(AUTH_STORAGE_KEY);
            this.notifyListeners();
          }
        }
      }
    });
  }

  private loadPersistedSession() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored) as DriveAuthUser & { isManual?: boolean };
        if (user.expiresAt && user.expiresAt > Date.now()) {
          this.currentUser = user;
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          this.currentUser = null;
        }
      }
    } catch (e) {
      console.warn('Could not parse stored session:', e);
    }
  }

  public getClientId(): string {
    const custom = localStorage.getItem(CLIENT_ID_KEY);
    return custom || DEFAULT_CLIENT_ID;
  }

  public setClientId(clientId: string) {
    if (clientId.trim()) {
      localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(CLIENT_ID_KEY);
    }
    this.tokenClient = null;
  }

  /**
   * Primary Sign-In Method:
   * 1. Uses Google Identity Services (GIS) with prompt: 'select_account' to ALWAYS
   *    prompt the user to choose which Gmail/Google account they want to use.
   * 2. Falls back to Firebase Auth with explicit prompt: 'select_account'.
   */
  public async requestSignIn(): Promise<DriveAuthUser> {
    if (this.isSigningIn) {
      throw new Error('Ya hay un proceso de inicio de sesión en curso.');
    }

    this.isSigningIn = true;

    try {
      // 1. Prioritize Google Identity Services (GIS) Token Client
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        return await new Promise<DriveAuthUser>((resolve, reject) => {
          this.pendingAuthResolve = resolve;
          this.pendingAuthReject = reject;

          const initialized = this.initTokenClient();
          if (initialized && this.tokenClient) {
            try {
              // 'select_account' forces Google to show the account picker every time
              this.tokenClient.requestAccessToken({ prompt: 'select_account' });
              return;
            } catch (gisErr) {
              console.warn('GIS requestAccessToken error, trying Firebase...', gisErr);
            }
          }

          // Fallback to Firebase if GIS fails to start
          this.signInWithFirebaseAuth()
            .then((user) => {
              this.pendingAuthResolve = null;
              this.pendingAuthReject = null;
              resolve(user);
            })
            .catch((err) => {
              this.pendingAuthResolve = null;
              this.pendingAuthReject = null;
              reject(err);
            });
        });
      }

      // 2. Fallback to Firebase Auth popup with prompt: 'select_account'
      return await this.signInWithFirebaseAuth();
    } finally {
      this.isSigningIn = false;
    }
  }

  /**
   * Firebase Auth sign-in with Google Provider and explicit prompt: 'select_account'
   */
  private async signInWithFirebaseAuth(): Promise<DriveAuthUser> {
    const provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const accessToken = credential?.accessToken;
    if (!accessToken) {
      throw new Error('No se recibió el token de acceso OAuth desde Google.');
    }

    const user: DriveAuthUser = {
      accessToken,
      expiresAt: Date.now() + 3600 * 1000 - 60000,
      email: result.user.email || 'usuario@google.com',
      name: result.user.displayName || 'Conductor AudioCar',
      picture: result.user.photoURL || ''
    };

    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  public initTokenClient(callback?: (user: DriveAuthUser) => void): boolean {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      return false;
    }

    const clientId = this.getClientId();

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            console.error('GIS Error callback:', tokenResponse.error);
            if (this.pendingAuthReject) {
              this.pendingAuthReject(new Error(tokenResponse.error_description || tokenResponse.error));
              this.pendingAuthReject = null;
              this.pendingAuthResolve = null;
            }
            return;
          }

          if (tokenResponse && tokenResponse.access_token) {
            const expiresInSec = tokenResponse.expires_in || 3600;
            const expiresAt = Date.now() + expiresInSec * 1000 - 60000;

            const profile = await this.fetchUserProfile(tokenResponse.access_token);

            const user: DriveAuthUser = {
              accessToken: tokenResponse.access_token,
              expiresAt,
              email: profile.email || 'usuario@google.com',
              name: profile.name || 'Conductor AudioCar',
              picture: profile.picture || ''
            };

            this.currentUser = user;
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
            this.notifyListeners();

            if (this.pendingAuthResolve) {
              this.pendingAuthResolve(user);
              this.pendingAuthResolve = null;
              this.pendingAuthReject = null;
            }

            if (callback) callback(user);
          }
        },
        error_callback: (err: any) => {
          console.error('Google Auth Error:', err);
          if (this.pendingAuthReject) {
            this.pendingAuthReject(new Error(err?.message || err?.error || 'Error al conectar con Google'));
            this.pendingAuthReject = null;
            this.pendingAuthResolve = null;
          }
        }
      });
      return true;
    } catch (err) {
      console.error('Failed to initTokenClient:', err);
      return false;
    }
  }

  private async fetchUserProfile(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
    return {};
  }

  public setDirectSession(accessToken: string, email: string = 'conductor@audiocar.drive', name: string = 'Conductor Conectado') {
    const user: DriveAuthUser & { isManual: boolean } = {
      accessToken,
      email,
      name,
      expiresAt: Date.now() + 3600 * 1000 * 24, // 24h for manual developer tokens
      isManual: true
    };
    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notifyListeners();
  }

  public async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }

    if (this.currentUser?.accessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.currentUser.accessToken, () => {
          console.log('Access token revoked');
        });
      } catch (e) {
        console.warn('Error revoking token:', e);
      }
    }
    this.currentUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    swService.clearToken();
    this.notifyListeners();
  }

  public getUser(): DriveAuthUser | null {
    if (this.currentUser && this.currentUser.expiresAt > Date.now()) {
      return this.currentUser;
    }
    return null;
  }

  public getAccessToken(): string | null {
    const user = this.getUser();
    return user ? user.accessToken : null;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.getUser());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const user = this.getUser();
    if (user?.accessToken) {
      swService.syncToken(user.accessToken);
    }
    this.listeners.forEach((listener) => listener(user));
  }
}

export const authService = new AuthService();
