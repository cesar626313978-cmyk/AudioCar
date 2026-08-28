import React, { useState } from 'react';
import { 
  Download, 
  Disc3, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

export const LogoDownloadHelper: React.FC = () => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrivacyUrl, setCopiedPrivacyUrl] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  // Convert the embedded SVG directly into a high-res 512x512 PNG for Google Cloud Console upload
  const downloadPngLogo = () => {
    setIsExportingPng(true);
    try {
      const svgElement = document.getElementById('audiocar-official-svg-asset');
      if (!svgElement) return;

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);

      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(image, 0, 0, 512, 512);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = 'audiocar-logo-512x512.png';
          downloadLink.href = pngUrl;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        setIsExportingPng(false);
      };
      image.src = blobURL;
    } catch (e) {
      console.error('Error generating PNG:', e);
      setIsExportingPng(false);
    }
  };

  const privacyUrl = window.location.origin + '/privacy.html';

  const handleCopyPrivacyUrl = () => {
    navigator.clipboard.writeText(privacyUrl);
    setCopiedPrivacyUrl(true);
    setTimeout(() => setCopiedPrivacyUrl(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 1. Política de Privacidad Box */}
      <div className="p-5 rounded-3xl bg-[#0e0e12] border border-neutral-800 space-y-3.5 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Vínculo a la Política de Privacidad</h4>
              <p className="text-xs text-neutral-400">Requerido por Google Cloud Console (OAuth)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
            Listo
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/80 p-3.5 rounded-2xl border border-neutral-800">
          <div className="font-mono text-xs text-cyan-300 truncate w-full sm:w-auto">
            {privacyUrl}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleCopyPrivacyUrl}
              className="hitbox-48 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {copiedPrivacyUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrivacyUrl ? '¡Copiado!' : 'Copiar Enlace'}</span>
            </button>

            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hitbox-48 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Logo Oficial Box */}
      <div className="p-5 rounded-3xl bg-[#0e0e12] border border-neutral-800 space-y-4 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Disc3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Logo Oficial de AudioCar (512x512)</h4>
              <p className="text-xs text-neutral-400">Listo para subir a Google Cloud Console</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
            HD 512x512
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/70 p-4 rounded-2xl border border-neutral-800/80">
          {/* Visual Live SVG Rendering for Download/Preview */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/80 shrink-0">
            <svg
              id="audiocar-official-svg-asset"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="prevBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0a0a0c" />
                  <stop offset="50%" stopColor="#111116" />
                  <stop offset="100%" stopColor="#050507" />
                </linearGradient>
                <linearGradient id="prevAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <radialGradient id="prevCenterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Base Rounded Box */}
              <rect width="512" height="512" rx="115" fill="url(#prevBgGrad)" />
              <rect width="508" height="508" x="2" y="2" rx="113" fill="none" stroke="#26262e" strokeWidth="3" opacity="0.7" />

              {/* Ambient Glow */}
              <circle cx="256" cy="256" r="210" fill="url(#prevCenterGlow)" />

              {/* Vinyl Disc Grooves */}
              <circle cx="256" cy="256" r="185" fill="#0d0d11" stroke="#1f1f28" strokeWidth="2" />
              <circle cx="256" cy="256" r="165" fill="none" stroke="#181820" strokeWidth="1.5" opacity="0.8" />
              <circle cx="256" cy="256" r="148" fill="none" stroke="#22222d" strokeWidth="1.5" opacity="0.9" />
              <circle cx="256" cy="256" r="132" fill="none" stroke="#181820" strokeWidth="1.5" opacity="0.8" />
              <circle cx="256" cy="256" r="116" fill="none" stroke="#20202b" strokeWidth="1.5" opacity="0.9" />

              {/* Speedometer Arc */}
              <path d="M 125 345 A 155 155 0 1 1 387 345" fill="none" stroke="url(#prevAccentGrad)" strokeWidth="12" strokeLinecap="round" />

              {/* Speedometer Ticks */}
              <g stroke="#ffffff" strokeLinecap="round" opacity="0.8">
                <line x1="148" y1="310" x2="160" y2="298" strokeWidth="3" stroke="#38bdf8" />
                <line x1="175" y1="210" x2="190" y2="215" strokeWidth="3" stroke="#60a5fa" />
                <line x1="256" y1="130" x2="256" y2="148" strokeWidth="4" stroke="#818cf8" />
                <line x1="337" y1="210" x2="322" y2="215" strokeWidth="3" stroke="#a78bfa" />
                <line x1="364" y1="310" x2="352" y2="298" strokeWidth="3" stroke="#c084fc" />
              </g>

              {/* Center Disc Hub */}
              <circle cx="256" cy="256" r="82" fill="#14141b" stroke="url(#prevAccentGrad)" strokeWidth="4" />
              <circle cx="256" cy="256" r="74" fill="#08080c" />

              {/* Emblem Wave */}
              <path d="M 215 285 L 256 195 L 297 285" fill="none" stroke="url(#prevAccentGrad)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="236" y1="262" x2="236" y2="278" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
              <line x1="256" y1="245" x2="256" y2="282" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" />
              <line x1="276" y1="262" x2="276" y2="278" stroke="#c084fc" strokeWidth="5" strokeLinecap="round" />
              <circle cx="256" cy="256" r="8" fill="#ffffff" opacity="0.9" />

              {/* Typography */}
              <text x="256" y="425" textAnchor="middle" fontFamily="sans-serif" fontSize="28" fontWeight="900" letterSpacing="8" fill="#ffffff">
                AUDIOCAR
              </text>
              <text x="256" y="452" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="700" letterSpacing="4" fill="#818cf8">
                CLOUD AUDIO SYSTEM
              </text>
            </svg>
          </div>

          {/* Action buttons & details */}
          <div className="flex-1 space-y-2.5 text-xs text-neutral-300">
            <p className="leading-relaxed">
              Google Cloud exige un logotipo cuadrado en la sección <strong>Información de la marca</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={downloadPngLogo}
                disabled={isExportingPng}
                className="hitbox-48 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-black" />
                <span>{isExportingPng ? 'Generando...' : 'Descargar Logo PNG (512x512)'}</span>
              </button>

              <a
                href="/audiocar-logo.svg"
                download="audiocar-logo.svg"
                className="hitbox-48 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>SVG</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
