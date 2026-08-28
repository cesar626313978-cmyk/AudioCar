import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bug, 
  Lightbulb, 
  HelpCircle, 
  Sparkles, 
  X, 
  Check, 
  Copy, 
  Mail, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Info, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Car,
  AlertTriangle,
  History
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { DriveAuthUser, PlayerState } from '../types';

interface ContactModalProps {
  onClose: () => void;
  user: DriveAuthUser | null;
  playerState?: PlayerState;
}

type FeedbackType = 'suggestion' | 'bug' | 'review' | 'help';

interface FeedbackHistoryItem {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  date: number;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, user, playerState }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [showDiagnosticsDetail, setShowDiagnosticsDetail] = useState(false);
  
  const [submitted, setSubmitted] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [history, setHistory] = useState<FeedbackHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-detect environment diagnostics
  const [diagnostics, setDiagnostics] = useState({
    userAgent: navigator.userAgent,
    isCarScreen: window.innerWidth >= 1280,
    screenRes: `${window.innerWidth}x${window.innerHeight}`,
    driveConnected: !!user,
    currentTrack: playerState?.queue[playerState.currentTrackIndex]?.title || 'Ninguna',
    appVersion: 'AudioCar v2.4 (Cockpit Edition)'
  });

  useEffect(() => {
    // Load persisted contact details if stored
    const loadSaved = async () => {
      const savedEmail = await dbService.getSetting<string>('contact_user_email', user?.email || '');
      const savedName = await dbService.getSetting<string>('contact_user_name', user?.name || '');
      if (savedEmail && !email) setEmail(savedEmail);
      if (savedName && !name) setName(savedName);

      const savedHistory = await dbService.getSetting<FeedbackHistoryItem[]>('feedback_history', []);
      setHistory(savedHistory);
    };
    loadSaved();
  }, [user]);

  const categories = [
    {
      id: 'suggestion' as FeedbackType,
      label: 'Sugerencia',
      icon: Lightbulb,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      desc: 'Ideas de nuevas funciones o mejoras visuales'
    },
    {
      id: 'bug' as FeedbackType,
      label: 'Reportar Error',
      icon: Bug,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      desc: 'Algo no funciona, audio cortado o fallos'
    },
    {
      id: 'review' as FeedbackType,
      label: 'Opinión',
      icon: Sparkles,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      desc: 'Comentarios sobre tu experiencia de uso'
    },
    {
      id: 'help' as FeedbackType,
      label: 'Asistencia',
      icon: HelpCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      desc: 'Dudas con Google Drive o configuración'
    }
  ];

  const generateDiagnosticText = () => {
    return [
      `--- DIAGNÓSTICO DEL SISTEMA ---`,
      `Dispositivo: ${diagnostics.isCarScreen ? 'Pantalla de Coche / Cockpit' : 'Navegador Web/Móvil'}`,
      `Resolución: ${diagnostics.screenRes}`,
      `Navegador: ${diagnostics.userAgent}`,
      `Google Drive: ${diagnostics.driveConnected ? 'Conectado' : 'Desconectado'}`,
      `Pista en reproducción: ${diagnostics.currentTrack}`,
      `Versión App: ${diagnostics.appVersion}`,
      `Fecha: ${new Date().toLocaleString()}`
    ].join('\n');
  };

  const getFullMessagePayload = () => {
    let payload = `[AUDIOCAR SOPORTE & FEEDBACK]\n`;
    payload += `Tipo: ${feedbackType.toUpperCase()}\n`;
    payload += `Nombre: ${name.trim() || 'Anónimo'}\n`;
    payload += `Email: ${email.trim() || 'No especificado'}\n`;
    payload += `Asunto: ${subject.trim()}\n\n`;
    payload += `MENSAJE:\n${message.trim()}\n\n`;

    if (includeDiagnostics) {
      payload += `${generateDiagnosticText()}\n`;
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Save contact info for convenience
    if (email) await dbService.setSetting('contact_user_email', email);
    if (name) await dbService.setSetting('contact_user_name', name);

    // Save to local feedback history
    const newItem: FeedbackHistoryItem = {
      id: `fb_${Date.now()}`,
      type: feedbackType,
      subject: subject.trim() || 'Sin asunto',
      message: message.trim(),
      date: Date.now()
    };
    const updatedHistory = [newItem, ...history.slice(0, 19)];
    setHistory(updatedHistory);
    await dbService.setSetting('feedback_history', updatedHistory);

    setSubmitted(true);
  };

  const handleSendViaEmail = () => {
    const recipient = 'cesar626313978@gmail.com';
    const emailSubject = encodeURIComponent(`[AudioCar ${feedbackType.toUpperCase()}] ${subject.trim() || 'Mensaje de usuario'}`);
    const emailBody = encodeURIComponent(getFullMessagePayload());
    
    // Open default mail client
    window.location.href = `mailto:${recipient}?subject=${emailSubject}&body=${emailBody}`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getFullMessagePayload());
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0e0e0e] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-gradient-to-b from-neutral-900 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg text-white font-extrabold text-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Contacto & Asistencia</span>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase">
                  Soporte
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Comparte tus opiniones, pide funciones o reporta cualquier problema
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

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          
          {submitted ? (
            /* SUCCESS & DISPATCH SCREEN */
            <div className="py-4 space-y-5 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  ¡Mensaje preparado con éxito!
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Tu reporte ha sido registrado localmente. Puedes enviarlo directamente por correo electrónico o copiarlo al portapapeles.
                </p>
              </div>

              {/* Action Buttons for Sending */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-left">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono">
                  Opciones de entrega rápida:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendViaEmail}
                    className="hitbox-48 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar por Correo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="hitbox-48 p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedPayload ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPayload ? '¡Copiado!' : 'Copiar Texto Completo'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Destinatario de atención directa: <strong className="text-neutral-400 font-mono">cesar626313978@gmail.com</strong></span>
                </div>
              </div>

              {/* Reset / New message button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  Escribir otro mensaje o sugerencia
                </button>
              </div>
            </div>
          ) : (
            /* FEEDBACK FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Category Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2 font-mono">
                  Tipo de solicitud:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = feedbackType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeedbackType(cat.id)}
                        className={`hitbox-48 p-2.5 rounded-2xl border text-left flex flex-col items-center sm:items-start justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? `${cat.bg} ring-1 ring-white/30 text-white shadow-md scale-[1.02]`
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                        <span className="text-xs font-bold tracking-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Email inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono font-semibold text-neutral-400 block mb-1">
                    Nombre o Apodo (Opcional):
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: César / Conductor"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-semibold text-neutral-400 block mb-1">
                    Email de contacto (Para responderte):
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className="text-[11px] font-mono font-semibold text-neutral-400 block mb-1">
                  Asunto o Título breve:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    feedbackType === 'suggestion' ? 'Ej: Añadir modo aleatorio por carpetas' :
                    feedbackType === 'bug' ? 'Ej: El ecualizador se corta en pantalla completa' :
                    feedbackType === 'review' ? 'Ej: Excelente sonido en los altavoces de mi coche' :
                    'Ej: ¿Cómo añadir una carpeta compartida de Drive?'
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono font-semibold text-neutral-400">
                    Mensaje / Descripción detallada:
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {message.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    feedbackType === 'bug' 
                      ? 'Describe qué ocurrió, qué canción estaba sonando y qué dispositivo estabas usando...' 
                      : 'Escribe aquí todos tus comentarios, propuestas de mejora o consultas...'
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:border-blue-500 outline-none transition-colors resize-none custom-scrollbar leading-relaxed"
                />
              </div>

              {/* Diagnostics Toggle */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600 bg-neutral-900 border-neutral-700 cursor-pointer"
                    />
                    <span className="text-xs text-neutral-300 font-medium">
                      Adjuntar diagnóstico técnico anónimo (ayuda a solucionar fallos más rápido)
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowDiagnosticsDetail(!showDiagnosticsDetail)}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver detalles</span>
                    {showDiagnosticsDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {showDiagnosticsDetail && (
                  <div className="mt-2 p-2.5 bg-black/60 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-1 animate-in fade-in duration-150">
                    <div>• <strong>Dispositivo:</strong> {diagnostics.isCarScreen ? 'Pantalla de Coche (Cockpit)' : 'Estándar Web'}</div>
                    <div>• <strong>Resolución:</strong> {diagnostics.screenRes}</div>
                    <div>• <strong>Drive Status:</strong> {diagnostics.driveConnected ? 'Autenticado' : 'Sin autenticar'}</div>
                    <div>• <strong>Pista activa:</strong> {diagnostics.currentTrack}</div>
                    <div>• <strong>Versión:</strong> {diagnostics.appVersion}</div>
                  </div>
                )}
              </div>

              {/* Form Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSendViaEmail}
                  disabled={!message.trim()}
                  className="hitbox-48 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Abrir en Email</span>
                </button>

                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="hitbox-48 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Preparar Envío</span>
                </button>
              </div>

            </form>
          )}

          {/* Previous Feedback History section */}
          {history.length > 0 && !submitted && (
            <div className="pt-3 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-neutral-200 transition-colors py-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <History className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Tus mensajes anteriores ({history.length})</span>
                </div>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-2 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                  {history.map((item) => (
                    <div key={item.id} className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{item.subject}</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-[11px] line-clamp-2">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/90 bg-neutral-950/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Car className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Optimizando la mejor experiencia musical para tu coche</span>
            <span className="sm:hidden">AudioCar</span>
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
