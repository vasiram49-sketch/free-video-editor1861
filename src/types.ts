export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export type VideoFitMode = 'contain' | 'cover' | 'stretch';

export type TransitionType = 
  | 'none' 
  | 'cross-dissolve' 
  | 'fade-black' 
  | 'fade-white' 
  | 'wipe-left' 
  | 'wipe-right' 
  | 'zoom-in';

export interface FilterSettings {
  brightness: number; // 0 - 200, default 100
  contrast: number; // 0 - 200, default 100
  saturation: number; // 0 - 200, default 100
  hueRotate: number; // -180 to 180, default 0
  blur: number; // 0 - 20px, default 0
  sepia: number; // 0 - 100, default 0
  grayscale: number; // 0 - 100, default 0
  temperature: number; // -50 to 50, default 0
  vignette: number; // 0 - 100, default 0
  presetName: string;
}

export interface VideoClip {
  id: string;
  name: string;
  type: 'video' | 'image';
  src: string;
  duration: number; // Total un-trimmed media duration in seconds
  trimStart: number; // In-point in seconds
  trimEnd: number; // Out-point in seconds
  playbackRate: number; // 0.25 to 3.0, default 1
  volume: number; // 0 to 2.0, default 1
  isMuted: boolean;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  scale: number; // 0.5 to 3.0, default 1
  fitMode: VideoFitMode;
  transition: TransitionType;
  transitionDuration: number; // seconds, default 0.5
  filter: FilterSettings;
  thumbnail?: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number; // % from left 0 - 100
  y: number; // % from top 0 - 100
  fontSize: number; // px at 1080p scale
  fontFamily: string;
  fontWeight: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  animation: 'none' | 'fade' | 'pop' | 'slide-up' | 'typewriter';
  textAlign: 'left' | 'center' | 'right';
}

export interface GraphicOverlay {
  id: string;
  type: 'sticker' | 'badge' | 'watermark';
  content: string; // emoji, SVG, or image URL
  label?: string;
  startTime: number;
  duration: number;
  x: number; // % 0-100
  y: number; // % 0-100
  scale: number; // 0.5 - 2.5
  opacity: number; // 0 - 1
}

export interface AudioTrack {
  id: string;
  name: string;
  src: string;
  type: 'custom' | 'synth' | 'sfx';
  synthPreset?: string;
  startTime: number; // position on timeline
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number; // 0 - 1.5
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  isMuted: boolean;
  loop: boolean;
}

export interface ExportSettings {
  resolutionPreset: '4k' | '1440p' | '1080p' | '720p';
  width: number;
  height: number;
  fps: 24 | 30 | 60;
  bitratePreset: 'high' | 'medium' | 'fast';
  format: 'webm' | 'mp4';
  includeAudio: boolean;
  customWatermark?: string;
}

export interface ProjectState {
  title: string;
  aspectRatio: AspectRatio;
  canvasBackgroundColor: string;
  clips: VideoClip[];
  textOverlays: TextOverlay[];
  graphicOverlays: GraphicOverlay[];
  audioTracks: AudioTrack[];
}
