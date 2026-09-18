import React, { useRef, useState } from 'react';
import { VideoClip, TextOverlay, AudioTrack, GraphicOverlay } from '../types';
import { calculateTotalDuration, getClipAtTime } from '../utils/videoRenderer';
import { 
  Scissors, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Volume2, 
  VolumeX, 
  Type, 
  Music, 
  Video, 
  Smile,
  Sparkles
} from 'lucide-react';

interface TimelineProps {
  clips: VideoClip[];
  onClipsChange: (clips: VideoClip[]) => void;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  textOverlays: TextOverlay[];
  onTextOverlaysChange: (texts: TextOverlay[]) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  audioTracks: AudioTrack[];
  onAudioTracksChange: (tracks: AudioTrack[]) => void;
  selectedAudioId: string | null;
  onSelectAudio: (id: string | null) => void;
  graphicOverlays: GraphicOverlay[];
  onGraphicOverlaysChange: (overlays: GraphicOverlay[]) => void;
  selectedGraphicId: string | null;
  onSelectGraphic: (id: string | null) => void;
  currentTime: number;
  onTimeChange: (time: number) => void;
}

export function Timeline({
  clips,
  onClipsChange,
  selectedClipId,
  onSelectClip,
  textOverlays,
  onTextOverlaysChange,
  selectedTextId,
  onSelectText,
  audioTracks,
  onAudioTracksChange,
  selectedAudioId,
  onSelectAudio,
  graphicOverlays,
  onGraphicOverlaysChange,
  selectedGraphicId,
  onSelectGraphic,
  currentTime,
  onTimeChange,
}: TimelineProps) {
  const [zoom, setZoom] = useState(30); // pixels per second (15 to 100)
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingPlayhead = useRef(false);

  const totalDuration = Math.max(10, calculateTotalDuration(clips));
  const timelineWidth = Math.max(800, totalDuration * zoom);

  // Split active clip at playhead
  const handleSplitAtPlayhead = () => {
    const clipInfo = getClipAtTime(clips, currentTime);
    if (!clipInfo) return;

    const { clip, clipIndex, clipStartTime } = clipInfo;
    const splitPointMedia = clip.trimStart + (currentTime - clipStartTime) * (clip.playbackRate || 1);

    // Don't split if too close to edges (within 0.2s)
    if (splitPointMedia - clip.trimStart < 0.2 || clip.trimEnd - splitPointMedia < 0.2) {
      return;
    }

    const firstHalf: VideoClip = {
      ...clip,
      id: `clip_${Date.now()}_1`,
      trimEnd: splitPointMedia,
      transition: 'none',
    };

    const secondHalf: VideoClip = {
      ...clip,
      id: `clip_${Date.now()}_2`,
      trimStart: splitPointMedia,
    };

    const updated = [...clips];
    updated.splice(clipIndex, 1, firstHalf, secondHalf);
    onClipsChange(updated);
    onSelectClip(secondHalf.id);
  };

  // Duplicate selected clip
  const handleDuplicateClip = () => {
    if (!selectedClipId) return;
    const index = clips.findIndex((c) => c.id === selectedClipId);
    if (index === -1) return;

    const source = clips[index];
    const duplicate: VideoClip = {
      ...source,
      id: `clip_${Date.now()}`,
      name: `${source.name} (Copy)`,
    };

    const updated = [...clips];
    updated.splice(index + 1, 0, duplicate);
    onClipsChange(updated);
    onSelectClip(duplicate.id);
  };

  // Delete selected item (clip, text, audio, or sticker)
  const handleDeleteSelected = () => {
    if (selectedClipId) {
      const updated = clips.filter((c) => c.id !== selectedClipId);
      onClipsChange(updated);
      onSelectClip(null);
    } else if (selectedTextId) {
      onTextOverlaysChange(textOverlays.filter((t) => t.id !== selectedTextId));
      onSelectText(null);
    } else if (selectedAudioId) {
      onAudioTracksChange(audioTracks.filter((a) => a.id !== selectedAudioId));
      onSelectAudio(null);
    } else if (selectedGraphicId) {
      onGraphicOverlaysChange(graphicOverlays.filter((g) => g.id !== selectedGraphicId));
      onSelectGraphic(null);
    }
  };

  // Re-order clips
  const handleMoveClip = (direction: 'left' | 'right') => {
    if (!selectedClipId) return;
    const index = clips.findIndex((c) => c.id === selectedClipId);
    if (index === -1) return;

    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clips.length) return;

    const updated = [...clips];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    onClipsChange(updated);
  };

  // Timeline scrubber pointer down
  const handleTimelinePointerDown = (e: React.PointerEvent) => {
    if (!timelineScrollRef.current) return;
    isDraggingPlayhead.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const updatePlayhead = (clientX: number) => {
      const rect = timelineScrollRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrollLeft = timelineScrollRef.current?.scrollLeft || 0;
      const offsetX = clientX - rect.left + scrollLeft;
      const newTime = Math.max(0, Math.min(totalDuration, offsetX / zoom));
      onTimeChange(newTime);
    };

    updatePlayhead(e.clientX);
  };

  const handleTimelinePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPlayhead.current || !timelineScrollRef.current) return;
    const rect = timelineScrollRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollRef.current.scrollLeft || 0;
    const offsetX = e.clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, Math.min(totalDuration, offsetX / zoom));
    onTimeChange(newTime);
  };

  const handleTimelinePointerUp = (e: React.PointerEvent) => {
    isDraggingPlayhead.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Clip Trim Dragging
  const handleTrimDrag = (
    clip: VideoClip,
    edge: 'start' | 'end',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialTrimStart = clip.trimStart;
    const initialTrimEnd = clip.trimEnd;
    const playbackRate = clip.playbackRate || 1;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaPx = moveEv.clientX - startX;
      const deltaSec = (deltaPx / zoom) * playbackRate;

      let newStart = initialTrimStart;
      let newEnd = initialTrimEnd;

      if (edge === 'start') {
        newStart = Math.max(0, Math.min(initialTrimEnd - 0.2, initialTrimStart + deltaSec));
      } else {
        newEnd = Math.min(clip.duration, Math.max(initialTrimStart + 0.2, initialTrimEnd + deltaSec));
      }

      onClipsChange(
        clips.map((c) => (c.id === clip.id ? { ...c, trimStart: newStart, trimEnd: newEnd } : c))
      );
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Compute accumulated start offsets for clips
  let accumulatedTime = 0;
  const clipPlacements = clips.map((clip) => {
    const effectiveDuration = (clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1);
    const placement = {
      clip,
      startTime: accumulatedTime,
      duration: effectiveDuration,
      left: accumulatedTime * zoom,
      width: Math.max(20, effectiveDuration * zoom),
    };
    accumulatedTime += effectiveDuration;
    return placement;
  });

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  return (
    <div className="h-64 border-t border-zinc-800 bg-zinc-950 flex flex-col select-none text-zinc-300">
      {/* Timeline Toolbar */}
      <div className="h-10 px-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-2 text-xs">
        {/* Left tools: Split, Duplicate, Delete, Reorder */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSplitAtPlayhead}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium transition-colors cursor-pointer"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-rose-400" />
            <span>Split</span>
          </button>

          <button
            onClick={handleDuplicateClip}
            disabled={!selectedClipId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium disabled:opacity-40 transition-colors"
            title="Duplicate Selected Clip"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!selectedClipId && !selectedTextId && !selectedAudioId && !selectedGraphicId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-300 font-medium disabled:opacity-40 transition-colors"
            title="Delete Selected Item (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          {/* Move left / right */}
          <button
            onClick={() => handleMoveClip('left')}
            disabled={!selectedClipId || clips.findIndex((c) => c.id === selectedClipId) === 0}
            className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Move Clip Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleMoveClip('right')}
            disabled={!selectedClipId || clips.findIndex((c) => c.id === selectedClipId) === clips.length - 1}
            className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Move Clip Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Selected Clip Quick Info */}
          {selectedClip && (
            <div className="hidden lg:flex items-center gap-2 ml-2 text-[11px] text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-750">
              <span className="text-zinc-200 font-medium truncate max-w-[120px]">{selectedClip.name}</span>
              <span>•</span>
              <span>{((selectedClip.trimEnd - selectedClip.trimStart) / (selectedClip.playbackRate || 1)).toFixed(1)}s</span>
              {selectedClip.playbackRate !== 1 && (
                <span className="text-amber-400 font-mono">{selectedClip.playbackRate}x</span>
              )}
            </div>
          )}
        </div>

        {/* Right tools: Zoom */}
        <div className="flex items-center gap-2">
          <ZoomOut className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="range"
            min={15}
            max={80}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-20 sm:w-28 h-1 accent-rose-500 bg-zinc-700 rounded cursor-pointer"
            title="Timeline Zoom"
          />
          <ZoomIn className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Track Headers Column */}
        <div className="w-28 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col text-[11px] font-medium text-zinc-400 select-none">
          <div className="h-6 border-b border-zinc-800/80 px-2.5 flex items-center text-zinc-500 text-[10px] uppercase font-mono">
            Tracks
          </div>
          {/* Overlay Text Track Header */}
          <div className="h-10 border-b border-zinc-800/60 px-2.5 flex items-center gap-1.5 text-zinc-300">
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>Text / Title</span>
          </div>
          {/* Stickers / Badges Track Header */}
          <div className="h-10 border-b border-zinc-800/60 px-2.5 flex items-center gap-1.5 text-zinc-300">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Stickers</span>
          </div>
          {/* Video Track Header */}
          <div className="h-14 border-b border-zinc-800/60 px-2.5 flex items-center gap-1.5 text-zinc-200">
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Video Track</span>
          </div>
          {/* Audio Track Header */}
          <div className="h-11 border-b border-zinc-800/60 px-2.5 flex items-center gap-1.5 text-zinc-300">
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audio / Music</span>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div
          ref={timelineScrollRef}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-zinc-950 cursor-crosshair scrollbar-thin"
        >
          <div style={{ width: `${timelineWidth}px` }} className="relative h-full select-none">
            {/* Time Ruler (Seconds markers) */}
            <div className="h-6 border-b border-zinc-800/80 bg-zinc-900/40 relative pointer-events-none">
              {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
                const isMajor = sec % 5 === 0;
                return (
                  <div
                    key={sec}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${sec * zoom}px` }}
                  >
                    <div className={`w-[1px] ${isMajor ? 'h-3 bg-zinc-500' : 'h-1.5 bg-zinc-700'}`} />
                    {isMajor && (
                      <span className="text-[9px] font-mono text-zinc-400 mt-0.5 transform -translate-x-1/2">
                        {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Track 1: Text Overlays */}
            <div className="h-10 border-b border-zinc-900/60 relative p-1">
              {textOverlays.map((text) => {
                const left = text.startTime * zoom;
                const width = Math.max(30, text.duration * zoom);
                const isSelected = selectedTextId === text.id;
                return (
                  <div
                    key={text.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectText(text.id);
                      onSelectClip(null);
                      onSelectAudio(null);
                      onSelectGraphic(null);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-[11px] font-medium transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-cyan-600/90 text-white ring-2 ring-cyan-400 shadow-md'
                        : 'bg-cyan-950/80 border border-cyan-800/60 text-cyan-200 hover:bg-cyan-900/70'
                    }`}
                  >
                    <span className="truncate">{text.text || 'Text'}</span>
                  </div>
                );
              })}
            </div>

            {/* Track 2: Graphic / Sticker Overlays */}
            <div className="h-10 border-b border-zinc-900/60 relative p-1">
              {graphicOverlays.map((ov) => {
                const left = ov.startTime * zoom;
                const width = Math.max(30, ov.duration * zoom);
                const isSelected = selectedGraphicId === ov.id;
                return (
                  <div
                    key={ov.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGraphic(ov.id);
                      onSelectClip(null);
                      onSelectText(null);
                      onSelectAudio(null);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded px-2 flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-amber-600/90 text-white ring-2 ring-amber-400 shadow-md'
                        : 'bg-amber-950/80 border border-amber-800/60 text-amber-200 hover:bg-amber-900/70'
                    }`}
                  >
                    <span>{ov.content}</span>
                    <span className="truncate">{ov.label || ov.type}</span>
                  </div>
                );
              })}
            </div>

            {/* Track 3: Main Video Clips */}
            <div className="h-14 border-b border-zinc-900/60 relative flex items-center p-1 bg-zinc-950/50">
              {clipPlacements.map(({ clip, left, width }) => {
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                      onSelectText(null);
                      onSelectAudio(null);
                      onSelectGraphic(null);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg overflow-hidden flex items-center justify-between text-xs transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-rose-950/90 ring-2 ring-rose-500 shadow-lg shadow-rose-950/60'
                        : 'bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80'
                    }`}
                  >
                    {/* Left Trim Handle */}
                    <div
                      onPointerDown={(e) => handleTrimDrag(clip, 'start', e)}
                      className="w-2.5 h-full bg-zinc-700 hover:bg-rose-500 active:bg-rose-600 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Drag to trim start"
                    >
                      <div className="w-[1px] h-3 bg-white" />
                    </div>

                    {/* Clip Content & Thumbnail preview */}
                    <div className="flex-1 px-2 flex items-center gap-2 overflow-hidden pointer-events-none">
                      {clip.thumbnail && (
                        <img
                          src={clip.thumbnail}
                          alt=""
                          className="w-8 h-8 rounded object-cover flex-shrink-0 border border-zinc-700"
                        />
                      )}
                      <div className="flex flex-col truncate">
                        <span className="font-medium text-white truncate text-[11px] leading-tight">
                          {clip.name}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {((clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1)).toFixed(1)}s
                          {clip.transition !== 'none' && ` • ${clip.transition}`}
                        </span>
                      </div>
                    </div>

                    {/* Right Trim Handle */}
                    <div
                      onPointerDown={(e) => handleTrimDrag(clip, 'end', e)}
                      className="w-2.5 h-full bg-zinc-700 hover:bg-rose-500 active:bg-rose-600 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Drag to trim end"
                    >
                      <div className="w-[1px] h-3 bg-white" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Track 4: Audio Tracks */}
            <div className="h-11 border-b border-zinc-900/60 relative p-1">
              {audioTracks.map((track) => {
                const left = track.startTime * zoom;
                const width = Math.max(30, track.duration * zoom);
                const isSelected = selectedAudioId === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAudio(track.id);
                      onSelectClip(null);
                      onSelectText(null);
                      onSelectGraphic(null);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded px-2.5 flex items-center justify-between text-[11px] font-medium transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-emerald-600/90 text-white ring-2 ring-emerald-400 shadow-md'
                        : 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-200 hover:bg-emerald-900/70'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Music className="w-3 h-3 flex-shrink-0 text-emerald-300" />
                      <span className="truncate">{track.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 ml-1">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Playhead Needle Indicator */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center"
              style={{ left: `${currentTime * zoom}px` }}
            >
              {/* Needle Head Handle */}
              <div className="w-3.5 h-3.5 bg-rose-500 rounded-b-sm rotate-45 transform -translate-y-1 shadow-md shadow-rose-950" />
              {/* Vertical line */}
              <div className="w-[2px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
