import React from 'react';

interface SkeuomorphicIconProps {
  className?: string;
  isActive?: boolean;
  isSpinning?: boolean;
  statusBadge?: boolean;
}

/**
 * Common Skeuomorphic Golden Bezel & Recessed Dark Core
 */
const GoldBezelBase: React.FC<{ children: React.ReactNode; idPrefix: string; isActive?: boolean }> = ({
  children,
  idPrefix,
  isActive
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full drop-shadow-md select-none pointer-events-none transition-transform duration-200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Outer Gold Ring Gradients */}
        <linearGradient id={`${idPrefix}_goldOuter`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="25%" stopColor="#D4A446" />
          <stop offset="50%" stopColor="#8C5E14" />
          <stop offset="75%" stopColor="#F5D061" />
          <stop offset="100%" stopColor="#6E440A" />
        </linearGradient>

        <linearGradient id={`${idPrefix}_goldInner`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FFEAA7" />
          <stop offset="35%" stopColor="#B38029" />
          <stop offset="70%" stopColor="#F7DB70" />
          <stop offset="100%" stopColor="#543306" />
        </linearGradient>

        {/* Deep Dark Metallic Concave Background */}
        <radialGradient id={`${idPrefix}_darkCore`} cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#222222" />
          <stop offset="60%" stopColor="#121212" />
          <stop offset="90%" stopColor="#080808" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>

        {/* Inner Bezel Shadow */}
        <radialGradient id={`${idPrefix}_innerShadow`} cx="50%" cy="50%" r="50%">
          <stop offset="75%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
        </radialGradient>

        {/* Active Golden Ambient Glow Filter */}
        <filter id={`${idPrefix}_activeGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Outer Shadow */}
      <circle cx="50" cy="51" r="47" fill="#000000" opacity="0.6" filter="blur(2px)" />

      {/* Outer Metallic Gold Rim */}
      <circle cx="50" cy="50" r="47" stroke={`url(#${idPrefix}_goldOuter)`} strokeWidth="4.5" />
      <circle cx="50" cy="50" r="44.5" stroke={`url(#${idPrefix}_goldInner)`} strokeWidth="1.5" />

      {/* Recessed Dark Disc */}
      <circle cx="50" cy="50" r="43.5" fill={`url(#${idPrefix}_darkCore)`} />
      <circle cx="50" cy="50" r="43.5" fill={`url(#${idPrefix}_innerShadow)`} />

      {/* Top-Left Rim Specular Highlight Arc */}
      <path
        d="M 22 22 A 44 44 0 0 1 78 22"
        stroke="#FFF8DB"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Inner Icon Graphic */}
      <g filter={isActive ? `url(#${idPrefix}_activeGlow)` : undefined}>
        {children}
      </g>
    </svg>
  );
};

/**
 * 1. Cloud with Linked Chain (Conectar Nube / Cloud Sync)
 * Skeuomorphic neon cyan-blue glowing cloud with linked chain
 */
export const SkeuomorphicCloudIcon: React.FC<SkeuomorphicIconProps> = ({ isActive, statusBadge }) => {
  return (
    <GoldBezelBase idPrefix="cloud_icon" isActive={isActive}>
      <defs>
        <linearGradient id="cloud_neon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <filter id="cloud_glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.6  0 0 0 0 1  0 0 0 0.8 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#cloud_glow)" transform="translate(0, 1)">
        {/* Cloud Outline */}
        <path
          d="M34 58 H66 C73.7 58 80 51.7 80 44 C80 37.1 75 31.4 68.4 30.3 C66.8 21.6 59.2 15 50 15 C42.1 15 35.3 20.1 32.8 27.2 C25.6 28.1 20 34.4 20 42 C20 50.8 26.3 58 34 58 Z"
          stroke="url(#cloud_neon)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#0284c7"
          fillOpacity="0.1"
        />

        {/* Chain Link in Middle */}
        <g stroke="url(#cloud_neon)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Left link */}
          <path d="M 40 45 L 36 49 A 6 6 0 0 1 27.5 40.5 L 31.5 36.5 A 6 6 0 0 1 40 36.5" />
          {/* Right link */}
          <path d="M 60 55 L 64 51 A 6 6 0 0 0 72.5 59.5 L 68.5 63.5 A 6 6 0 0 1 60 63.5" />
          {/* Center interlocking bar */}
          <line x1="39" y1="47" x2="61" y2="53" strokeWidth="3.2" />
        </g>
      </g>

      {statusBadge && (
        <circle cx="73" cy="27" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
      )}
    </GoldBezelBase>
  );
};

/**
 * 2. Vinyl Record with Blue 3D Play Badge (Reproductor Activo)
 * Realistic grooved vinyl disc with center spindle and glossy blue play badge
 */
export const SkeuomorphicVinylIcon: React.FC<SkeuomorphicIconProps> = ({ isActive, isSpinning }) => {
  return (
    <GoldBezelBase idPrefix="vinyl_icon" isActive={isActive}>
      <defs>
        {/* Play Badge Gloss Gradient */}
        <linearGradient id="play_badge_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        <linearGradient id="vinyl_groove" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b4252" />
          <stop offset="50%" stopColor="#1e2430" />
          <stop offset="100%" stopColor="#0f131a" />
        </linearGradient>
      </defs>

      {/* Grooved Vinyl Disc */}
      <g className={isSpinning ? 'origin-center animate-spin [animation-duration:8s]' : ''}>
        {/* Vinyl Base */}
        <circle cx="50" cy="50" r="32" fill="url(#vinyl_groove)" stroke="#2b3340" strokeWidth="1.5" />

        {/* Concentric Vinyl Grooves */}
        <circle cx="50" cy="50" r="28" stroke="#4c566a" strokeWidth="0.8" opacity="0.6" strokeDasharray="3 2" />
        <circle cx="50" cy="50" r="24" stroke="#4c566a" strokeWidth="0.8" opacity="0.7" strokeDasharray="4 2" />
        <circle cx="50" cy="50" r="20" stroke="#4c566a" strokeWidth="0.8" opacity="0.6" strokeDasharray="2 3" />
        <circle cx="50" cy="50" r="16" stroke="#4c566a" strokeWidth="0.8" opacity="0.8" strokeDasharray="3 1" />

        {/* Vinyl Center Label */}
        <circle cx="50" cy="50" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="3" fill="#000000" stroke="#94a3b8" strokeWidth="1" />
        
        {/* Tiny center play indicator */}
        <polygon points="48,47 54,50 48,53" fill="#38bdf8" />
      </g>

      {/* 3D Glossy Blue Play Badge (Lower-Right Foreground) */}
      <g transform="translate(56, 56) scale(0.9)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">
        {/* Triangular Badge */}
        <polygon
          points="0,0 22,12 0,24"
          fill="url(#play_badge_grad)"
          stroke="#bae6fd"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Inner highlight */}
        <polygon
          points="2,3 18,12 2,21"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.7"
        />
      </g>
    </GoldBezelBase>
  );
};

/**
 * 3. Glowing Golden Folder with Musical Note (Biblioteca / Explorador)
 * Golden outlined folder with musical eighth notes
 */
export const SkeuomorphicFolderIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="folder_icon" isActive={isActive}>
      <defs>
        <linearGradient id="gold_folder_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="80%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        <filter id="gold_folder_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.8  0 0 0 0 0.2  0 0 0 0.8 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#gold_folder_glow)">
        {/* Folder tab & body */}
        <path
          d="M 24 35 L 38 35 L 44 41 L 70 41 A 4 4 0 0 1 74 45 L 74 65 A 4 4 0 0 1 70 69 L 24 69 A 4 4 0 0 1 20 65 L 20 39 A 4 4 0 0 1 24 35 Z"
          stroke="url(#gold_folder_grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Front flap accent */}
        <path
          d="M 20 48 L 74 48"
          stroke="url(#gold_folder_grad)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Double Music Note Overlap */}
        <g stroke="url(#gold_folder_grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="url(#gold_folder_grad)">
          {/* Note Heads */}
          <circle cx="56" cy="69" r="4.5" />
          <circle cx="70" cy="65" r="4.5" />
          {/* Stems */}
          <line x1="60.5" y1="69" x2="60.5" y2="48" strokeWidth="3" fill="none" />
          <line x1="74.5" y1="65" x2="74.5" y2="44" strokeWidth="3" fill="none" />
          {/* Top Beam */}
          <line x1="59.5" y1="48" x2="75.5" y2="44" strokeWidth="4" fill="none" />
        </g>
      </g>
    </GoldBezelBase>
  );
};

