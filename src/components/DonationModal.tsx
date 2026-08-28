import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Copy, 
  Check, 
  X, 
  ExternalLink,
  QrCode,
  Lock,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { dbService } from '../services/dbService';

interface DonationModalProps {
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ onClose }) => {
  // Revolut official link provided by user (@csar1rzy4)
  const [revolutLink, setRevolutLink] = useState('https://revolut.me/csar1rzy4');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      const savedLink = await dbService.getSetting<string>('donation_link', 'https://revolut.me/csar1rzy4');
      setRevolutLink(savedLink);
    };
    loadDetails();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(revolutLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // High-res QR code generator pointing directly to https://revolut.me/csar1rzy4
  const revolutQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    revolutLink
  )}&margin=12&color=ffffff&bgcolor=111111`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-gradient-to-b from-neutral-900 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black font-black flex items-center justify-center shadow-lg text-xl tracking-tighter">
              <span>R</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Invitar a un Café</span>
                <span className="text-[10px] font-mono font-bold bg-white text-black px-2 py-0.5 rounded-full uppercase">
                  Revolut
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Aporte voluntario 100% privado y seguro
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hitbox-48 w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* Privacy badge */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2.5 text-xs text-neutral-300">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pago seguro a través de Revolut (sin mostrar datos privados)</span>
          </div>

          {/* QR Box with Revolut 'R' badge in center */}
          <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center gap-4">
            <div className="relative p-3.5 bg-[#111111] rounded-2xl border border-neutral-700/80 shadow-2xl flex flex-col items-center justify-center">
              <div className="relative">
                <img
                  src={revolutQrUrl}
                  alt="Código QR Revolut @csar1rzy4"
                  className="w-44 h-44 rounded-xl object-contain"
                  loading="eager"
                />
                
                {/* Floating R logo in center of QR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-xl bg-black border border-neutral-600 shadow-2xl flex items-center justify-center">
                    <span className="text-white font-black text-base tracking-tighter">R</span>
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-mono text-neutral-400 mt-2.5 flex items-center gap-1.5 font-bold">
                <QrCode className="w-3.5 h-3.5 text-white" />
                <span>Escanea desde tu móvil</span>
              </span>
            </div>

            {/* Direct Link container */}
            <div className="w-full p-3 bg-black/80 rounded-xl border border-neutral-800 flex items-center justify-between gap-2">
              <div className="truncate text-left">
                <div className="text-[10px] uppercase font-mono text-neutral-500 font-bold">Enlace Revolut</div>
                <div className="text-xs font-mono text-white font-bold truncate">revolut.me/csar1rzy4</div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="hitbox-48 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
                  title="Copiar enlace"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
                </button>

                <a
                  href={revolutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hitbox-48 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Supported payment methods badges */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <CreditCard className="w-4 h-4 text-neutral-400" />
              Métodos compatibles:
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Revolut Pay</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Apple Pay</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Google Pay</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Tarjeta</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/90 bg-neutral-950/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span>¡Muchas gracias por apoyar AudioCar!</span>
          </div>

          <button
            onClick={onClose}
            className="hitbox-56 px-7 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-white/20"
          >
            <Check className="w-4 h-4 text-black stroke-[3]" />
            <span>Aceptar y Cerrar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
