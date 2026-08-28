import React, { useState, useEffect, useMemo } from 'react';
import { AudioTrack, ImageFormat } from '../types';
import { driveService } from '../services/driveService';
import { Music, Disc3, Disc } from 'lucide-react';

export interface AlbumArtworkProps {
  track?: AudioTrack | null;
  url?: string;
  title?: string;
  artist?: string;
  format?: ImageFormat;
  showFormatBadge?: boolean;
  allowZoom?: boolean;
  showVinyl?: boolean;
  isPlaying?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fluid' | 'full';
  className?: string;
  rounded?: boolean;
}

// 12 Curated Neon & Vibrant Automotive Luxury Gradients for Tracks
const TRACK_THEMES = [
  {
    id: 'violet-pulse',
    bg: 'from-violet-600 via-purple-700 to-indigo-950',
    ring: 'border-purple-400/40',
    text: 'text-purple-200',
    center: 'bg-purple-900/90',
    glow: 'rgba(168, 85, 247, 0.4)'
  },
  {
    id: 'sunset-blaze',
    bg: 'from-amber-500 via-orange-600 to-red-950',
    ring: 'border-amber-400/40',
    text: 'text-amber-200',
    center: 'bg-amber-900/90',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  {
    id: 'electric-cyan',
    bg: 'from-cyan-500 via-blue-600 to-slate-950',
    ring: 'border-cyan-400/40',
    text: 'text-cyan-200',
    center: 'bg-cyan-900/90',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  {
    id: 'emerald-aurora',
    bg: 'from-emerald-500 via-teal-700 to-slate-950',
    ring: 'border-emerald-400/40',
    text: 'text-emerald-200',
    center: 'bg-emerald-900/90',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'crimson-speed',
    bg: 'from-rose-600 via-red-700 to-neutral-950',
    ring: 'border-rose-400/40',
    text: 'text-rose-200',
    center: 'bg-rose-900/90',
    glow: 'rgba(225, 29, 72, 0.4)'
  },
  {
    id: 'neon-synth',
    bg: 'from-fuchsia-600 via-pink-600 to-purple-950',
    ring: 'border-fuchsia-400/40',
    text: 'text-fuchsia-200',
    center: 'bg-fuchsia-900/90',
    glow: 'rgba(217, 70, 239, 0.4)'
  },
  {
    id: 'sapphire-night',
    bg: 'from-blue-600 via-indigo-700 to-slate-950',
    ring: 'border-blue-400/40',
    text: 'text-blue-200',
    center: 'bg-blue-900/90',
    glow: 'rgba(37, 99, 235, 0.4)'
  },
  {
    id: 'golden-lux',
    bg: 'from-yellow-500 via-amber-600 to-stone-950',
    ring: 'border-yellow-400/40',
    text: 'text-yellow-200',
    center: 'bg-amber-900/90',
    glow: 'rgba(234, 179, 8, 0.4)'
  },
  {
    id: 'teal-wave',
    bg: 'from-teal-400 via-cyan-600 to-emerald-950',
    ring: 'border-teal-400/40',
    text: 'text-teal-200',
    center: 'bg-teal-900/90',
    glow: 'rgba(20, 184, 166, 0.4)'
  },
  {
    id: 'hyper-coral',
    bg: 'from-orange-500 via-rose-600 to-violet-950',
    ring: 'border-orange-400/40',
    text: 'text-orange-200',
    center: 'bg-orange-900/90',
    glow: 'rgba(249, 115, 22, 0.4)'
  },
  {
    id: 'indigo-matrix',
    bg: 'from-indigo-600 via-blue-700 to-cyan-950',
    ring: 'border-indigo-400/40',
    text: 'text-indigo-200',
    center: 'bg-indigo-900/90',
    glow: 'rgba(99, 102, 241, 0.4)'
  },
  {
    id: 'velvet-ruby',
    bg: 'from-pink-600 via-rose-700 to-stone-950',
    ring: 'border-pink-400/40',
    text: 'text-pink-200',
    center: 'bg-rose-900/90',
    glow: 'rgba(244, 63, 94, 0.4)'
  }
];

export const AlbumArtwork: React.FC<AlbumArtworkProps> = ({
  track,
  url,
  title: propTitle,
  artist: propArtist,
  format: propFormat,
  showFormatBadge = false,
  allowZoom = false,
  showVinyl = false,
  isPlaying = false,
  size = 'md',
  className = '',
  rounded = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [discoveredArtworkUrl, setDiscoveredArtworkUrl] = useState<string | null>(null);
  const [discoveredFormat, setDiscoveredFormat] = useState<ImageFormat>('JPG');

  // Derive title, artist, format and image URL from track or props
  const trackTitle = track?.title || propTitle || 'AudioCar Studio';
  const trackArtist = track?.artist || propArtist || 'Google Drive';
  const rawUrl = url || track?.thumbnailUrl || null;
  const activeFormat = propFormat || track?.artworkFormat || discoveredFormat || 'JPG';

  // Look up folder artwork if track doesn't have an embedded thumbnail
  useEffect(() => {
    let isMounted = true;

    if (rawUrl) {
      setHasError(false);
      return;
    }

    if (track?.folderId && track.folderId !== 'root') {
      driveService.discoverFolderArtwork(track.folderId).then((art) => {
        if (isMounted && art && art.url) {
          setDiscoveredArtworkUrl(art.url);
          setDiscoveredFormat(art.format || 'JPG');
          setHasError(false);
        }
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [track?.folderId, rawUrl]);

  // Compute initials for the cover art monogram
  const initials = useMemo(() => {
    if (trackArtist && trackArtist !== 'Artista Desconocido' && trackArtist !== 'Google Drive') {
      const parts = trackArtist.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
      return (trackArtist[0] || 'A').toUpperCase();
    }
    const titleParts = trackTitle.trim().split(/\s+/).filter(Boolean);
    if (titleParts.length >= 2) return (titleParts[0][0] + titleParts[1][0]).toUpperCase();
    if (titleParts.length === 1 && titleParts[0].length >= 2) return titleParts[0].slice(0, 2).toUpperCase();
    return (trackTitle[0] || 'M').toUpperCase();
  }, [trackArtist, trackTitle]);

  // Deterministic vibrant color theme based on title & artist
  const theme = useMemo(() => {
    const key = `${trackArtist}_${trackTitle}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % TRACK_THEMES.length;
    return TRACK_THEMES[idx];
  }, [trackArtist, trackTitle]);

  const sizeClasses: Record<string, string> = {
    xs: 'w-8 h-8 min-w-[32px]',
    sm: 'w-10 h-10 min-w-[40px]',
    md: 'w-14 h-14 sm:w-16 sm:h-16 min-w-[56px]',
    lg: 'w-24 h-24 min-w-[96px]',
    xl: 'w-36 h-36 min-w-[144px]',
    fluid: 'w-full h-full aspect-square',
    full: 'w-full h-full aspect-square'
  };

  const badgeSizes: Record<string, string> = {
    xs: 'text-[6px] px-1 py-0.2',
    sm: 'text-[7px] px-1 py-0.2',
    md: 'text-[8px] px-1.5 py-0.5',
    lg: 'text-[9px] px-2 py-0.5',
    xl: 'text-xs px-2.5 py-1',
    fluid: 'text-[8px] px-1.5 py-0.5',
    full: 'text-xs px-2.5 py-1'
  };

  const activeImage = (!hasError && (rawUrl || discoveredArtworkUrl)) || null;
  const roundedClass = rounded
    ? size === 'xs' || size === 'sm'
      ? 'rounded-xl'
      : 'rounded-2xl'
    : 'rounded-none';

  return (
    <div
      className={`relative select-none overflow-hidden shrink-0 shadow-md ${roundedClass} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{
        boxShadow: !activeImage ? `0 4px 16px -4px ${theme.glow}` : undefined
      }}
    >
      {activeImage ? (
        <img
          src={activeImage}
          alt={`${trackTitle} - ${trackArtist}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover shadow-inner"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        /* Dynamic Colorful Vinyl Artwork for Tracks */
        <div
          className={`w-full h-full bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center p-1 relative overflow-hidden border ${theme.ring} shadow-inner`}
        >
          {/* Subtle Concentric Vinyl Grooves Pattern */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, transparent 20%, rgba(255,255,255,0.18) 21%, transparent 22%, transparent 45%, rgba(255,255,255,0.18) 46%, transparent 47%, transparent 70%, rgba(255,255,255,0.18) 71%, transparent 72%)'
            }}
          />

          {/* Central Mini-Vinyl Disc */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div
              className={`rounded-full ${theme.center} border border-white/40 flex items-center justify-center shadow-lg transition-transform ${
                isPlaying ? 'animate-spin [animation-duration:10s]' : ''
              } ${
                size === 'xs'
                  ? 'w-5 h-5'
                  : size === 'sm'
                  ? 'w-7 h-7'
                  : size === 'md'
                  ? 'w-10 h-10 sm:w-11 sm:h-11'
                  : size === 'lg'
                  ? 'w-16 h-16'
                  : size === 'xl'
                  ? 'w-24 h-24'
                  : 'w-10 h-10'
              }`}
            >
              <span
                className={`font-mono font-black tracking-wider text-white drop-shadow-md ${
                  size === 'xs'
                    ? 'text-[7px]'
                    : size === 'sm'
                    ? 'text-[9px]'
                    : size === 'md'
                    ? 'text-xs'
                    : size === 'lg'
                    ? 'text-base'
                    : size === 'xl'
                    ? 'text-2xl'
                    : 'text-xs'
                }`}
              >
                {initials}
              </span>
            </div>

            {/* Micro Music Note Icon (for sizes md and up) */}
            {size !== 'xs' && size !== 'sm' && (
              <Music className={`w-2.5 h-2.5 ${theme.text} mt-0.5 opacity-90 drop-shadow`} />
            )}
          </div>
        </div>
      )}

      {/* Format Badge (JPG / PNG / GIF / WEBP) */}
      {showFormatBadge && activeImage && (
        <div
          className={`absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-white font-mono font-bold tracking-wider rounded-md border border-white/20 shadow-sm ${badgeSizes[size] || badgeSizes.md}`}
        >
          {activeFormat}
        </div>
      )}
    </div>
  );
};