/**
 * 4. Golden Equalizer / DSP Sliders (Ajustes de Audio y Ecualizador)
 * 3 vertical gold slider tracks with circular fader knobs
 */
export const SkeuomorphicEqualizerIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="eq_icon" isActive={isActive}>
      <defs>
        <linearGradient id="slider_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="30%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        <linearGradient id="knob_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>

        <filter id="eq_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.8  0 0 0 0 0.3  0 0 0 0.7 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#eq_glow)">
        {/* Track 1 (Left) */}
        <line x1="32" y1="24" x2="32" y2="76" stroke="url(#slider_gold)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Knob 1 (Upper position) */}
        <circle cx="32" cy="40" r="6.5" fill="url(#knob_gold)" stroke="#fff" strokeWidth="1" />
        <circle cx="32" cy="40" r="3.2" fill="#422006" />

        {/* Track 2 (Middle) */}
        <line x1="50" y1="24" x2="50" y2="76" stroke="url(#slider_gold)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Knob 2 (Lower position) */}
        <circle cx="50" cy="60" r="6.5" fill="url(#knob_gold)" stroke="#fff" strokeWidth="1" />
        <circle cx="50" cy="60" r="3.2" fill="#422006" />

        {/* Track 3 (Right) */}
        <line x1="68" y1="24" x2="68" y2="76" stroke="url(#slider_gold)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Knob 3 (Mid-high position) */}
        <circle cx="68" cy="38" r="6.5" fill="url(#knob_gold)" stroke="#fff" strokeWidth="1" />
        <circle cx="68" cy="38" r="3.2" fill="#422006" />
      </g>
    </GoldBezelBase>
  );
};

