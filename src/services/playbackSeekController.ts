/**
 * Gestor robusto de Seeking y Transporte para Tesla/In-Car WebKit & Chromium
 * Protege contra contienda de punteros en el decodificador de hardware,
 * previene cierres abruptos por buffer underrun/EOF crash y sincroniza MediaSession.
 */

export interface AudioSeekEngine {
  getActiveAudioElement(): HTMLAudioElement | null;
  notifyListeners?(): void;
  updateMediaSessionPosition?(): void;
}

export class PlaybackSeekController {
  private engine: AudioSeekEngine;
  public isSeeking: boolean = false;
  private seekDebounceTimer: any = null;
  public readonly SAFETY_MARGIN_SECONDS: number = 2.5; // Margen para evitar EOF crash

  constructor(audioEngine: AudioSeekEngine) {
    // audioEngine provee acceso al elemento activo: audioA o audioB
    this.engine = audioEngine;
  }

  /**
   * Salto granular controlado (+15s / -15s)
   * @param deltaSeconds - Positivo para adelantar, negativo para retroceder
   */
  public skip(deltaSeconds: number): void {
    const audio = this.engine.getActiveAudioElement();
    if (!audio || isNaN(audio.duration) || !isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const current = audio.currentTime;
    const duration = audio.duration;

    // Calcula la nueva posición con límites estrictos de seguridad
    let targetTime = current + deltaSeconds;
    targetTime = Math.max(0, Math.min(targetTime, duration - this.SAFETY_MARGIN_SECONDS));

    this.executeSafeSeek(audio, targetTime);
  }

  /**
   * Manejador para sliders/barras de rango.
   * Usar en eventos 'change' o 'input' debounced, nunca en cada tick de touchmove.
   * @param targetPercentage - Valor entre 0 y 100
   */
  public seekToPercent(targetPercentage: number): void {
    const audio = this.engine.getActiveAudioElement();
    if (!audio || isNaN(audio.duration) || !isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const duration = audio.duration;
    const requestedTime = (Math.max(0, Math.min(targetPercentage, 100)) / 100) * duration;

    // Clamp estricto con margen de seguridad
    const safeTarget = Math.max(0, Math.min(requestedTime, duration - this.SAFETY_MARGIN_SECONDS));

    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
    }

    // Debounce a 120ms para absorber eventos continuos de pantallas táctiles
    this.seekDebounceTimer = setTimeout(() => {
      this.executeSafeSeek(audio, safeTarget);
    }, 120);
  }

  /**
   * Salto a segundo absoluto seguro
   * @param targetSeconds - Segundo de destino
   */
  public seekToSeconds(targetSeconds: number): void {
    const audio = this.engine.getActiveAudioElement();
    if (!audio || isNaN(audio.duration) || !isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const duration = audio.duration;
    const safeTarget = Math.max(0, Math.min(targetSeconds, duration - this.SAFETY_MARGIN_SECONDS));

    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
    }

    this.seekDebounceTimer = setTimeout(() => {
      this.executeSafeSeek(audio, safeTarget);
    }, 120);
  }

  /**
   * Ejecución atómica de salto validando rangos seekable del demuxer
   */
  public executeSafeSeek(audio: HTMLAudioElement, targetTime: number): void {
    if (this.isSeeking) return;

    try {
      // 1. Validar que la posición cae dentro de un TimeRange soportado por el decodificador
      if (audio.seekable && audio.seekable.length > 0) {
        const canSeek = this.isTimeWithinRanges(targetTime, audio.seekable);
        if (!canSeek) {
          // Si cae fuera del rango decodificado, ajusta al borde inferior del último rango
          targetTime = audio.seekable.end(audio.seekable.length - 1) - 0.5;
        }
      }

      this.isSeeking = true;

      const onSeeked = () => {
        audio.removeEventListener('seeked', onSeeked);
        this.isSeeking = false;

        // Sincronizar Media Session API tras la reubicación
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && !isNaN(audio.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1.0,
              position: audio.currentTime
            });
          } catch {}
        }

        if (this.engine.notifyListeners) {
          this.engine.notifyListeners();
        }
      };

      audio.addEventListener('seeked', onSeeked, { once: true });
      audio.currentTime = targetTime;
    } catch (err) {
      this.isSeeking = false;
      console.error('[AudioSeekController] Error al ejecutar currentTime:', err);
    }
  }

  public isTimeWithinRanges(time: number, timeRanges: TimeRanges): boolean {
    for (let i = 0; i < timeRanges.length; i++) {
      if (time >= timeRanges.start(i) && time <= timeRanges.end(i)) {
        return true;
      }
    }
    return false;
  }
}
