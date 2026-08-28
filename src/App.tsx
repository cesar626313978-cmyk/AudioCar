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

export type ActiveOverlay = 'none' | 'library' | 'settings' | 'auth' | 'donation' | 'contact' | 'help';

export function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(audioEngine.getState());
  const [user, setUser] = useState<DriveAuthUser | null>(authService.getUser());
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('none');
  
  // Theme state (Dark mode by default, persisted locally)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('audiocar_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('audiocar_theme', next);
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

    // 3. Subscribe to Auth changes
    const unsubscribeAuth = authService.subscribe((authUser) => {
      if (authUser && cloudService.getActiveProviderId() === 'drive') {
        setUser(authUser);
        syncCloudContent();
      }
    });

    // 4. Load initial local data & queue
    loadInitialData();

    // 5. Init Google Token client
    authService.initTokenClient(() => {
      syncCloudContent();
    });

    return () => {
      unsubscribeAudio();
      unsubscribeCloud();
      unsubscribeAuth();
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

  const syncCloudContent = async () => {
    setIsLoading(true);
    try {
      const { tracks: cloudTracks, folders: cloudFolders } = await cloudService.syncLibrary();
      const hideDemoTracks = await dbService.isDemoTracksHidden();

      // Merge with demo tracks (unless user removed them)
      const mergedMap = new Map<string, AudioTrack>();
      if (!hideDemoTracks) {
        DEMO_TRACKS.forEach((t) => mergedMap.set(t.id, t));
      }
      cloudTracks.forEach((t) => mergedMap.set(t.id, t));

      const updatedTracks = Array.from(mergedMap.values());
      setTracks(updatedTracks);
      setFolders(cloudFolders);
      audioEngine.setAllAvailableTracks(updatedTracks);

      // Update player queue if it only had demo tracks or is empty
      const currentTrack = audioEngine.getCurrentTrack();
      if (!currentTrack || currentTrack.source === 'demo') {
        if (cloudTracks.length > 0) {
          audioEngine.setQueue(cloudTracks, 0, false);
        }
      }
    } catch (err) {
      console.warn('Error syncing cloud content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDemoTracks = async () => {
    await dbService.deleteDemoTracks();
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
          onRefreshDrive={syncCloudContent}
          isLoading={isLoading}
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
            syncCloudContent();
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
    </div>
  );
}

export default App;
