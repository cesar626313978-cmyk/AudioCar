import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Play,
  FolderTree,
  Sliders,
  Cloud,
  Layers,
  Sparkles,
  CheckCircle2,
  Volume2,
  HardDrive,
  Sun,
  Moon,
  Zap,
  Coffee,
  ArrowRight,
  ShieldCheck,
  Music,
  Compass,
  Headphones,
  RotateCcw,
  Shuffle,
  Repeat,
  Radio
} from 'lucide-react';
import {
  SkeuomorphicCloudIcon,
  SkeuomorphicVinylIcon,
  SkeuomorphicFolderIcon,
  SkeuomorphicEqualizerIcon,
  SkeuomorphicSunMoonIcon,
  SkeuomorphicCoffeeIcon,
  SkeuomorphicHeartIcon,
  SkeuomorphicHelpIcon
} from './SkeuomorphicIcons';

interface HelpModalProps {
  onClose: () => void;
  onOpenCloud: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  onClose,
  onOpenCloud,
  onOpenLibrary,
  onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'playback' | 'cloud' | 'dsp'>('quickstart');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* 1. Header Bar */}
      <div className="h-16 px-4 md:px-8 bg-neutral-950/95 border-b border-neutral-800 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Compass className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Guía de Inicio y Ayuda Rápida</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Paso a Paso
              </span>
            </h2>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Todo lo que necesitas saber para reproducir tu música y sacarle el máximo partido en tu coche o navegador.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:flex items-center bg-neutral-900 rounded-full p-1 border border-neutral-800">
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quickstart'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              1. Empezar
            </button>
            <button
              onClick={() => setActiveTab('playback')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'playback'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              2. Modos y Reproducción
            </button>
            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cloud'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              3. Google Drive / Nube
            </button>
            <button
              onClick={() => setActiveTab('dsp')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dsp'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              4. Audio & LED
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Cerrar Guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center justify-around bg-neutral-900/90 border-b border-neutral-800 px-2 py-2 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('quickstart')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
            activeTab === 'quickstart' ? 'bg-amber-400 text-black' : 'text-neutral-400'
          }`}
        >
          🚀 Empezar
        </button>
        <button
          onClick={() => setActiveTab('playback')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
            activeTab === 'playback' ? 'bg-amber-400 text-black' : 'text-neutral-400'
          }`}
        >
          🎛️ Opciones
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
            activeTab === 'cloud' ? 'bg-amber-400 text-black' : 'text-neutral-400'
          }`}
        >
          ☁️ Google Drive
        </button>
        <button
          onClick={() => setActiveTab('dsp')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
            activeTab === 'dsp' ? 'bg-amber-400 text-black' : 'text-neutral-400'
          }`}
        >
          🎚️ Ecualizador
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-6xl w-full mx-auto space-y-8">
        
        {/* Navigation Icon Bar Cheat-sheet */}
        <section className="bg-[#111] border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Guía Visual de Botones Superiores (Barra Superior)
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mb-5">
            Cada botón superior te da acceso directo a una función esencial sin interrumpir la música:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Cloud */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicCloudIcon />
              </div>
              <span className="text-xs font-bold text-sky-400">1. Nube</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Google Drive & sincronización</span>
            </div>

            {/* 2. Vinyl */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicVinylIcon isSpinning={false} />
              </div>
              <span className="text-xs font-bold text-amber-400">2. Cockpit</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Reproductor principal táctil</span>
            </div>

            {/* 3. Folder */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicFolderIcon />
              </div>
              <span className="text-xs font-bold text-amber-300">3. Biblioteca</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Carpetas, pistas y listas</span>
            </div>

            {/* 4. Equalizer */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicEqualizerIcon />
              </div>
              <span className="text-xs font-bold text-emerald-400">4. Ecualizador</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">DSP 10 bandas & Presets</span>
            </div>

            {/* 5. Theme */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicSunMoonIcon />
              </div>
              <span className="text-xs font-bold text-amber-200">5. Día/Noche</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Cambia el brillo y contraste</span>
            </div>

            {/* 6. Coffee */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicCoffeeIcon />
              </div>
              <span className="text-xs font-bold text-orange-400">6. Café</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Apoya el desarrollo libre</span>
            </div>

            {/* 7. Heart */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicHeartIcon />
              </div>
              <span className="text-xs font-bold text-sky-300">7. Contacto</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Soporte, reporte y feedback</span>
            </div>

            {/* 8. Help */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/60 border border-neutral-800/80 ring-1 ring-amber-400/40">
              <div className="w-10 h-10 mb-2">
                <SkeuomorphicHelpIcon isActive={true} />
              </div>
              <span className="text-xs font-bold text-amber-400">8. Ayuda</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">Esta guía paso a paso</span>
            </div>
          </div>
        </section>

        {/* TAB 1: QUICKSTART STEP-BY-STEP */}
        {activeTab === 'quickstart' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-l-2 border-amber-400 pl-4">
              <h3 className="text-xl font-black text-white">¿Cómo empezar en 3 sencillos pasos?</h3>
              <p className="text-sm text-neutral-400">
                AudioCar está diseñado para funcionar al instante, tanto si quieres probarlo de inmediato como si deseas escuchar tu colección completa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Paso 1 */}
              <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl font-black text-neutral-800/80 font-mono">01</div>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Opción A: Escuchar Demo</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    La app incluye <strong className="text-neutral-200">6 canciones de prueba precargadas</strong> en memoria para probar el ecualizador DSP, los modos de mezcla y la iluminación LED inmediatamente sin configurar nada.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Reproducir Ahora
                </button>
              </div>

              {/* Paso 2 */}
              <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl font-black text-neutral-800/80 font-mono">02</div>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Opción B: Tu Google Drive</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    Conecta tu cuenta de Google. Crea una carpeta llamada <code className="text-amber-300 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">/mimusica</code> o escanea cualquier carpeta con tus archivos MP3, FLAC o WAV.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCloud();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  Conectar Google Drive
                </button>
              </div>

              {/* Paso 3 */}
              <div className="bg-[#121212] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl font-black text-neutral-800/80 font-mono">03</div>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                    <FolderTree className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Explorar y Organizar</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    En la <strong className="text-neutral-200">Biblioteca</strong> puedes navegar por carpetas, buscar canciones por título o artista, y reproducir discos enteros de un toque.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenLibrary();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  Abrir Biblioteca
                </button>
              </div>

            </div>

            {/* Quick Tips Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-300 space-y-1">
                <strong className="text-amber-300 font-semibold block">Consejo para vehículos y pantallas táctiles:</strong>
                <p>
                  El modo <strong className="text-white">Cockpit</strong> activa pantalla completa automáticamente. Todos los botones táctiles tienen un tamaño generoso de 48px+ para que puedas cambiar de pista o pausar con máxima seguridad sin apartar la atención del camino.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYBACK CONTROLS & OPTIONS */}
        {activeTab === 'playback' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-l-2 border-amber-400 pl-4">
              <h3 className="text-xl font-black text-white">Opciones y Modos de Reproducción</h3>
              <p className="text-sm text-neutral-400">
                Control total sobre el orden de las pistas, bucles, transiciones fluidas y mezcla sin pausas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Repetición */}
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Modos de Repetición (Repeat)</h4>
                    <span className="text-[11px] text-neutral-500">Haz clic en el icono de repetición para alternar:</span>
                  </div>
                </div>
                <ul className="text-xs text-neutral-300 space-y-2 pl-2">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-600"></span>
                    <span><strong className="text-white">Desactivado (Off):</strong> Se detiene al terminar la lista.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span><strong className="text-white">Repetir Todo (All):</strong> Vuelve al inicio de la lista al terminar.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span><strong className="text-white">Repetir 1 (One [1]):</strong> Reproduce en bucle infinito la canción actual.</span>
                  </li>
                </ul>
              </div>

              {/* Modo Aleatorio */}
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                    <Shuffle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Modo Aleatorio Inteligente (Shuffle)</h4>
                    <span className="text-[11px] text-neutral-500">Mezcla matemática con memoria de historial</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Cuando activas <strong className="text-sky-400">Shuffle</strong>, la cola se baraja de manera no repetitiva, asegurando que escuches todas las pistas antes de repetir cualquiera de ellas.
                </p>
              </div>

              {/* Crossfade */}
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Crossfade (Fundido entre canciones)</h4>
                    <span className="text-[11px] text-neutral-500">Transiciones suaves sin silencios incómodos</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Configura de 1 a 12 segundos de fundido cruzado en el menú de ajustes. La pista entrante aumentará de volumen mientras la saliente disminuye suavemente.
                </p>
              </div>

              {/* Precarga & Anti-corte */}
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-purple-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Precarga Doble Buffer</h4>
                    <span className="text-[11px] text-neutral-500">Protección contra pérdidas de cobertura en carretera</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  El motor de audio precarga la siguiente canción en segundo plano mientras escuchas la actual, garantizando que nunca haya cortes al pasar por túneles o zonas con poca señal 4G/5G.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE DRIVE INSTRUCTIONS */}
        {activeTab === 'cloud' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-l-2 border-amber-400 pl-4">
              <h3 className="text-xl font-black text-white">Cómo Organizar tu Música en Google Drive</h3>
              <p className="text-sm text-neutral-400">
                La forma más rápida y ordenada de tener tu colección siempre lista en cualquier vehículo.
              </p>
            </div>

            <div className="space-y-4">
              
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Crea la carpeta en tu Google Drive</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    En tu unidad de Drive crea una carpeta llamada <code className="text-amber-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-neutral-700">mimusica</code> o <code className="text-amber-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-neutral-700">Music</code>.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Organiza por Artistas / Álbumes (Opcional)</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Puedes meter subcarpetas (ej. <code className="text-neutral-300">/mimusica/Rock 80s/</code> o <code className="text-neutral-300">/mimusica/Daft Punk/Discovery/</code>). AudioCar leerá automáticamente las portadas incrustadas, títulos de canciones y nombres de artista.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Sincroniza desde el botón Nube</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Presiona el botón <strong className="text-sky-400">Nube (Icono 1)</strong>, autoriza tu cuenta con un toque seguro y la aplicación indexará todo al instante en una base de datos local ultra rápida.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCloud();
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 text-black font-bold text-xs uppercase hover:bg-sky-400 transition-colors shrink-0"
                >
                  Conectar Ahora
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: DSP EQUALIZER & LED AMBIENT */}
        {activeTab === 'dsp' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-l-2 border-amber-400 pl-4">
              <h3 className="text-xl font-black text-white">Ecualizador DSP & Tira LED Ambiente</h3>
              <p className="text-sm text-neutral-400">
                Personaliza la acústica para los altavoces de tu coche y el color de iluminación ambiental del salpicadero.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Presets Acústicos de Estudio</h4>
                    <span className="text-[11px] text-neutral-500">Ajustes pre-calibrados por género</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  En el <strong className="text-emerald-400">Ecualizador (Icono 4)</strong> puedes elegir perfiles rápidos como <em>Graves Potentes (Bass Boost)</em>, <em>Claridad Vocal</em>, <em>Electrónica / Club</em> o afinar individualmente las 10 bandas de frecuencia (-12dB a +12dB).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#121212] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Iluminación LED Neón & Reactiva</h4>
                    <span className="text-[11px] text-neutral-500">Sincronizada con el ritmo de la música</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Elige entre colores como <em>Rojo Deportivo</em>, <em>Cian Neón</em>, <em>Ámbar Solar</em> o el <em>Espectro Dinámico RGB</em> con efecto pulso que reacciona visualmente cuando la música está sonando.
                </p>
              </div>

            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                Abrir Ecualizador DSP
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 3. Bottom Action Bar */}
      <div className="h-18 px-4 md:px-8 bg-neutral-950/95 border-t border-neutral-800 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Tu música se procesa 100% de forma privada y local</span>
        </div>

        <button
          onClick={onClose}
          className="hitbox-48 px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Entendido! Volver al Reproductor</span>
        </button>
      </div>

    </div>
  );
};
