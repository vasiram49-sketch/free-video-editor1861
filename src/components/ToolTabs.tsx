import React, { useState } from 'react';
import { 
  ProjectState, 
  VideoClip, 
  TextOverlay, 
  AudioTrack, 
  GraphicOverlay, 
  TransitionType, 
  VideoFitMode 
} from '../types';
import { 
  COLOR_PRESETS, 
  DEFAULT_FILTER, 
  generateSyntheticClip, 
  processUploadedImage, 
  processUploadedVideo 
} from '../utils/sampleClips';
import { 
  SYNTH_PRESETS, 
  renderPresetAudioBuffer 
} from '../utils/audioSynth';
import { 
  Film, 
  Sliders, 
  Palette, 
  Type, 
  Music, 
  Sparkles, 
  Smile, 
  Upload, 
  Plus, 
  Trash2, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Volume2, 
  VolumeX, 
  Play, 
  Check, 
  Loader2,
  Layers
} from 'lucide-react';

interface ToolTabsProps {
  project: ProjectState;
  onProjectChange: (project: ProjectState) => void;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  selectedAudioId: string | null;
  onSelectAudio: (id: string | null) => void;
  selectedGraphicId: string | null;
  onSelectGraphic: (id: string | null) => void;
  currentTime: number;
}

type TabType = 'media' | 'transform' | 'filters' | 'text' | 'audio' | 'transitions' | 'stickers';