/**
 * 5. Sun with Face & Crescent Moon (Modo Día / Noche / Brillo)
 * Sculpted golden sun face on left paired with crescent moon on right
 */
export const SkeuomorphicSunMoonIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="sunmoon_icon" isActive={isActive}>
      <defs>
        <linearGradient id="gold_celestial" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="25%" stopColor="#fed7aa" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id="moon_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Sun on Left Side */}
      <g transform="translate(36, 50) scale(0.95)">
        {/* Radiating Sun Beams */}
        <g stroke="url(#gold_celestial)" strokeWidth="2.8" strokeLinecap="round">
          {/* Diagonal rays */}
          <line x1="-16" y1="-16" x2="-23" y2="-23" />
          <line x1="-16" y1="16" x2="-23" y2="23" />
          <line x1="0" y1="-21" x2="0" y2="-28" />
          <line x1="0" y1="21" x2="0" y2="28" />
          <line x1="-21" y1="0" x2="-28" y2="0" />
          <line x1="15" y1="-15" x2="21" y2="-21" />
          <line x1="15" y1="15" x2="21" y2="21" />
        </g>

        {/* Sun Core Disc */}
        <circle cx="0" cy="0" r="16" fill="url(#gold_celestial)" stroke="#fffbeb" strokeWidth="1" />

        {/* Serene Sun Face Features */}
        <circle cx="-5.5" cy="-3.5" r="1.8" fill="#78350f" />
        <circle cx="5.5" cy="-3.5" r="1.8" fill="#78350f" />
        {/* Nose */}
        <path d="M 0 -1 L -1.5 2.5 L 1.5 2.5" stroke="#92400e" strokeWidth="1" fill="none" />
        {/* Smiling Mouth */}
        <path d="M -6 6 Q 0 10 6 6" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>

      {/* Crescent Moon on Right Side */}
      <g transform="translate(68, 50) scale(0.9)">
        <path
          d="M 2 -18 A 20 20 0 0 1 12 0 A 20 20 0 0 1 2 18 A 17 17 0 0 0 7 0 A 17 17 0 0 0 2 -18 Z"
          fill="url(#moon_gold)"
          stroke="#fffbeb"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    </GoldBezelBase>
  );
};

/**
 * 6. Steaming Porcelain Espresso Cup (Un Café / Apoyo al Proyecto)
 * Antique white porcelain cup with ornate gold filigree and rising aromatic steam swirls
 */
export const SkeuomorphicCoffeeIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="coffee_icon" isActive={isActive}>
      <defs>
        <linearGradient id="cup_porcelain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#d1d5db" />
        </linearGradient>

        <linearGradient id="gold_filigree" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        <linearGradient id="steam_gold" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rising Golden Steam Swirls */}
      <g stroke="url(#steam_gold)" strokeWidth="2.4" strokeLinecap="round" fill="none">
        {/* Left Steam Stream */}
        <path d="M 44 42 Q 40 34 46 27 Q 52 20 45 15" />
        {/* Center Steam Stream */}
        <path d="M 50 40 Q 56 32 49 24 Q 44 17 52 12" strokeWidth="2.8" />
        {/* Right Steam Stream */}
        <path d="M 56 42 Q 62 35 56 28 Q 50 21 57 16" />
      </g>

      {/* Porcelain Saucer */}
      <ellipse cx="50" cy="73" rx="25" ry="5.5" fill="url(#cup_porcelain)" stroke="url(#gold_filigree)" strokeWidth="1.5" />
      <ellipse cx="50" cy="73" rx="17" ry="3.5" fill="none" stroke="url(#gold_filigree)" strokeWidth="1" />

      {/* Cup Body */}
      <path
        d="M 33 46 L 67 46 C 66 62 60 70 50 70 C 40 70 34 62 33 46 Z"
        fill="url(#cup_porcelain)"
        stroke="url(#gold_filigree)"
        strokeWidth="1.8"
      />

      {/* Cup Gold Rim & Top Oval */}
      <ellipse cx="50" cy="46" rx="17" ry="4" fill="#3e2723" stroke="url(#gold_filigree)" strokeWidth="1.8" />
      <ellipse cx="50" cy="46" rx="14" ry="2.8" fill="#1b0000" />

      {/* Ornate Gold Filigree on Cup Face */}
      <g stroke="url(#gold_filigree)" strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M 38 54 Q 44 60 50 54 Q 56 60 62 54" />
        <circle cx="50" cy="59" r="1.5" fill="url(#gold_filigree)" />
      </g>

      {/* Ornate Cup Handle */}
      <path
        d="M 66 49 C 76 49 76 64 63 65"
        fill="none"
        stroke="url(#gold_filigree)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </GoldBezelBase>
  );
};

