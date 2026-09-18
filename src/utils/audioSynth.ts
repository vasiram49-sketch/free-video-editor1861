// Web Audio API synthesizer for royalty-free music and sound effects

export interface SynthTrackPreset {
  id: string;
  name: string;
  category: 'music' | 'sfx';
  duration: number; // in seconds
  description: string;
}

export const SYNTH_PRESETS: SynthTrackPreset[] = [
  { id: 'lofi_ambient', name: 'Lofi Sunset Chill', category: 'music', duration: 30, description: 'Warm mellow chords with relaxed rhythmic warmth' },
  { id: 'cinematic_pulse', name: 'Cinematic Thrill Pulse', category: 'music', duration: 25, description: 'Deep bass throb and progressive cinematic tension' },
  { id: 'upbeat_synth', name: 'Electro Pop Energy', category: 'music', duration: 20, description: 'Catchy bright electronic melody and driving beat' },
  { id: 'ambient_drone', name: 'Deep Space Drone', category: 'music', duration: 30, description: 'Atmospheric pad for documentary or scenic travel' },
  { id: 'sfx_whoosh', name: 'Swoosh Transition', category: 'sfx', duration: 1.2, description: 'Quick air sweep for scene cuts and text pop-ins' },
  { id: 'sfx_impact', name: 'Cinematic Hit', category: 'sfx', duration: 2.5, description: 'Booming cinematic bass impact for dramatic moments' },
  { id: 'sfx_pop', name: 'Clean Bubble Pop', category: 'sfx', duration: 0.5, description: 'Playful snappy pop for stickers and titles' },
  { id: 'sfx_shutter', name: 'Camera Shutter', category: 'sfx', duration: 0.8, description: 'Mechanical camera snap sound effect' },
  { id: 'sfx_chime', name: 'Sparkle Ding', category: 'sfx', duration: 1.8, description: 'Bright chime for success, call to action, or highlight' },
];

/**
 * Synthesizes an AudioBuffer offline for the given preset
 */
export async function renderPresetAudioBuffer(presetId: string, durationOverride?: number): Promise<{ buffer: AudioBuffer; blobUrl: string }> {
  const preset = SYNTH_PRESETS.find(p => p.id === presetId) || SYNTH_PRESETS[0];
  const duration = durationOverride || preset.duration;
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, 0);
  masterGain.connect(offlineCtx.destination);

  if (presetId === 'lofi_ambient') {
    // Warm chords progression (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
    const chordFrequencies = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
    ];
    const chordDuration = 3.5;
    let t = 0;
    while (t < duration) {
      const chord = chordFrequencies[Math.floor(t / chordDuration) % chordFrequencies.length];
      chord.forEach((freq, idx) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        
        // Envelope
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.08, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.04, t + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + chordDuration - 0.1);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + chordDuration);
      });

      // Subtle kick/tap
      const kick = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kick.frequency.setValueAtTime(110, t);
      kick.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      kickGain.gain.setValueAtTime(0.25, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      kick.connect(kickGain);
      kickGain.connect(masterGain);
      kick.start(t);
      kick.stop(t + 0.3);

      t += chordDuration;
    }
  } else if (presetId === 'cinematic_pulse') {
    // 120 bpm eighth note pulses
    const eighth = 0.25;
    let t = 0;
    const notes = [55, 55, 65.4, 55, 73.4, 55, 65.4, 58.27];
    let noteIdx = 0;
    while (t < duration) {
      const osc = offlineCtx.createOscillator();
      const filter = offlineCtx.createBiquadFilter();
      const gain = offlineCtx.createGain();

      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300 + (t / duration) * 1200, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + eighth * 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + eighth);
      t += eighth;
    }
  } else if (presetId === 'upbeat_synth') {
    const melody = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];
    const beat = 0.25;
    let t = 0;
    let step = 0;
    while (t < duration) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(melody[step % melody.length], t);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + beat * 0.85);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + beat);

      // Bass drum on every whole beat
      if (step % 4 === 0) {
        const bass = offlineCtx.createOscillator();
        const bGain = offlineCtx.createGain();
        bass.frequency.setValueAtTime(130, t);
        bass.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        bGain.gain.setValueAtTime(0.3, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        bass.connect(bGain);
        bGain.connect(masterGain);
        bass.start(t);
        bass.stop(t + 0.3);
      }

      step++;
      t += beat;
    }
  } else if (presetId === 'ambient_drone') {
    const freqs = [65.41, 98.00, 130.81, 196.00];
    freqs.forEach((f) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, 0);

      gain.gain.setValueAtTime(0.08, 0);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(0);
      osc.stop(duration);
    });
  } else if (presetId === 'sfx_whoosh') {
    // White noise sweep
    const bufferSize = sampleRate * 1.2;
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = offlineCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(200, 0);
    filter.frequency.exponentialRampToValueAtTime(3500, 0.6);
    filter.frequency.exponentialRampToValueAtTime(300, 1.2);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.01, 0);
    gain.gain.linearRampToValueAtTime(0.4, 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, 1.2);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    whiteNoise.start(0);
    whiteNoise.stop(1.2);
  } else if (presetId === 'sfx_impact') {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, 0);
    osc.frequency.exponentialRampToValueAtTime(30, 0.7);

    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 2.4);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(0);
    osc.stop(2.5);
  } else if (presetId === 'sfx_pop') {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, 0);
    osc.frequency.exponentialRampToValueAtTime(1200, 0.08);

    gain.gain.setValueAtTime(0.5, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.4);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(0);
    osc.stop(0.5);
  } else if (presetId === 'sfx_shutter') {
    // Snap click 1 + snap click 2
    [0, 0.15].forEach((offset) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, offset);
      osc.frequency.exponentialRampToValueAtTime(200, offset + 0.08);

      gain.gain.setValueAtTime(0.35, offset);
      gain.gain.exponentialRampToValueAtTime(0.001, offset + 0.1);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(offset);
      osc.stop(offset + 0.12);
    });
  } else if (presetId === 'sfx_chime') {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const offset = i * 0.1;
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, offset);

      gain.gain.setValueAtTime(0.2, offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(offset);
      osc.stop(offset + 1.4);
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const blobUrl = URL.createObjectURL(wavBlob);

  return { buffer: renderedBuffer, blobUrl };
}

/**
 * Encodes an AudioBuffer into a standardized 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length, true);

  // Write channel interleaved samples
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
