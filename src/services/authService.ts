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
import { DriveAuthUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

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
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Setup Google Auth Provider with all required Google Drive & profile scopes
const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

type AuthListener = (user: DriveAuthUser | null) => void;

class AuthService {
  private currentUser: DriveAuthUser | null = null;
  private tokenClient: any = null;
  private listeners: Set<AuthListener> = new Set();
  private isSigningIn = false;

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
   * Primary Sign-In Method: Firebase Auth Popup with Google Provider
   * Seamlessly resolves tokens and profile.
   */
  public async requestSignIn(): Promise<DriveAuthUser> {
    if (this.isSigningIn) {
      throw new Error('Ya hay un proceso de inicio de sesión en curso.');
    }

    this.isSigningIn = true;

    try {
      // 1. Try Firebase Auth popup
      const result = await signInWithPopup(auth, googleProvider);
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
    } catch (firebaseErr: any) {
      console.warn('Firebase Popup error, attempting Google Identity Services fallback...', firebaseErr);

      // 2. Fallback to GIS Token Client if available
      return new Promise<DriveAuthUser>((resolve, reject) => {
        const initialized = this.initTokenClient((user) => {
          this.isSigningIn = false;
          resolve(user);
        });

        if (!initialized || !this.tokenClient) {
          this.isSigningIn = false;
          const msg = firebaseErr.message || 'Error al conectar con Google.';
          reject(new Error(msg));
          return;
        }

        try {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err: any) {
          this.isSigningIn = false;
          reject(err);
        }
      });
    } finally {
      this.isSigningIn = false;
    }
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
        callback: async (tokenResponse: any) => {
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
            if (callback) callback(user);
          }
        },
        error_callback: (err: any) => {
          console.error('Google Auth Error:', err);
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
    this.listeners.forEach((listener) => listener(user));
  }
}

export const authService = new AuthService();
