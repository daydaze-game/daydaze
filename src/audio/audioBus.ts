/**
 * Shared Web Audio routing: one AudioContext, one master gain, and
 * independent Music/SFX buses beneath it. All procedural audio producers
 * (jukebox, instruments, dance floor, minigames) connect to the music or
 * SFX destination here instead of talking to `ctx.destination` directly, so
 * a single global mute/volume control can reach every audio path.
 */

import { getAudioContextClass } from "./audioContextClass.ts";
import { createAcidFilter, type AcidFilter } from "./acidFilter.ts";

export interface AudioBus {
  /** Underlying AudioContext, or null if Web Audio is unavailable. */
  getContext(): AudioContext | null;
  /** Node producers should connect into for music (jukebox tracks). */
  getMusicDestination(): AudioNode | null;
  /** Node producers should connect into for sound effects (instruments, UI, minigames). */
  getSfxDestination(): AudioNode | null;

  /** Tints everything with the acid sound (tinny, echoing) at the acid meter's level; 0 is clean. */
  setAcidLevel(level: number): void;

  setMasterVolume(vol: number): void;
  getMasterVolume(): number;
  setMasterMuted(muted: boolean): void;
  isMasterMuted(): boolean;

  setMusicMuted(muted: boolean): void;
  isMusicMuted(): boolean;
  setSfxMuted(muted: boolean): void;
  isSfxMuted(): boolean;

  /** Effective linear gain currently applied to the music bus (for tests/inspection). */
  getMusicGainValue(): number;
  /** Effective linear gain currently applied to the SFX bus (for tests/inspection). */
  getSfxGainValue(): number;

  dispose(): void;
}

function clampUnit(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

class AudioBusImpl implements AudioBus {
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private acid: AcidFilter | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterVolume = 1;
  private masterMuted = false;
  private musicMuted = false;
  private sfxMuted = false;
  private disposed = false;

  constructor(ctx: AudioContext | null) {
    this.ctx = ctx;
    if (!ctx) return;
    try {
      this.master = ctx.createGain();
      this.musicGain = ctx.createGain();
      this.sfxGain = ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.applyGains();
      try {
        // master → acid filter → speakers (the filter is clean at level 0)
        this.acid = createAcidFilter(ctx);
        this.master.connect(this.acid.input);
        this.acid.output.connect(ctx.destination);
      } catch {
        this.acid = null;
        this.master.connect(ctx.destination);
      }
    } catch {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
    }
  }

  getContext(): AudioContext | null {
    return this.disposed ? null : this.ctx;
  }

  getMusicDestination(): AudioNode | null {
    return this.disposed ? null : this.musicGain;
  }

  getSfxDestination(): AudioNode | null {
    return this.disposed ? null : this.sfxGain;
  }

  setAcidLevel(level: number): void {
    try {
      this.acid?.setLevel(level);
    } catch {
      /* ignore: node may be disconnected in exotic test doubles */
    }
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = clampUnit(vol, this.masterVolume);
    this.applyGains();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
    this.applyGains();
  }

  isMasterMuted(): boolean {
    return this.masterMuted;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.applyGains();
  }

  isMusicMuted(): boolean {
    return this.musicMuted;
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.applyGains();
  }

  isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  getMusicGainValue(): number {
    return this.musicGain?.gain.value ?? 0;
  }

  getSfxGainValue(): number {
    return this.sfxGain?.gain.value ?? 0;
  }

  private applyGains(): void {
    try {
      if (this.master) {
        this.master.gain.value = this.masterMuted ? 0 : this.masterVolume;
      }
      if (this.musicGain) {
        this.musicGain.gain.value = this.musicMuted ? 0 : 1;
      }
      if (this.sfxGain) {
        this.sfxGain.gain.value = this.sfxMuted ? 0 : 1;
      }
    } catch {
      /* ignore: node may be disconnected in exotic test doubles */
    }
  }

  dispose(): void {
    if (this.disposed) return;
    try {
      this.musicGain?.disconnect();
      this.sfxGain?.disconnect();
      this.master?.disconnect();
      this.acid?.output.disconnect();
    } catch {
      /* ignore */
    }
    this.master = null;
    this.acid = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.disposed = true;
  }
}

function resolveAudioContext(ctx?: AudioContext | null): AudioContext | null {
  if (ctx) return ctx;
  if (ctx === null) return null;
  try {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  } catch {
    return null;
  }
}

/** Creates an isolated bus; mainly for tests. Production code uses {@link getSharedAudioBus}. */
export function createAudioBus(ctx?: AudioContext | null): AudioBus {
  return new AudioBusImpl(resolveAudioContext(ctx));
}

let sharedBus: AudioBus | null = null;

/** Lazily creates the single AudioBus shared by every audio-producing feature. */
export function getSharedAudioBus(): AudioBus {
  if (!sharedBus) sharedBus = createAudioBus();
  return sharedBus;
}

/** Test-only: forces the next {@link getSharedAudioBus} call to build a fresh bus. */
export function resetSharedAudioBusForTests(): void {
  sharedBus?.dispose();
  sharedBus = null;
}
