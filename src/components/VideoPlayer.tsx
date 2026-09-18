import { useEffect, useRef, useState } from 'react';
import { ProjectState } from '../types';
import { drawFrame, calculateTotalDuration } from '../utils/videoRenderer';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Repeat, 
  Grid
} from 'lucide-react';

interface VideoPlayerProps {
  project: ProjectState;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  mediaElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>;
  audioElementsMap: Map<string, HTMLAudioElement>;
}

export function VideoPlayer({
  project,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onTogglePlay,
  mediaElementsMap,
  audioElementsMap,
}: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showGuides, setShowGuides] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);

  const totalDuration = calculateTotalDuration(project.clips);

  // Parse aspect ratio dimensions for preview display
  const getAspectDimensions = () => {
    switch (project.aspectRatio) {
      case '9:16':
        return { width: 540, height: 960, cssRatio: '9 / 16' };
      case '1:1':
        return { width: 720, height: 720, cssRatio: '1 / 1' };
      case '4:5':
        return { width: 720, height: 900, cssRatio: '4 / 5' };
      case '21:9':
        return { width: 1050, height: 450, cssRatio: '21 / 9' };
      case '16:9':
      default:
        return { width: 960, height: 540, cssRatio: '16 / 9' };
    }
  };

  const { width: renderW, height: renderH, cssRatio } = getAspectDimensions();

  // Draw current frame on canvas whenever currentTime, project, or media updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawFrame(ctx, renderW, renderH, project, currentTime, mediaElementsMap);

    // Sync HTML media elements to currentTime
    let accumulatedTime = 0;
    project.clips.forEach((clip) => {
      const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1);
      const mediaEl = mediaElementsMap.get(clip.id);
      if (mediaEl instanceof HTMLVideoElement) {
        if (currentTime >= accumulatedTime && currentTime <= accumulatedTime + clipDuration) {
          const localTime = clip.trimStart + (currentTime - accumulatedTime) * (clip.playbackRate || 1);
          if (Math.abs(mediaEl.currentTime - localTime) > 0.15) {
            mediaEl.currentTime = localTime;
          }
          mediaEl.volume = isMuted || clip.isMuted ? 0 : Math.min(1, clip.volume * volume);
        }
      }
      accumulatedTime += clipDuration;
    });

    // Sync audio tracks
    project.audioTracks.forEach((track) => {
      const audioEl = audioElementsMap.get(track.id);
      if (audioEl) {
        const trackEnd = track.startTime + track.duration;
        if (currentTime >= track.startTime && currentTime <= trackEnd) {
          const localTime = track.trimStart + (currentTime - track.startTime);
          if (Math.abs(audioEl.currentTime - localTime) > 0.2) {
            audioEl.currentTime = localTime;
          }
          audioEl.volume = isMuted || track.isMuted ? 0 : Math.min(1, track.volume * volume);
          if (isPlaying && audioEl.paused) {
            audioEl.play().catch(() => {});
          }
        } else {
          if (!audioEl.paused) {
            audioEl.pause();
          }
        }
      }
    });
  }, [currentTime, project, renderW, renderH, mediaElementsMap, audioElementsMap, isMuted, volume, isPlaying]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying) {
      // Pause all playing audio elements
      audioElementsMap.forEach((audio) => audio.pause());
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (totalDuration > 0) {
        const nextTime = currentTime + delta;
        if (nextTime >= totalDuration) {
          if (isLooping) {
            onTimeUpdate(0);
          } else {
            onTimeUpdate(totalDuration);
            onTogglePlay(); // Pause at end
            return;
          }
        } else {
          onTimeUpdate(nextTime);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, totalDuration, isLooping, onTimeUpdate, onTogglePlay, audioElementsMap]);

  // Keyboard shortcut for spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onTimeUpdate(Math.max(0, currentTime - (e.shiftKey ? 1.0 : 1 / 30)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onTimeUpdate(Math.min(totalDuration, currentTime + (e.shiftKey ? 1.0 : 1 / 30)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onTimeUpdate, currentTime, totalDuration]);

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-zinc-950 flex flex-col items-center justify-center p-3 relative overflow-hidden select-none"
    >
      {/* Canvas Display Viewport */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
        <div 
          className="relative max-h-full max-w-full rounded-lg overflow-hidden shadow-2xl border border-zinc-800 bg-black flex items-center justify-center"
          style={{ aspectRatio: cssRatio }}
        >
          <canvas
            ref={canvasRef}
            width={renderW}
            height={renderH}
            className="w-full h-full object-contain"
          />

          {/* Optional Safe Area Guides for Mobile/Social overlay */}
          {showGuides && (
            <div className="absolute inset-0 pointer-events-none border border-dashed border-cyan-500/40 m-[10%] rounded flex items-center justify-center">
              <span className="text-[10px] text-cyan-400/70 bg-zinc-950/80 px-2 py-0.5 rounded">
                Safe Area Zone (90%)
              </span>
            </div>
          )}

          {/* Quick empty state placeholder */}
          {project.clips.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400 p-6 text-center">
              <p className="text-sm font-semibold text-zinc-200 mb-1">No Media in Timeline</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Import videos/images from the Media tab or click "Demo Clips" above to get started immediately.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Transport Bar */}
      <div className="w-full max-w-2xl mt-2 flex items-center justify-between gap-4 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md text-zinc-300 shadow-lg">
        {/* Left: Time display */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-white font-medium">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTimeUpdate(0)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => onTimeUpdate(Math.max(0, currentTime - 1 / 30))}
            className="px-1.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            title="Previous Frame (Left Arrow)"
          >
            -1f
          </button>

          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-950/40 transition-all mx-1 cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
          </button>

          <button
            onClick={() => onTimeUpdate(Math.min(totalDuration, currentTime + 1 / 30))}
            className="px-1.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            title="Next Frame (Right Arrow)"
          >
            +1f
          </button>

          <button
            onClick={() => onTimeUpdate(totalDuration)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Jump to End"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio, Guides, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLooping ? 'text-rose-400 bg-rose-500/15' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Toggle Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Safe guides */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`p-1.5 rounded-lg transition-colors ${
              showGuides ? 'text-cyan-400 bg-cyan-500/15' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Toggle Social & TV Safe Area Guides"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-14 h-1 accent-rose-500 bg-zinc-700 rounded cursor-pointer"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
