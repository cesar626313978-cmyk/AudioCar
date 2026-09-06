/**
 * Main Application Shell - AudioCar
 * Single-Page Architecture with In-Car Cockpit Player as Main View
 * Minimalist Icon-Only Header & Overlay Menu System with Bottom Save/Action Bars
 */

import React, { useState, useEffect } from 'react';
import { PlayerState, AudioTrack, DriveFolder, DriveAuthUser } from './types';
import { audioEngine } from './services/audioEngine';
import { authService } from './services/authService';
import { cloudService } from './services/cloudService';
import { dbService } from './services/dbService';
import { preferencesService } from './services/preferencesService';
import { driveService } from './services/driveService';

// Components
import { Header } from './components/Header';
import { TeslaDashboardSimulator } from './components/TeslaDashboardSimulator';
import { LibraryModal } from './components/LibraryModal';
import { AuthModal } from './components/AuthModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { DonationModal } from './components/DonationModal';
import { ContactModal } from './components/ContactModal';
import { HelpModal } from './components/HelpModal';
import { SyncNoticeModal, SyncNoticeType } from './components/SyncNoticeModal';

export type ActiveOverlay = 'none' | 'library' | 'settings' | 'auth' | 'donation' | 'contact' | 'help';

export function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(audioEngine.getState());
  const [user, setUser] = useState<DriveAuthUser | null>(authService.getUser());
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressPercent, setSyncProgressPercent] = useState<number>(0);
  const [syncProgressStep, setSyncProgressStep] = useState<string>('');
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('none');
  const [syncNotice, setSyncNotice] = useState<{
    isOpen: boolean;
    type: SyncNoticeType;
    userEmail?: string;
    rootFolderName?: string;
    foldersCount?: number;
    tracksCount?: number;
    trackTitle?: string;
  }>({
    isOpen: false,
    type: 'not_connected'
  });
  
  // Theme state (Dark mode by default, persisted locally)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('audiocar_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('audiocar_theme', next);
      preferencesService.updateCurrentPreference('theme', next);
      return next;
    });
  };

  // Initialize and subscribe
  useEffect(() => {
    // 1. Subscribe to Audio Engine state
    const unsubscribeAudio = audioEngine.subscribe((state) => {
      setPlayerState(state);
    });

    // 2. Subscribe to Cloud Provider changes
    const unsubscribeCloud = cloudService.subscribe((provider) => {
      const session = provider.getSession();
      if (session) {
        setUser({
          email: session.email,
          name: session.name,
          picture: session.picture || '',
          accessToken: session.accessToken,
          expiresAt: session.expiresAt
        });
      } else {
        setUser(null);
      }
    });

    // 3. Subscribe to Auth changes and apply User Preferences
    const unsubscribeAuth = authService.subscribe(async (authUser) => {
      const activeEmail = authUser?.email || 'default';
      
      // Load and apply this specific user's saved preferences profile
      try {
        const userPrefs = await preferencesService.loadPreferencesForUser(activeEmail);
        audioEngine.applyPreferencesProfile(userPrefs);
        if (userPrefs.theme && (userPrefs.theme === 'dark' || userPrefs.theme === 'light')) {
          setTheme(userPrefs.theme);
          localStorage.setItem('audiocar_theme', userPrefs.theme);
        }
      } catch (e) {
        console.warn('Could not apply user preferences on auth change:', e);
      }

      if (authUser && cloudService.getActiveProviderId() === 'drive') {
        setUser(authUser);
        syncCloudContent();
      } else if (!authUser) {
        setUser(null);
        audioEngine.stop();
        audioEngine.purgeMemoryBuffers();
      }
    });

    // 4. Subscribe to live preference changes (local updates & cloud sync merges)
    const unsubscribePrefs = preferencesService.subscribe((prefs) => {
      audioEngine.applyPreferencesProfile(prefs);
      if (prefs.theme && (prefs.theme === 'dark' || prefs.theme === 'light')) {
        setTheme(prefs.theme);
      }
    });

    // 5. Subscribe to Drive Auth Required events (triggered when user tries to play or access Drive content while disconnected)
    const unsubscribeAuthRequired = audioEngine.onAuthRequired((provider, track) => {
      setSyncNotice({
        isOpen: true,
        type: 'not_connected',
        trackTitle: track?.title || track?.name
      });
    });

    // 6. Load initial local data & queue
    loadInitialData();

    // 7. Init Google Token client
    authService.initTokenClient();

    return () => {
      unsubscribeAudio();
      unsubscribeCloud();
      unsubscribeAuth();
      unsubscribePrefs();
      unsubscribeAuthRequired();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const cachedTracks = await dbService.getAllTracks();
      const cachedFolders = await dbService.getAllFolders();

      setTracks(cachedTracks);
      setFolders(cachedFolders);
      audioEngine.setAllAvailableTracks(cachedTracks);

      // Set initial audio queue if empty and cached tracks exist
      if (audioEngine.getState().queue.length === 0 && cachedTracks.length > 0) {
        audioEngine.setQueue(cachedTracks, 0, false);
      }
    } catch (e) {
      console.warn('Initial data load warning:', e);
    }
  };

  const syncCloudContent = async (isManual: boolean = false) => {
    setIsLoading(true);
    setIsSyncing(true);
    setSyncProgressPercent(10);
    setSyncProgressStep('Conectando con Google Drive...');
    try {
      // Stream partial tracks and folders into player state as soon as discovered
      const handlePartialStream = async (partialTracks: AudioTrack[], partialFolders?: DriveFolder[]) => {
        if (partialTracks.length > 0) {
          setTracks(partialTracks);
          audioEngine.setAllAvailableTracks(partialTracks);

          // Update player queue if empty so user can press play right away!
          const currentTrack = audioEngine.getCurrentTrack();
          if (!currentTrack) {
            audioEngine.setQueue(partialTracks, 0, false);
          }
        }

        if (partialFolders && partialFolders.length > 0) {
          setFolders(partialFolders);
        }

        // UNLOCK the library and player immediately so user can use the app without waiting!
        setIsLoading(false);
      };

      const syncResult = await cloudService.syncLibraryDetailed(
        undefined,
        (progress) => {
          setSyncProgressPercent(progress.percent);
          setSyncProgressStep(progress.step);
        },
        handlePartialStream
      );

      if (isManual) {
        if (syncResult.status === 'not_authenticated') {
          setSyncNotice({
            isOpen: true,
            type: 'not_connected'
          });
          return;
        }

        if (syncResult.status === 'root_folder_not_found') {
          setSyncNotice({
            isOpen: true,
            type: 'mimusica_not_found',
            userEmail: syncResult.userEmail
          });
          return;
        }

        if (syncResult.status === 'synced') {
          setSyncNotice({
            isOpen: true,
            type: 'sync_success',
            userEmail: syncResult.userEmail,
            rootFolderName: syncResult.rootFolderName,
            foldersCount: syncResult.foldersCount,
            tracksCount: syncResult.tracksCount
          });
        }
      }

      const cloudTracks = syncResult.tracks || [];
      const cloudFolders = syncResult.folders || [];

      setTracks(cloudTracks);
      setFolders(cloudFolders);
      audioEngine.setAllAvailableTracks(cloudTracks);

      // Update player queue if empty
      const currentTrack = audioEngine.getCurrentTrack();
      if (!currentTrack && cloudTracks.length > 0) {
        audioEngine.setQueue(cloudTracks, 0, false);
      }
    } catch (err) {
      console.warn('Error syncing cloud content:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      setTimeout(() => {
        setSyncProgressPercent(0);
        setSyncProgressStep('');
      }, 1500);
    }
  };

  const handleDeleteSingleTrack = async (trackId: string) => {
    await dbService.deleteTrack(trackId);
    const remaining = tracks.filter((t) => t.id !== trackId);
    setTracks(remaining);
    audioEngine.setAllAvailableTracks(remaining);
    const currentQueue = audioEngine.getState().queue;
    const filteredQueue = currentQueue.filter((t) => t.id !== trackId);
    if (filteredQueue.length !== currentQueue.length) {
      audioEngine.setQueue(filteredQueue, 0, false);
    }
  };

  return (
    <div className={`w-screen h-screen overflow-hidden ${theme === 'light' ? 'theme-light bg-[#f1f3f6] text-[#0f172a]' : 'theme-dark bg-black text-white'} flex flex-col antialiased selection:bg-[#E82127] selection:text-white`}>
      {/* 1. TOP HEADER: Skeuomorphic luxury top bar with 7 gold-bezel icons */}
      <Header
        user={user}
        activeOverlay={activeOverlay}
        isPlaying={playerState.isPlaying}
        isSyncing={isSyncing}
        syncPercent={syncProgressPercent}
        syncStep={syncProgressStep}
        onOpenPlayer={() => setActiveOverlay('none')}
        onOpenLibrary={() => setActiveOverlay('library')}
        onOpenSettings={() => setActiveOverlay('settings')}
        onOpenAuth={() => setActiveOverlay('auth')}
        onOpenDonation={() => setActiveOverlay('donation')}
        onOpenContact={() => setActiveOverlay('contact')}
        onOpenHelp={() => setActiveOverlay('help')}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* 2. MAIN VIEW: Single-Page In-Car Cockpit Player */}
      <main className="flex-1 w-full h-full overflow-hidden flex flex-col relative">
        <TeslaDashboardSimulator
          playerState={playerState}
          onExitTeslaMode={() => setActiveOverlay('library')}
          onOpenSettings={() => setActiveOverlay('settings')}
        />
      </main>

      {/* 3. OVERLAY MENUS (Rendered directly over the player with Save & Close bottom bar) */}
      {activeOverlay === 'library' && (
        <LibraryModal
          tracks={tracks}
          folders={folders}
          currentTrackId={audioEngine.getCurrentTrack()?.id}
          onRefreshDrive={() => syncCloudContent(true)}
          isLoading={isLoading}
          isSyncing={isSyncing}
          syncPercent={syncProgressPercent}
          syncStep={syncProgressStep}
          onDeleteTrack={handleDeleteSingleTrack}
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {activeOverlay === 'settings' && (
        <AudioSettingsModal
          playerState={playerState}
          onClose={() => setActiveOverlay('none')}
          allTracks={tracks}
          onOpenDonation={() => setActiveOverlay('donation')}
          onOpenContact={() => setActiveOverlay('contact')}
          onOpenHelp={() => setActiveOverlay('help')}
        />
      )}

      {activeOverlay === 'auth' && (
        <AuthModal
          onClose={() => setActiveOverlay('none')}
          onSuccess={() => {
            syncCloudContent(true);
          }}
        />
      )}

      {activeOverlay === 'donation' && (
        <DonationModal
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {activeOverlay === 'contact' && (
        <ContactModal
          onClose={() => setActiveOverlay('none')}
          user={user}
          playerState={playerState}
        />
      )}

      {activeOverlay === 'help' && (
        <HelpModal
          onClose={() => setActiveOverlay('none')}
          onOpenCloud={() => setActiveOverlay('auth')}
          onOpenLibrary={() => setActiveOverlay('library')}
          onOpenSettings={() => setActiveOverlay('settings')}
        />
      )}

      {/* 4. SYNC STATUS & ALERT MODAL */}
      {syncNotice.isOpen && (
        <SyncNoticeModal
          type={syncNotice.type}
          userEmail={syncNotice.userEmail}
          rootFolderName={syncNotice.rootFolderName}
          foldersCount={syncNotice.foldersCount}
          tracksCount={syncNotice.tracksCount}
          trackTitle={syncNotice.trackTitle}
          onClose={() => setSyncNotice((prev) => ({ ...prev, isOpen: false }))}
          onConnectSuccess={() => {
            syncCloudContent(true);
            audioEngine.play();
          }}
          onFolderCreated={() => syncCloudContent(true)}
          onPickFolder={async () => {
            const folder = await driveService.promptPickMusicFolder();
            if (folder) {
              await syncCloudContent(true);
            }
          }}
          onReauthorize={async () => {
            try {
              setIsLoading(true);
              await authService.requestSignIn({ forceConsent: true });
              await syncCloudContent(true);
            } catch (err) {
              console.error('Re-auth error:', err);
            } finally {
              setIsLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
