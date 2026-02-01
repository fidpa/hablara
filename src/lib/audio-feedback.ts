/**
 * Professional Audio Feedback System
 *
 * Generates recording feedback sounds using Web Audio API.
 * NO external files required - sounds generated at runtime.
 *
 * Benefits:
 * - Zero file dependencies (no start.mp3/stop.mp3 needed)
 * - Professional quality with ADSR envelope
 * - Consistent cross-platform (no codec issues)
 * - Lightweight (<1KB code vs ~50KB MP3s)
 * - Customizable parameters
 */

import { logger } from "@/lib/logger";

// Default volume for sound playback when user preference not specified
const DEFAULT_SOUND_VOLUME = 0.5;

// AudioContext constructor (supports Safari webkit prefix)
const AudioContextConstructor =
  window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

// Module-level AudioContext singleton for performance
// Reusing context avoids creation overhead (~10-20ms per new context)
let cachedAudioContext: AudioContext | null = null;

/**
 * Get or create AudioContext singleton
 * @returns Shared AudioContext instance
 */
function getAudioContext(): AudioContext {
  if (!cachedAudioContext || cachedAudioContext.state === "closed") {
    cachedAudioContext = new AudioContextConstructor();
  }
  return cachedAudioContext;
}

interface SoundParameters {
  frequency: number; // Hz
  duration: number; // seconds
  volume: number; // 0.0 - 1.0
  type: OscillatorType; // 'sine' | 'square' | 'sawtooth' | 'triangle'
  fadeIn: number; // seconds
  fadeOut: number; // seconds
}

// Professional recording feedback sounds
const SOUND_PRESETS = {
  start: {
    frequency: 880, // A5 (bright, attention-grabbing)
    duration: 0.08, // 80ms (quick)
    volume: 0.3, // Moderate volume
    type: "sine", // Clean tone
    fadeIn: 0.005, // 5ms attack (prevents clicks)
    fadeOut: 0.02, // 20ms release (smooth)
  },
  stop: {
    frequency: 440, // A4 (one octave lower, calming)
    duration: 0.12, // 120ms (slightly longer)
    volume: 0.25, // Slightly quieter
    type: "sine",
    fadeIn: 0.005,
    fadeOut: 0.04, // 40ms release (smoother end)
  },
} as const satisfies Record<"start" | "stop", SoundParameters>;

/**
 * Play recording feedback sound using Web Audio API
 *
 * @param type - "start" or "stop"
 * @param userVolume - User preference volume (0.0 - 1.0)
 * @returns Promise that resolves when sound completes
 *
 * @example
 * ```typescript
 * await playRecordingSound("start", 0.5);
 * ```
 */
export async function playRecordingSound(
  type: "start" | "stop",
  userVolume: number = DEFAULT_SOUND_VOLUME
): Promise<void> {
  try {
    // Get preset parameters
    const params = SOUND_PRESETS[type];

    // Get or create shared AudioContext (singleton pattern)
    const audioContext = getAudioContext();

    // Create oscillator (tone generator)
    const oscillator = audioContext.createOscillator();
    oscillator.type = params.type;
    oscillator.frequency.value = params.frequency;

    // Create gain node (volume + ADSR envelope)
    const gainNode = audioContext.createGain();
    const finalVolume = params.volume * userVolume;

    // ADSR Envelope (Attack-Decay-Sustain-Release)
    const now = audioContext.currentTime;
    const attackEnd = now + params.fadeIn;
    const releaseStart = now + params.duration - params.fadeOut;

    // Start silent
    gainNode.gain.setValueAtTime(0, now);

    // Attack: Fade in to full volume
    gainNode.gain.linearRampToValueAtTime(finalVolume, attackEnd);

    // Sustain: Hold volume (implicit - no decay in this simple case)

    // Release: Fade out to silence
    gainNode.gain.setValueAtTime(finalVolume, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, now + params.duration);

    // Connect audio graph: Oscillator → Gain → Output
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play
    oscillator.start(now);
    oscillator.stop(now + params.duration);

    // Wait for completion + cleanup
    return new Promise<void>((resolve) => {
      oscillator.onended = () => {
        // Disconnect nodes to free memory (oscillator/gain are single-use)
        oscillator.disconnect();
        gainNode.disconnect();
        // Note: AudioContext is kept alive (singleton pattern for performance)
        // It will be reused for next sound playback (~10-20ms faster than recreating)
        resolve();
      };
    });
  } catch (error: unknown) {
    // Fail silently - audio feedback is optional UX enhancement
    logger.debug("AudioFeedback", `Failed to play ${type} sound`, error);
  }
}

/**
 * Check if Web Audio API is supported
 *
 * @returns true if browser supports Web Audio API
 */
export function isAudioFeedbackSupported(): boolean {
  return !!AudioContextConstructor;
}
