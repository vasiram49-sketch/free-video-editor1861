import React, { useState, useRef } from 'react';
import { ExportSettings, ProjectState } from '../types';
import { exportVideo, RenderProgress } from '../utils/videoRenderer';
import confetti from 'canvas-confetti';
import { 
  X, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Video, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

export function ExportModal({ isOpen, onClose, project }: ExportModalProps) {
  const [resolutionPreset, setResolutionPreset] = useState<'4k' | '1440p' | '1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [bitratePreset, setBitratePreset] = useState<'high' | 'medium' | 'fast'>('high');
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm');
  const [includeAudio, setIncludeAudio] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  // Calculate pixel dimensions based on project aspect ratio
  const getDimensions = () => {
    const isVertical = project.aspectRatio === '9:16';
    const isSquare = project.aspectRatio === '1:1';
    const isPortrait = project.aspectRatio === '4:5';
    const isUltrawide = project.aspectRatio === '21:9';

    if (resolutionPreset === '4k') {
      if (isVertical) return { width: 2160, height: 3840 };
      if (isSquare) return { width: 2160, height: 2160 };
      if (isPortrait) return { width: 2160, height: 2700 };
      if (isUltrawide) return { width: 5120, height: 2160 };
      return { width: 3840, height: 2160 };
    }
    if (resolutionPreset === '1440p') {
      if (isVertical) return { width: 1440, height: 2560 };
      if (isSquare) return { width: 1440, height: 1440 };
      if (isPortrait) return { width: 1440, height: 1800 };
      if (isUltrawide) return { width: 3440, height: 1440 };
      return { width: 2560, height: 1440 };
    }
    if (resolutionPreset === '1080p') {
      if (isVertical) return { width: 1080, height: 1920 };
      if (isSquare) return { width: 1080, height: 1080 };
      if (isPortrait) return { width: 1080, height: 1350 };
      if (isUltrawide) return { width: 2560, height: 1080 };
      return { width: 1920, height: 1080 };
    }
    // 720p
    if (isVertical) return { width: 720, height: 1280 };
    if (isSquare) return { width: 720, height: 720 };
    if (isPortrait) return { width: 720, height: 900 };
    if (isUltrawide) return { width: 1680, height: 720 };
    return { width: 1280, height: 720 };
  };

  const { width, height } = getDimensions();

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setProgress(null);
    setExportedBlob(null);
    setExportedUrl(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const settings: ExportSettings = {
      resolutionPreset,
      width,
      height,
      fps,
      bitratePreset,
      format,
      includeAudio,
    };

    try {
      const blob = await exportVideo(
        project,
        settings,
        (prog) => setProgress(prog),
        controller.signal
      );

      const url = URL.createObjectURL(blob);
      setExportedBlob(blob);
      setExportedUrl(url);

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignored
      }
    } catch (err: unknown) {
      if ((err as Error).message !== 'Export cancelled by user') {
        setErrorMsg((err as Error).message || 'Export failed. Please try a lower resolution.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  };

  const handleDownload = () => {
    if (!exportedUrl) return;
    const a = document.createElement('a');
    a.href = exportedUrl;
    const sanitizedTitle = (project.title || 'video').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ext = format === 'mp4' ? 'mp4' : 'webm';
    a.download = `${sanitizedTitle}_${resolutionPreset}_${height}p.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                Export High-Resolution Video
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Free • No Watermark
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                100% private, rendered in full fidelity directly on your device.
              </p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isExporting && !exportedBlob ? (
            <>
              {/* Resolution Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Export Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '4k', label: '4K Ultra HD', desc: `${width} × ${height}`, badge: 'Highest' },
                    { id: '1440p', label: '1440p QHD', desc: '2K Quad HD', badge: 'Crisp' },
                    { id: '1080p', label: '1080p Full HD', desc: 'Crisp & Fast', badge: 'Standard' },
                    { id: '720p', label: '720p HD', desc: 'Lightweight & Quick', badge: 'Fast' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setResolutionPreset(item.id as typeof resolutionPreset)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        resolutionPreset === item.id
                          ? 'bg-rose-950/60 border-rose-500 text-white shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-850 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs text-zinc-100">{item.label}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FPS & Quality Presets */}
              <div className="grid grid-cols-2 gap-3">
                {/* Framerate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Framerate (FPS)</label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    {[24, 30, 60].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFps(f as typeof fps)}
                        className={`py-1 text-xs font-mono font-medium rounded transition-colors ${
                          fps === f
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f} fps
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bitrate / Quality */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Bitrate Profile</label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    {[
                      { id: 'high', label: 'Max' },
                      { id: 'medium', label: 'Balanced' },
                      { id: 'fast', label: 'Web' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBitratePreset(b.id as typeof bitratePreset)}
                        className={`py-1 text-xs font-medium rounded transition-colors ${
                          bitratePreset === b.id
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format & Audio Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Video Format</label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    {(['webm', 'mp4'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`py-1 text-xs font-mono uppercase font-medium rounded transition-colors ${
                          format === fmt
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Mixdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Include Audio</label>
                  <button
                    onClick={() => setIncludeAudio(!includeAudio)}
                    className={`w-full py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${
                      includeAudio
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>{includeAudio ? 'Audio Tracks Mixed' : 'Muted (Video Only)'}</span>
                    <span className="text-[10px] font-mono">{includeAudio ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Summary Note */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  Rendering produces an uncompressed, high-bitrate master at <strong className="text-zinc-200">{width}×{height}</strong> at <strong className="text-zinc-200">{fps} FPS</strong> with zero ads or watermarks.
                </span>
              </div>
            </>
          ) : isExporting ? (
            /* Active Progress State */
            <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
              {progress?.previewDataUrl && (
                <div className="w-48 h-28 rounded-lg overflow-hidden border border-zinc-700 shadow-md bg-black relative">
                  <img src={progress.previewDataUrl} alt="Rendering frame" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 text-zinc-300 px-1 py-0.2 rounded font-mono">
                    Frame {progress.currentFrame}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-2xl font-black font-mono text-rose-500">
                  {progress?.percent || 0}%
                </div>
                <p className="text-xs text-zinc-300 font-medium">
                  Rendering frames ({progress?.currentFrame || 0} / {progress?.totalFrames || '...'})
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Elapsed: {progress?.elapsedSec || 0}s • Remaining ~ {progress?.estimatedRemainingSec || 0}s
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-600 to-amber-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>

              <button
                onClick={handleCancelExport}
                className="px-4 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
              >
                Cancel Export
              </button>
            </div>
          ) : (
            /* Completed Ready State */
            <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-white">Video Ready for Download!</h3>
                <p className="text-xs text-zinc-400">
                  Exported in {resolutionPreset.toUpperCase()} ({width}×{height}) • {fps} FPS • {((exportedBlob?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              {exportedUrl && (
                <div className="w-full max-h-48 rounded-lg overflow-hidden border border-zinc-700 bg-black">
                  <video src={exportedUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save Video File</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Free, Ad-Free & Watermark-Free</span>
          {!isExporting && !exportedBlob && (
            <button
              onClick={handleStartExport}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Start Export</span>
            </button>
          )}
          {exportedBlob && (
            <button
              onClick={() => {
                setExportedBlob(null);
                setExportedUrl(null);
              }}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Export Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