export function ToolTabs({
  project,
  onProjectChange,
  selectedClipId,
  onSelectClip,
  selectedTextId,
  onSelectText,
  selectedAudioId,
  onSelectAudio,
  selectedGraphicId,
  onSelectGraphic,
  currentTime,
}: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);

  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || project.clips[0] || null;
  const selectedText = project.textOverlays.find((t) => t.id === selectedTextId) || null;
  const selectedAudio = project.audioTracks.find((a) => a.id === selectedAudioId) || null;
  const selectedGraphic = project.graphicOverlays.find((g) => g.id === selectedGraphicId) || null;

  // File Upload Handlers
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('video/')) {
        try {
          const { src, name, duration, thumbnail } = await processUploadedVideo(file);
          const newClip: VideoClip = {
            id: `clip_${Date.now()}_${i}`,
            name,
            type: 'video',
            src,
            duration,
            trimStart: 0,
            trimEnd: duration,
            playbackRate: 1,
            volume: 1,
            isMuted: false,
            rotation: 0,
            flipH: false,
            flipV: false,
            scale: 1,
            fitMode: 'cover',
            transition: 'none',
            transitionDuration: 0.5,
            filter: { ...DEFAULT_FILTER },
            thumbnail,
          };
          onProjectChange({
            ...project,
            clips: [...project.clips, newClip],
          });
          onSelectClip(newClip.id);
        } catch (err) {
          console.error(err);
        }
      } else if (file.type.startsWith('image/')) {
        try {
          const { src, name, duration, thumbnail } = await processUploadedImage(file);
          const newClip: VideoClip = {
            id: `clip_${Date.now()}_${i}`,
            name,
            type: 'image',
            src,
            duration,
            trimStart: 0,
            trimEnd: duration,
            playbackRate: 1,
            volume: 0,
            isMuted: true,
            rotation: 0,
            flipH: false,
            flipV: false,
            scale: 1,
            fitMode: 'cover',
            transition: 'none',
            transitionDuration: 0.5,
            filter: { ...DEFAULT_FILTER },
            thumbnail,
          };
          onProjectChange({
            ...project,
            clips: [...project.clips, newClip],
          });
          onSelectClip(newClip.id);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Generate synthetic preset clip
  const handleAddPresetClip = async (type: 'sunset' | 'cyberpunk' | 'nature' | 'kinetic') => {
    setIsGenerating(true);
    try {
      const { blobUrl, thumbnail } = await generateSyntheticClip(type, 5);
      const titles = {
        sunset: 'Sunset Golden Hour',
        cyberpunk: 'Cyberpunk Synthwave',
        nature: 'Emerald Stream',
        kinetic: 'Kinetic Motion Intro',
      };
      const newClip: VideoClip = {
        id: `clip_${Date.now()}`,
        name: titles[type],
        type: 'video',
        src: blobUrl,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
        playbackRate: 1,
        volume: 1,
        isMuted: false,
        rotation: 0,
        flipH: false,
        flipV: false,
        scale: 1,
        fitMode: 'cover',
        transition: 'none',
        transitionDuration: 0.5,
        filter: { ...DEFAULT_FILTER },
        thumbnail,
      };
      onProjectChange({
        ...project,
        clips: [...project.clips, newClip],
      });
      onSelectClip(newClip.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to update selected clip
  const updateSelectedClip = (patch: Partial<VideoClip>) => {
    if (!selectedClip) return;
    onProjectChange({
      ...project,
      clips: project.clips.map((c) => (c.id === selectedClip.id ? { ...c, ...patch } : c)),
    });
  };

  // Helper to update selected text
  const updateSelectedText = (patch: Partial<TextOverlay>) => {
    if (!selectedText) return;
    onProjectChange({
      ...project,
      textOverlays: project.textOverlays.map((t) => (t.id === selectedText.id ? { ...t, ...patch } : t)),
    });
  };

  // Helper to update selected audio
  const updateSelectedAudio = (patch: Partial<AudioTrack>) => {
    if (!selectedAudio) return;
    onProjectChange({
      ...project,
      audioTracks: project.audioTracks.map((a) => (a.id === selectedAudio.id ? { ...a, ...patch } : a)),
    });
  };

  // Helper to update selected graphic
  const updateSelectedGraphic = (patch: Partial<GraphicOverlay>) => {
    if (!selectedGraphic) return;
    onProjectChange({
      ...project,
      graphicOverlays: project.graphicOverlays.map((g) => (g.id === selectedGraphic.id ? { ...g, ...patch } : g)),
    });
  };

  // Add new Text Overlay
  const handleAddText = (preset: 'title' | 'subtitle' | 'lowerthird') => {
    const presets = {
      title: {
        text: 'HEADLINE TITLE',
        fontSize: 72,
        y: 40,
        fontWeight: '800',
        backgroundColor: '#000000',
        backgroundOpacity: 0,
        animation: 'pop' as const,
      },
      subtitle: {
        text: 'Add your subtitle caption here',
        fontSize: 44,
        y: 82,
        fontWeight: '600',
        backgroundColor: '#000000',
        backgroundOpacity: 65,
        animation: 'fade' as const,
      },
      lowerthird: {
        text: 'SPEAKER NAME • HOST',
        fontSize: 36,
        y: 78,
        fontWeight: '700',
        backgroundColor: '#e11d48',
        backgroundOpacity: 85,
        animation: 'slide-up' as const,
      },
    };

    const config = presets[preset];
    const newText: TextOverlay = {
      id: `text_${Date.now()}`,
      text: config.text,
      startTime: Math.max(0, currentTime),
      duration: 3.5,
      x: 50,
      y: config.y,
      fontSize: config.fontSize,
      fontFamily: 'Inter, sans-serif',
      fontWeight: config.fontWeight,
      color: '#ffffff',
      backgroundColor: config.backgroundColor,
      backgroundOpacity: config.backgroundOpacity,
      strokeColor: '#000000',
      strokeWidth: 0,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 10,
      animation: config.animation,
      textAlign: 'center',
    };

    onProjectChange({
      ...project,
      textOverlays: [...project.textOverlays, newText],
    });
    onSelectText(newText.id);
  };

  // Add Synth Audio Track to Timeline
  const handleAddSynthTrack = async (presetId: string) => {
    try {
      const preset = SYNTH_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const { blobUrl } = await renderPresetAudioBuffer(presetId);
      const newAudio: AudioTrack = {
        id: `audio_${Date.now()}`,
        name: preset.name,
        src: blobUrl,
        type: preset.category === 'music' ? 'synth' : 'sfx',
        synthPreset: presetId,
        startTime: Math.max(0, currentTime),
        duration: preset.duration,
        trimStart: 0,
        trimEnd: preset.duration,
        volume: 0.8,
        fadeIn: 0.5,
        fadeOut: 1.0,
        isMuted: false,
        loop: false,
      };

      onProjectChange({
        ...project,
        audioTracks: [...project.audioTracks, newAudio],
      });
      onSelectAudio(newAudio.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Custom Audio File
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const newAudio: AudioTrack = {
        id: `audio_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        type: 'custom',
        startTime: Math.max(0, currentTime),
        duration: audio.duration || 10,
        trimStart: 0,
        trimEnd: audio.duration || 10,
        volume: 0.8,
        fadeIn: 0.5,
        fadeOut: 0.5,
        isMuted: false,
        loop: false,
      };
      onProjectChange({
        ...project,
        audioTracks: [...project.audioTracks, newAudio],
      });
      onSelectAudio(newAudio.id);
    };
  };

  // Add Sticker / Graphic Overlay
  const handleAddSticker = (content: string, type: 'sticker' | 'badge' = 'sticker', label?: string) => {
    const newOverlay: GraphicOverlay = {
      id: `sticker_${Date.now()}`,
      type,
      content,
      label,
      startTime: Math.max(0, currentTime),
      duration: 3.5,
      x: 50,
      y: 50,
      scale: 1,
      opacity: 1,
    };
    onProjectChange({
      ...project,
      graphicOverlays: [...project.graphicOverlays, newOverlay],
    });
    onSelectGraphic(newOverlay.id);
  };

  return (
    <aside className="w-80 border-r border-zinc-800 bg-zinc-900/90 flex flex-col h-full select-none text-zinc-300">
      {/* Tab Navigation Icons */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-1 py-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'media', label: 'Media', icon: Film },
          { id: 'transform', label: 'Crop', icon: Sliders },
          { id: 'filters', label: 'Filters', icon: Palette },
          { id: 'text', label: 'Text', icon: Type },
          { id: 'audio', label: 'Audio', icon: Music },
          { id: 'transitions', label: 'Trans', icon: Sparkles },
          { id: 'stickers', label: 'Badges', icon: Smile },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-rose-500/15 text-rose-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* ================= TAB: MEDIA ================= */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Media Library</h3>
              <p className="text-[11px] text-zinc-400">
                Upload your video clips, photos, or generate dynamic royalty-free stock scenes.
              </p>
            </div>

            {/* Upload Box */}
            <label className="border-2 border-dashed border-zinc-700 hover:border-rose-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-900/50">
              <Upload className="w-6 h-6 text-rose-400" />
              <div className="flex flex-col">
                <span className="font-medium text-zinc-200">Upload Videos & Photos</span>
                <span className="text-[10px] text-zinc-500">MP4, WebM, MOV, JPG, PNG</span>
              </div>
              <input
                type="file"
                multiple
                accept="video/*,image/*"
                onChange={handleMediaUpload}
                className="hidden"
              />
            </label>

            {/* Pre-made Dynamic Stock Footage */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Stock Scene Generators
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isGenerating}
                  onClick={() => handleAddPresetClip('sunset')}
                  className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-left transition-all group"
                >
                  <span className="font-medium text-zinc-200 block group-hover:text-amber-400">
                    🌅 Sunset Drone
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Golden hour horizon</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleAddPresetClip('cyberpunk')}
                  className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-left transition-all group"
                >
                  <span className="font-medium text-zinc-200 block group-hover:text-pink-400">
                    🌆 Cyber Neon
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Synthwave grid city</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleAddPresetClip('nature')}
                  className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-left transition-all group"
                >
                  <span className="font-medium text-zinc-200 block group-hover:text-emerald-400">
                    🌿 Emerald Water
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Forest light ripples</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleAddPresetClip('kinetic')}
                  className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-left transition-all group"
                >
                  <span className="font-medium text-zinc-200 block group-hover:text-cyan-400">
                    💫 Kinetic Rings
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Abstract motion intro</span>
                </button>
              </div>

              {isGenerating && (
                <div className="flex items-center gap-2 justify-center p-2 text-rose-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing high-res scene...</span>
                </div>
              )}
            </div>

            {/* Current Clips List */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Project Clips ({project.clips.length})
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {project.clips.map((clip, i) => (
                  <div
                    key={clip.id}
                    onClick={() => onSelectClip(clip.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                      selectedClipId === clip.id
                        ? 'border-rose-500 bg-rose-950/30 text-white'
                        : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#{i + 1}</span>
                      <span className="truncate font-medium">{clip.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {((clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1)).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: TRANSFORM & CROP ================= */}
        {activeTab === 'transform' && selectedClip && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Transform & Cropping</h3>
              <p className="text-[11px] text-zinc-400">
                Adjust scale, orientation, speed, and frame fitting for "{selectedClip.name}".
              </p>
            </div>

            {/* Scale / Zoom */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Scale / Zoom</span>
                <span className="font-mono">{Math.round((selectedClip.scale || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={selectedClip.scale || 1}
                onChange={(e) => updateSelectedClip({ scale: parseFloat(e.target.value) })}
                className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
              />
            </div>

            {/* Rotation & Flipping */}
            <div className="space-y-1">
              <span className="text-zinc-400 block mb-1">Rotate & Flip</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateSelectedClip({ rotation: ((selectedClip.rotation || 0) + 90) % 360 })}
                  className="p-2 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-850 flex items-center justify-center gap-1 text-zinc-200"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90°</span>
                </button>
                <button
                  onClick={() => updateSelectedClip({ flipH: !selectedClip.flipH })}
                  className={`p-2 rounded border flex items-center justify-center gap-1 transition-colors ${
                    selectedClip.flipH
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-200'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip X</span>
                </button>
                <button
                  onClick={() => updateSelectedClip({ flipV: !selectedClip.flipV })}
                  className={`p-2 rounded border flex items-center justify-center gap-1 transition-colors ${
                    selectedClip.flipV
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-200'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip Y</span>
                </button>
              </div>
            </div>

            {/* Fit Mode */}
            <div className="space-y-1">
              <span className="text-zinc-400 block mb-1">Aspect Fit Mode</span>
              <div className="grid grid-cols-3 gap-2">
                {(['cover', 'contain', 'stretch'] as VideoFitMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSelectedClip({ fitMode: mode })}
                    className={`p-2 capitalize rounded border text-center transition-colors ${
                      selectedClip.fitMode === mode
                        ? 'bg-rose-600/30 border-rose-500 text-white font-medium'
                        : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-400'
                    }`}
                  >
                    {mode === 'cover' ? 'Crop/Fill' : mode === 'contain' ? 'Fit Screen' : 'Stretch'}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Multiplier */}
            <div className="space-y-1">
              <span className="text-zinc-400 block mb-1">Playback Speed</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => updateSelectedClip({ playbackRate: rate })}
                    className={`py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                      selectedClip.playbackRate === rate
                        ? 'bg-rose-600 text-white border-rose-500 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Precise Trim Inputs */}
            <div className="space-y-1">
              <span className="text-zinc-400 block mb-1">Trim Timing</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-0.5">Start In-Point (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={selectedClip.trimEnd - 0.2}
                    value={selectedClip.trimStart.toFixed(1)}
                    onChange={(e) => updateSelectedClip({ trimStart: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-0.5">End Out-Point (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={selectedClip.trimStart + 0.2}
                    max={selectedClip.duration}
                    value={selectedClip.trimEnd.toFixed(1)}
                    onChange={(e) => updateSelectedClip({ trimEnd: Math.min(selectedClip.duration, parseFloat(e.target.value) || selectedClip.duration) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: FILTERS & COLOR ================= */}
        {activeTab === 'filters' && selectedClip && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">Color Grading</h3>
                <p className="text-[11px] text-zinc-400">Cinematic filters and visual adjustments.</p>
              </div>
              <button
                onClick={() => updateSelectedClip({ filter: { ...DEFAULT_FILTER } })}
                className="text-[11px] text-rose-400 hover:text-rose-300"
              >
                Reset
              </button>
            </div>

            {/* Color Presets */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Style Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_PRESETS.map((preset) => {
                  const isActive = selectedClip.filter.presetName === preset.name;
                  return (
                    <button
                      key={preset.name}
                      onClick={() =>
                        updateSelectedClip({
                          filter: {
                            ...DEFAULT_FILTER,
                            ...preset.filter,
                            presetName: preset.name,
                          },
                        })
                      }
                      className={`p-2 rounded-lg border text-left transition-colors truncate ${
                        isActive
                          ? 'border-rose-500 bg-rose-950/40 text-rose-200 font-medium'
                          : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-400'
                      }`}
                    >
                      <span className="truncate block">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine Tuning Sliders */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Manual Adjustments
              </span>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Brightness</span>
                  <span className="font-mono">{selectedClip.filter.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={selectedClip.filter.brightness}
                  onChange={(e) =>
                    updateSelectedClip({
                      filter: { ...selectedClip.filter, brightness: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Contrast</span>
                  <span className="font-mono">{selectedClip.filter.contrast}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={200}
                  value={selectedClip.filter.contrast}
                  onChange={(e) =>
                    updateSelectedClip({
                      filter: { ...selectedClip.filter, contrast: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Saturation</span>
                  <span className="font-mono">{selectedClip.filter.saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={selectedClip.filter.saturation}
                  onChange={(e) =>
                    updateSelectedClip({
                      filter: { ...selectedClip.filter, saturation: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                />
              </div>

              {/* Vignette */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Vignette Edge</span>
                  <span className="font-mono">{selectedClip.filter.vignette}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={selectedClip.filter.vignette}
                  onChange={(e) =>
                    updateSelectedClip({
                      filter: { ...selectedClip.filter, vignette: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                />
              </div>

              {/* Blur */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Focus Blur</span>
                  <span className="font-mono">{selectedClip.filter.blur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={selectedClip.filter.blur}
                  onChange={(e) =>
                    updateSelectedClip({
                      filter: { ...selectedClip.filter, blur: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: TEXT & CAPTIONS ================= */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Text & Subtitles</h3>
              <p className="text-[11px] text-zinc-400">Add titles, animated captions, and lower-thirds.</p>
            </div>

            {/* Add Preset Text buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleAddText('title')}
                className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500 text-center font-medium text-zinc-200"
              >
                + Title
              </button>
              <button
                onClick={() => handleAddText('subtitle')}
                className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500 text-center font-medium text-zinc-200"
              >
                + Subtitle
              </button>
              <button
                onClick={() => handleAddText('lowerthird')}
                className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500 text-center font-medium text-zinc-200"
              >
                + Lower 3rd
              </button>
            </div>

            {/* Selected Text Properties */}
            {selectedText ? (
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 block">Text Content</label>
                  <textarea
                    rows={2}
                    value={selectedText.text}
                    onChange={(e) => updateSelectedText({ text: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Font Size & Position Y */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Size</span>
                      <span className="font-mono">{selectedText.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      value={selectedText.fontSize}
                      onChange={(e) => updateSelectedText({ fontSize: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 bg-zinc-700 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Y Position</span>
                      <span className="font-mono">{selectedText.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={selectedText.y}
                      onChange={(e) => updateSelectedText({ y: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 bg-zinc-700 rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Animation Type */}
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 block">Entrance Animation</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['none', 'fade', 'pop', 'slide-up', 'typewriter'] as const).map((anim) => (
                      <button
                        key={anim}
                        onClick={() => updateSelectedText({ animation: anim })}
                        className={`py-1 text-[11px] capitalize rounded border transition-colors ${
                          selectedText.animation === anim
                            ? 'bg-cyan-600/30 border-cyan-400 text-white font-medium'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Text Color</label>
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded p-1.5">
                      <input
                        type="color"
                        value={selectedText.color}
                        onChange={(e) => updateSelectedText({ color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-zinc-300">{selectedText.color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Box Opacity</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selectedText.backgroundOpacity}
                      onChange={(e) => updateSelectedText({ backgroundOpacity: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 bg-zinc-700 rounded h-1 cursor-pointer mt-2"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                Select a text item on the timeline or click one of the preset buttons above to customize.
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: AUDIO & MUSIC ================= */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Audio & Music</h3>
              <p className="text-[11px] text-zinc-400">
                Royalty-free synthesized tracks, sound effects, or import your own tracks.
              </p>
            </div>

            {/* Custom Audio Upload */}
            <label className="border border-dashed border-zinc-700 hover:border-emerald-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-zinc-950/40 hover:bg-zinc-900/50 text-zinc-200">
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-xs">Import Custom Audio (MP3/WAV)</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />
            </label>

            {/* Selected Audio Properties */}
            {selectedAudio && (
              <div className="space-y-2.5 p-3 rounded-lg bg-zinc-950 border border-emerald-900/60">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-300 truncate max-w-[160px]">
                    {selectedAudio.name}
                  </span>
                  <button
                    onClick={() =>
                      onProjectChange({
                        ...project,
                        audioTracks: project.audioTracks.filter((a) => a.id !== selectedAudio.id),
                      })
                    }
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Volume slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Track Volume</span>
                    <span className="font-mono">{Math.round(selectedAudio.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={selectedAudio.volume}
                    onChange={(e) => updateSelectedAudio({ volume: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 bg-zinc-700 rounded h-1 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Built-in Royalty Free Tracks */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Royalty-Free Music Loops
              </span>
              <div className="space-y-1.5">
                {SYNTH_PRESETS.filter((p) => p.category === 'music').map((preset) => (
                  <div
                    key={preset.id}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="font-medium text-zinc-200 block truncate">{preset.name}</span>
                      <span className="text-[10px] text-zinc-500 block truncate">{preset.description}</span>
                    </div>
                    <button
                      onClick={() => handleAddSynthTrack(preset.id)}
                      className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sound Effects SFX */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Essential Sound Effects
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {SYNTH_PRESETS.filter((p) => p.category === 'sfx').map((sfx) => (
                  <button
                    key={sfx.id}
                    onClick={() => handleAddSynthTrack(sfx.id)}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500 text-left transition-colors truncate"
                  >
                    <span className="font-medium text-zinc-200 block truncate">{sfx.name}</span>
                    <span className="text-[10px] text-emerald-400 block font-mono">+{sfx.duration}s</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: TRANSITIONS ================= */}
        {activeTab === 'transitions' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Scene Transitions</h3>
              <p className="text-[11px] text-zinc-400">
                Smooth visual cuts between clips on the timeline.
              </p>
            </div>

            {selectedClip ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    Active Clip: <strong className="text-white">{selectedClip.name}</strong>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Duration: {selectedClip.transitionDuration}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Hard Cut', desc: 'Standard direct cut' },
                    { id: 'cross-dissolve', label: 'Cross Dissolve', desc: 'Smooth blended fade' },
                    { id: 'fade-black', label: 'Fade Black', desc: 'Dramatic cinematic dip' },
                    { id: 'fade-white', label: 'Fade White', desc: 'Flash scene transition' },
                    { id: 'wipe-left', label: 'Wipe Left', desc: 'Horizontal slide wipe' },
                    { id: 'zoom-in', label: 'Zoom In', desc: 'Dynamic focal plunge' },
                  ].map((trans) => {
                    const isSelected = selectedClip.transition === trans.id;
                    return (
                      <button
                        key={trans.id}
                        onClick={() => updateSelectedClip({ transition: trans.id as TransitionType })}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-rose-950/50 border-rose-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-400'
                        }`}
                      >
                        <span className="font-medium text-xs block text-zinc-200">{trans.label}</span>
                        <span className="text-[10px] text-zinc-500 block">{trans.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Transition Duration */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Transition Duration</span>
                    <span className="font-mono">{selectedClip.transitionDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1.5}
                    step={0.1}
                    value={selectedClip.transitionDuration}
                    onChange={(e) => updateSelectedClip({ transitionDuration: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500 bg-zinc-700 rounded h-1 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => {
                    onProjectChange({
                      ...project,
                      clips: project.clips.map((c) => ({
                        ...c,
                        transition: selectedClip.transition,
                        transitionDuration: selectedClip.transitionDuration,
                      })),
                    });
                  }}
                  className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors"
                >
                  Apply to All Clips
                </button>
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                Select a clip on the timeline to apply transitions.
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: STICKERS & BADGES ================= */}
        {activeTab === 'stickers' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm mb-1">Stickers & Badges</h3>
              <p className="text-[11px] text-zinc-400">
                Call-to-action badges, stickers, and channel watermark overlays.
              </p>
            </div>

            {/* Badges */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Social Badges
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { text: 'SUBSCRIBE', label: 'Channel' },
                  { text: 'LIKE & SHARE', label: 'Social' },
                  { text: '4K ULTRA HD', label: 'Quality' },
                  { text: 'NEW VIDEO', label: 'Announcement' },
                  { text: 'SALE 50%', label: 'Promo' },
                  { text: 'WATCH NOW', label: 'Action' },
                ].map((badge) => (
                  <button
                    key={badge.text}
                    onClick={() => handleAddSticker(badge.text, 'badge', badge.label)}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-amber-500 text-left font-medium text-xs text-amber-300"
                  >
                    + {badge.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Emojis & Stickers */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Stickers & Icons
              </span>
              <div className="grid grid-cols-4 gap-2">
                {['🔥', '⭐', '🚀', '❤️', '💡', '🎬', '⚡', '🔔', '✨', '🎯', '💯', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddSticker(emoji, 'sticker')}
                    className="p-3 text-xl rounded-lg bg-zinc-950 border border-zinc-800 hover:border-amber-400 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Graphic properties */}
            {selectedGraphic && (
              <div className="space-y-2.5 p-3 rounded-lg bg-zinc-950 border border-amber-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">
                    Selected Overlay ({selectedGraphic.content})
                  </span>
                  <button
                    onClick={() =>
                      onProjectChange({
                        ...project,
                        graphicOverlays: project.graphicOverlays.filter((g) => g.id !== selectedGraphic.id),
                      })
                    }
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scale slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Size Scale</span>
                    <span className="font-mono">{Math.round(selectedGraphic.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={selectedGraphic.scale}
                    onChange={(e) => updateSelectedGraphic({ scale: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 bg-zinc-700 rounded h-1 cursor-pointer"
                  />
                </div>

                {/* Position Y */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Position Y</span>
                    <span className="font-mono">{selectedGraphic.y}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={selectedGraphic.y}
                    onChange={(e) => updateSelectedGraphic({ y: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 bg-zinc-700 rounded h-1 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
