import { AspectRatio } from '../types';
import { 
  Film, 
  Download, 
  Camera, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  Trash2, 
  Check,
  ShieldCheck,
  Tv
} from 'lucide-react';

interface HeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetProject: () => void;
  onLoadDemoProject: () => void;
  onOpenExportModal: () => void;
  onOpenSnapshotModal: () => void;
  hasClips: boolean;
}

export const ASPECT_RATIOS: { id: AspectRatio; label: string; iconRatio: string; desc: string }[] = [
  { id: '16:9', label: '16:9', iconRatio: 'w-6 h-3.5', desc: 'YouTube & Widescreen' },
  { id: '9:16', label: '9:16', iconRatio: 'w-3.5 h-6', desc: 'TikTok, Shorts, Reels' },
  { id: '1:1', label: '1:1', iconRatio: 'w-5 h-5', desc: 'Instagram Square' },
  { id: '4:5', label: '4:5', iconRatio: 'w-4 h-5', desc: 'Social Portrait' },
  { id: '21:9', label: '21:9', iconRatio: 'w-7 h-3', desc: 'Cinematic Ultrawide' },
];

export function Header({
  title,
  onTitleChange,
  aspectRatio,
  onAspectRatioChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetProject,
  onLoadDemoProject,
  onOpenExportModal,
  onOpenSnapshotModal,
  hasClips,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between gap-3 text-zinc-100 select-none z-30">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
            <Film className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">Video Editor</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-2.5 h-2.5" />
                Free & Ad-Free
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

        {/* Editable Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-transparent hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-300 focus:text-white transition-colors max-w-[140px] md:max-w-[200px] outline-none"
          title="Click to rename project"
        />
      </div>

      {/* Center: Aspect Ratio Selector & Undo/Redo */}
      <div className="hidden md:flex items-center gap-2">
        {/* Aspect Ratio Pills */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {ASPECT_RATIOS.map((item) => {
            const isSelected = aspectRatio === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onAspectRatioChange(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
                title={`${item.label} (${item.desc})`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* History Undo / Redo */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: Demo, Reset, Snapshot, Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLoadDemoProject}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Load pre-built sample footage and music"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo Clips</span>
        </button>

        <button
          onClick={onResetProject}
          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-900 transition-colors"
          title="Clear Project"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSnapshotModal}
          disabled={!hasClips}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
          title="Save current frame as high-res PNG snapshot"
        >
          <Camera className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline">Capture Frame</span>
        </button>

        {/* Primary High-Res Export Button */}
        <button
          onClick={onOpenExportModal}
          disabled={!hasClips}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-md shadow-rose-950/50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Video</span>
          <span className="text-[10px] bg-rose-700/80 px-1 py-0.2 rounded text-rose-100 font-mono">
            4K/HD
          </span>
        </button>
      </div>
    </header>
  );
}
