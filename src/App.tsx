import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AspectRatio, ProjectState, VideoClip, TextOverlay, AudioTrack, GraphicOverlay } from './types';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { ToolTabs } from './components/ToolTabs';
import { ExportModal } from './components/ExportModal';
import { SnapshotModal } from './components/SnapshotModal';
import { DEFAULT_FILTER, generateSyntheticClip } from './utils/sampleClips';
import { renderPresetAudioBuffer } from './utils/audioSynth';
import { Loader2 } from 'lucide-react';

const INITIAL_PROJECT: ProjectState = {
  title: 'Cinematic Creation',
  aspectRatio: '16:9',
  canvasBackgroundColor: '#000000',
  clips: [],
  textOverlays: [],
  graphicOverlays: [],
  audioTracks: [],
};

export default function App() {
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Selections
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // Undo / Redo stacks
  const [history, setHistory] = useState<ProjectState[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectState[]>([]);

  // Persistent Media Element caches
  const mediaElementsMap = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioElementsMap = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Push new state to history
  const handleProjectChange = useCallback((newProject: ProjectState, pushToHistory = true) => {
    if (pushToHistory) {
      setHistory((prev) => [...prev.slice(-20), project]);
      setRedoStack([]);
    }
    setProject(newProject);
  }, [project]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [project, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setProject(previous);
  }, [history, project]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((prev) => [...prev, project]);
    setRedoStack((prev) => prev.slice(1));
    setProject(next);
  }, [redoStack, project]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Maintain HTML media elements cache
  useEffect(() => {
    // Synchronize video clips
    const currentClipIds = new Set(project.clips.map((c) => c.id));
    // Cleanup removed elements
    for (const [id, el] of mediaElementsMap.current.entries()) {
      if (!currentClipIds.has(id)) {
        if (el instanceof HTMLVideoElement) {
          el.pause();
          el.src = '';
        }
        mediaElementsMap.current.delete(id);
      }
    }

    // Add or verify new elements
    project.clips.forEach((clip) => {
      if (!mediaElementsMap.current.has(clip.id)) {
        if (clip.type === 'video') {
          const v = document.createElement('video');
          v.preload = 'auto';
          v.muted = clip.isMuted;
          v.playsInline = true;
          v.crossOrigin = 'anonymous';
          v.src = clip.src;
          mediaElementsMap.current.set(clip.id, v);
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;
          mediaElementsMap.current.set(clip.id, img);
        }
      }
    });

    // Synchronize audio tracks
    const currentAudioIds = new Set(project.audioTracks.map((a) => a.id));
    for (const [id, audio] of audioElementsMap.current.entries()) {
      if (!currentAudioIds.has(id)) {
        audio.pause();
        audio.src = '';
        audioElementsMap.current.delete(id);
      }
    }

    project.audioTracks.forEach((track) => {
      if (!audioElementsMap.current.has(track.id)) {
        const a = new Audio(track.src);
        a.preload = 'auto';
        a.crossOrigin = 'anonymous';
        audioElementsMap.current.set(track.id, a);
      }
    });
  }, [project.clips, project.audioTracks]);

  // Load Demo Project function
  const loadDemoProject = useCallback(async () => {
    setIsInitializing(true);
    try {
      // 1. Generate sunset drone footage
      const clip1 = await generateSyntheticClip('sunset', 5);
      // 2. Generate cyberpunk synthwave footage
      const clip2 = await generateSyntheticClip('cyberpunk', 5);
      // 3. Generate lofi ambient background audio track
      const synthAudio = await renderPresetAudioBuffer('lofi_ambient', 10);

      const demoClips: VideoClip[] = [
        {
          id: `clip_${Date.now()}_1`,
          name: 'Golden Hour Drone',
          type: 'video',
          src: clip1.blobUrl,
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
          transition: 'cross-dissolve',
          transitionDuration: 0.8,
          filter: {
            ...DEFAULT_FILTER,
            brightness: 105,
            contrast: 120,
            saturation: 130,
            vignette: 20,
            presetName: 'Cinematic Teal/Orange',
          },
          thumbnail: clip1.thumbnail,
        },
        {
          id: `clip_${Date.now()}_2`,
          name: 'Cyber City Grid',
          type: 'video',
          src: clip2.blobUrl,
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
          filter: {
            ...DEFAULT_FILTER,
            brightness: 110,
            contrast: 130,
            saturation: 160,
            presetName: 'Cyber Neon',
          },
          thumbnail: clip2.thumbnail,
        },
      ];

      const demoText: TextOverlay[] = [
        {
          id: `text_${Date.now()}_1`,
          text: 'CINEMATIC VISION',
          startTime: 0.4,
          duration: 4.2,
          x: 50,
          y: 35,
          fontSize: 68,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '800',
          color: '#ffffff',
          backgroundColor: '#000000',
          backgroundOpacity: 0,
          strokeColor: '#000000',
          strokeWidth: 0,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 14,
          animation: 'pop',
          textAlign: 'center',
        },
        {
          id: `text_${Date.now()}_2`,
          text: 'High Resolution • 4K UHD Master',
          startTime: 1.2,
          duration: 3.4,
          x: 50,
          y: 48,
          fontSize: 34,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          color: '#fde047',
          backgroundColor: '#000000',
          backgroundOpacity: 60,
          strokeColor: '#000000',
          strokeWidth: 0,
          shadowColor: 'rgba(0,0,0,0.8)',
          shadowBlur: 8,
          animation: 'fade',
          textAlign: 'center',
        },
      ];

      const demoGraphics: GraphicOverlay[] = [
        {
          id: `graphic_${Date.now()}_1`,
          type: 'badge',
          content: '4K ULTRA HD',
          label: 'Master',
          startTime: 0.5,
          duration: 8.5,
          x: 88,
          y: 12,
          scale: 0.9,
          opacity: 0.9,
        },
      ];

      const demoAudio: AudioTrack[] = [
        {
          id: `audio_${Date.now()}_1`,
          name: 'Lofi Sunset Chill',
          src: synthAudio.blobUrl,
          type: 'synth',
          synthPreset: 'lofi_ambient',
          startTime: 0,
          duration: 10,
          trimStart: 0,
          trimEnd: 10,
          volume: 0.85,
          fadeIn: 0.5,
          fadeOut: 1.0,
          isMuted: false,
          loop: true,
        },
      ];

      const demoProject: ProjectState = {
        title: 'Cinematic Horizon',
        aspectRatio: '16:9',
        canvasBackgroundColor: '#000000',
        clips: demoClips,
        textOverlays: demoText,
        graphicOverlays: demoGraphics,
        audioTracks: demoAudio,
      };

      setProject(demoProject);
      setSelectedClipId(demoClips[0].id);
      setCurrentTime(0);
    } catch (err) {
      console.error('Failed to load demo project', err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDemoProject();
  }, [loadDemoProject]);

  const handleResetProject = () => {
    if (confirm('Clear the entire project and start with a blank timeline?')) {
      handleProjectChange({
        title: 'New Video Project',
        aspectRatio: '16:9',
        canvasBackgroundColor: '#000000',
        clips: [],
        textOverlays: [],
        graphicOverlays: [],
        audioTracks: [],
      });
      setSelectedClipId(null);
      setSelectedTextId(null);
      setSelectedAudioId(null);
      setSelectedGraphicId(null);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Navigation Header */}
      <Header
        title={project.title}
        onTitleChange={(title) => handleProjectChange({ ...project, title }, false)}
        aspectRatio={project.aspectRatio}
        onAspectRatioChange={(aspectRatio) => handleProjectChange({ ...project, aspectRatio })}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onResetProject={handleResetProject}
        onLoadDemoProject={loadDemoProject}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        hasClips={project.clips.length > 0}
      />

      {/* Main Workspace: Left ToolTabs, Center VideoPlayer */}
      <div className="flex-1 flex min-h-0 relative">
        {isInitializing ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-zinc-200">Preparing Studio & Footage...</span>
              <span className="text-xs text-zinc-500">Synthesizing demo clips and royalty-free music</span>
            </div>
          </div>
        ) : (
          <>
            {/* Left Sidebar: Tools, Filters, Text, Audio, Stickers */}
            <ToolTabs
              project={project}
              onProjectChange={handleProjectChange}
              selectedClipId={selectedClipId}
              onSelectClip={setSelectedClipId}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              selectedAudioId={selectedAudioId}
              onSelectAudio={setSelectedAudioId}
              selectedGraphicId={selectedGraphicId}
              onSelectGraphic={setSelectedGraphicId}
              currentTime={currentTime}
            />

            {/* Center Canvas Preview Viewport */}
            <VideoPlayer
              project={project}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              mediaElementsMap={mediaElementsMap.current}
              audioElementsMap={audioElementsMap.current}
            />
          </>
        )}
      </div>

      {/* Bottom Multi-Track Timeline */}
      {!isInitializing && (
        <Timeline
          clips={project.clips}
          onClipsChange={(clips) => handleProjectChange({ ...project, clips })}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
          textOverlays={project.textOverlays}
          onTextOverlaysChange={(textOverlays) => handleProjectChange({ ...project, textOverlays })}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
          audioTracks={project.audioTracks}
          onAudioTracksChange={(audioTracks) => handleProjectChange({ ...project, audioTracks })}
          selectedAudioId={selectedAudioId}
          onSelectAudio={setSelectedAudioId}
          graphicOverlays={project.graphicOverlays}
          onGraphicOverlaysChange={(graphicOverlays) => handleProjectChange({ ...project, graphicOverlays })}
          selectedGraphicId={selectedGraphicId}
          onSelectGraphic={setSelectedGraphicId}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
        />
      )}

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />

      {/* Frame Snapshot Grabber Modal */}
      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        project={project}
        currentTime={currentTime}
        mediaElementsMap={mediaElementsMap.current}
      />
    </div>
  );
}