/**
 * 7. Glowing Translucent Cyan Heart with Silhouette (Contacto / Feedback)
 * Luminous glass heart with white/cyan user silhouette
 */
export const SkeuomorphicHeartIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="heart_icon" isActive={isActive}>
      <defs>
        <linearGradient id="heart_glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.7" />
          <stop offset="80%" stopColor="#0284c7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
        </linearGradient>

        <filter id="heart_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.9  0 0 0 0 1  0 0 0 0.8 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#heart_glow)">
        {/* Glass Heart Shape */}
        <path
          d="M 50 74 C 26 57 20 44 20 34 C 20 23 28 17 37 17 C 43 17 47 21 50 25 C 53 21 57 17 63 17 C 72 17 80 23 80 34 C 80 44 74 57 50 74 Z"
          fill="url(#heart_glass)"
          stroke="#e0f2fe"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Specular Top-Left Glass Reflection */}
        <path
          d="M 26 31 C 26 25 30 22 35 22 C 38 22 41 24 43 27"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* Glowing User Silhouette in Heart Core */}
        <g fill="#ffffff" opacity="0.95">
          {/* User Head */}
          <circle cx="50" cy="40" r="5.5" />
          {/* User Shoulders / Torso */}
          <path d="M 39 57 C 39 49 44 48 50 48 C 56 48 61 49 61 57 Z" />
        </g>
      </g>
    </GoldBezelBase>
  );
};

/**
 * 8. Skeuomorphic Lifebuoy / Help Compass Icon (Guía & Ayuda de Inicio)
 * Luminous gold bezel with an automotive/nautical lifebuoy ring & glowing question spark
 */
export const SkeuomorphicHelpIcon: React.FC<SkeuomorphicIconProps> = ({ isActive }) => {
  return (
    <GoldBezelBase idPrefix="help_icon" isActive={isActive}>
      <defs>
        {/* Glow & 3D Shading for Help Lifebuoy */}
        <linearGradient id="help_ring_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        <linearGradient id="help_gold_bands" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        <radialGradient id="help_core_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <filter id="help_glow_fx" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.7  0 0 0 0 1  0 0 0 0.8 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#help_glow_fx)">
        {/* Inner ambient glow */}
        <circle cx="50" cy="50" r="28" fill="url(#help_core_glow)" />

        {/* Outer Torus Ring / Lifebuoy */}
        <circle
          cx="50"
          cy="50"
          r="26"
          fill="none"
          stroke="url(#help_ring_grad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* 4 Gold Nautical / Automotive Retaining Bands */}
        {/* Top band */}
        <rect x="47" y="18" width="6" height="6" rx="1.5" fill="url(#help_gold_bands)" stroke="#78350f" strokeWidth="0.5" />
        {/* Bottom band */}
        <rect x="47" y="76" width="6" height="6" rx="1.5" fill="url(#help_gold_bands)" stroke="#78350f" strokeWidth="0.5" />
        {/* Left band */}
        <rect x="18" y="47" width="6" height="6" rx="1.5" fill="url(#help_gold_bands)" stroke="#78350f" strokeWidth="0.5" />
        {/* Right band */}
        <rect x="76" y="47" width="6" height="6" rx="1.5" fill="url(#help_gold_bands)" stroke="#78350f" strokeWidth="0.5" />

        {/* Inner Question Mark "?" in High Contrast White/Gold */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="0.8"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
        >
          ?
        </text>

        {/* Top Specular Arc */}
        <path
          d="M 32 30 A 24 24 0 0 1 68 30"
          stroke="#bae6fd"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </g>
    </GoldBezelBase>
  );
};

