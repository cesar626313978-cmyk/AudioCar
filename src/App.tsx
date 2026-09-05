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
import { DEMO_TRACKS } from './data/demoTracks';

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
      const hideDemoTracks = await dbService.isDemoTracksHidden();

      // Merge cached tracks with demo tracks (ensuring latest demo streamUrls)
      const mergedMap = new Map<string, AudioTrack>();
      if (!hideDemoTracks) {
        DEMO_TRACKS.forEach((t) => mergedMap.set(t.id, t));
      }
      cachedTracks.forEach((t) => {
        if (hideDemoTracks && (t.source === 'demo' || t.id.startsWith('demo_'))) {
          return;
        }
        if (t.source === 'demo' || t.id.startsWith('demo_')) {
          const fresh = DEMO_TRACKS.find((d) => d.id === t.id);
          if (fresh) {
            mergedMap.set(t.id, { ...fresh, isFavorite: t.isFavorite ?? fresh.isFavorite });
            return;
          }
        }
        mergedMap.set(t.id, t);
      });

      const mergedList = Array.from(mergedMap.values());
      setTracks(mergedList);
      setFolders(cachedFolders);
      audioEngine.setAllAvailableTracks(mergedList);

      // Set initial audio queue if empty
      if (audioEngine.getState().queue.length === 0 && mergedList.length > 0) {
        audioEngine.setQueue(mergedList, 0, false);
      }
    } catch (e) {
      console.warn('Initial data load warning:', e);
      if (audioEngine.getState().queue.length === 0) {
        audioEngine.setQueue(DEMO_TRACKS, 0, false);
      }
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
        const hideDemo = await dbService.isDemoTracksHidden();
        const mergedMap = new Map<string, AudioTrack>();
        if (!hideDemo) {
          DEMO_TRACKS.forEach((t) => mergedMap.set(t.id, t));
        }
        partialTracks.forEach((t) => mergedMap.set(t.id, t));
        const updatedList = Array.from(mergedMap.values());

        if (partialTracks.length > 0) {
          setTracks(updatedList);
          audioEngine.setAllAvailableTracks(updatedList);

          // Update player queue immediately so user can press play right away!
          const currentTrack = audioEngine.getCurrentTrack();
          if (!currentTrack || currentTrack.source === 'demo') {
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
      const hideDemoTracks = await dbService.isDemoTracksHidden();

      if (syncResult.status === 'root_folder_not_found') {
        setSyncNotice({
          isOpen: true,
          type: 'mimusica_not_found',
          userEmail: syncResult.userEmail
        });
        return;
      }

      if (isManual) {
        if (syncResult.status === 'not_authenticated') {
          setSyncNotice({
            isOpen: true,
            type: 'not_connected'
          });
          return;
        }

        if (syncResult.status === 'synced') {
          setSyncNotice({
            isOpen: true,
            type: 'sync_success',
            userEmail: syncResult.userEmail,
            foldersCount: syncResult.foldersCount,
            tracksCount: syncResult.tracksCount
          });
        }
      }

      const cloudTracks = syncResult.tracks || [];
      const cloudFolders = syncResult.folders || [];

      // If we found cloud folders, update state; do not wipe existing cached folders if empty
      if (cloudFolders.length > 0) {
        setFolders(cloudFolders);
      }

      // Merge with demo tracks (unless user removed them)
      if (cloudTracks.length > 0) {
        const mergedMap = new Map<string, AudioTrack>();
        if (!hideDemoTracks) {
          DEMO_TRACKS.forEach((t) => mergedMap.set(t.id, t));
        }
        cloudTracks.forEach((t) => mergedMap.set(t.id, t));

        const updatedTracks = Array.from(mergedMap.values());
        setTracks(updatedTracks);
        audioEngine.setAllAvailableTracks(updatedTracks);

        // Update player queue if it only had demo tracks or is empty
        const currentTrack = audioEngine.getCurrentTrack();
        if (!currentTrack || currentTrack.source === 'demo') {
          audioEngine.setQueue(cloudTracks, 0, false);
        }
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

  const handleDeleteDemoTracks = async () => {
    await dbService.deleteDemoTracks();
    preferencesService.updateCurrentPreference('hideDemoTracks', true);
    const remaining = tracks.filter((t) => t.source !== 'demo' && !t.id.startsWith('demo_'));
    setTracks(remaining);

    // Update queue if it contained demo tracks
    const currentQueue = audioEngine.getState().queue;
    const filteredQueue = currentQueue.filter((t) => t.source !== 'demo' && !t.id.startsWith('demo_'));
    if (filteredQueue.length > 0) {
      audioEngine.setQueue(filteredQueue, 0, false);
    } else if (remaining.length > 0) {
      audioEngine.setQueue(remaining, 0, false);
    }
  };

  const handleRestoreDemoTracks = async () => {
    await dbService.setDemoTracksHidden(false);
    preferencesService.updateCurrentPreference('hideDemoTracks', false);
    await dbService.saveTracks(DEMO_TRACKS);
    const mergedMap = new Map<string, AudioTrack>();
    DEMO_TRACKS.forEach((t) => mergedMap.set(t.id, t));
    tracks.forEach((t) => mergedMap.set(t.id, t));
    const merged = Array.from(mergedMap.values());
    setTracks(merged);
    if (audioEngine.getState().queue.length === 0 && merged.length > 0) {
      audioEngine.setQueue(merged, 0, false);
    }
  };

  const handleDeleteSingleTrack = async (trackId: string) => {
    await dbService.deleteTrack(trackId);
    const remaining = tracks.filter((t) => t.id !== trackId);
    setTracks(remaining);
    const currentQueue = audioEngine.getState().queue;
    const filteredQueue = currentQueue.filter((t) => t.id !== trackId);
    if (filteredQueue.length !== currentQueue.length) {
      if (filteredQueue.length > 0) {
        audioEngine.setQueue(filteredQueue, 0, false);
      }
    }
  };

  const hasDemoTracks = tracks.some((t) => t.source === 'demo' || t.id.startsWith('demo_'));

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
          onDeleteDemoTracks={handleDeleteDemoTracks}
          onRestoreDemoTracks={handleRestoreDemoTracks}
          onDeleteTrack={handleDeleteSingleTrack}
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {activeOverlay === 'settings' && (
        <AudioSettingsModal
          playerState={playerState}
          onClose={() => setActiveOverlay('none')}
          hasDemoTracks={hasDemoTracks}
          onDeleteDemoTracks={handleDeleteDemoTracks}
          onRestoreDemoTracks={handleRestoreDemoTracks}
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
          foldersCount={syncNotice.foldersCount}
          tracksCount={syncNotice.tracksCount}
          trackTitle={syncNotice.trackTitle}
          onClose={() => setSyncNotice((prev) => ({ ...prev, isOpen: false }))}
          onConnectSuccess={() => {
            syncCloudContent(true);
            audioEngine.play();
          }}
          onFolderCreated={() => syncCloudContent(true)}
        />
      )}
    </div>
  );
}

export default App;
