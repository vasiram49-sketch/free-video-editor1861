import React, { useState, useEffect } from 'react';
import { ProjectState } from '../types';
import { captureHighResSnapshot } from '../utils/videoRenderer';
import { X, Camera, Download, Check } from 'lucide-react';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  currentTime: number;
  mediaElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>;
}

export function SnapshotModal({
  isOpen,
  onClose,
  project,
  currentTime,
  mediaElementsMap,
}: SnapshotModalProps) {
  const [resolution, setResolution] = useState<'4k' | '1080p'>('4k');
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const isVertical = project.aspectRatio === '9:16';
    const isSquare = project.aspectRatio === '1:1';
    let width = 3840;
    let height = 2160;

    if (resolution === '4k') {
      if (isVertical) { width = 2160; height = 3840; }
      else if (isSquare) { width = 2160; height = 2160; }
      else { width = 3840; height = 2160; }
    } else {
      if (isVertical) { width = 1080; height = 1920; }
      else if (isSquare) { width = 1080; height = 1080; }
      else { width = 1920; height = 1080; }
    }

    try {
      const dataUrl = captureHighResSnapshot(project, currentTime, { width, height }, mediaElementsMap, format);
      setSnapshotUrl(dataUrl);
    } catch (err) {
      console.error(err);
    }
  }, [isOpen, resolution, format, project, currentTime, mediaElementsMap]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!snapshotUrl) return;
    const a = document.createElement('a');
    a.href = snapshotUrl;
    const ext = format === 'image/png' ? 'png' : 'jpg';
    a.download = `${(project.title || 'frame').toLowerCase()}_snapshot_${resolution}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-zinc-200">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Capture High-Res Frame</h2>
              <p className="text-[11px] text-zinc-400">At {currentTime.toFixed(2)}s with all color grades & text</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image Preview */}
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-black flex items-center justify-center">
            {snapshotUrl ? (
              <img src={snapshotUrl} alt="Snapshot Preview" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-zinc-500">Generating preview...</span>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Resolution</label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setResolution('4k')}
                  className={`py-1 text-xs font-semibold rounded ${resolution === '4k' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  4K UHD
                </button>
                <button
                  onClick={() => setResolution('1080p')}
                  className={`py-1 text-xs font-semibold rounded ${resolution === '1080p' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  1080p
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Image Format</label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setFormat('image/png')}
                  className={`py-1 text-xs font-mono font-medium rounded ${format === 'image/png' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  PNG
                </button>
                <button
                  onClick={() => setFormat('image/jpeg')}
                  className={`py-1 text-xs font-mono font-medium rounded ${format === 'image/jpeg' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  JPEG
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950/50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res Snapshot ({resolution.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
