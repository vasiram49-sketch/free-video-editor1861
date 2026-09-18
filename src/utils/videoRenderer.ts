import { ExportSettings, ProjectState, VideoClip, TextOverlay, GraphicOverlay } from '../types';

export interface RenderProgress {
  percent: number;
  currentFrame: number;
  totalFrames: number;
  elapsedSec: number;
  estimatedRemainingSec: number;
  previewDataUrl?: string;
}

/**
 * Calculates the total timeline duration based on video clips
 */
export function calculateTotalDuration(clips: VideoClip[]): number {
  if (!clips.length) return 0;
  return clips.reduce((acc, clip) => {
    const effectiveClipDuration = (clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1);
    return acc + Math.max(0, effectiveClipDuration);
  }, 0);
}

/**
 * Finds which clip is active at timeline time `t`, and its local media timestamp
 */
export function getClipAtTime(clips: VideoClip[], timelineTime: number): {
  clip: VideoClip;
  clipIndex: number;
  clipStartTime: number;
  localTime: number;
  nextClip?: VideoClip;
  transitionProgress?: number; // 0 to 1 if in transition zone at end of clip
} | null {
  let accumulatedTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const effectiveDuration = (clip.trimEnd - clip.trimStart) / (clip.playbackRate || 1);
    const clipEndTime = accumulatedTime + effectiveDuration;

    if (timelineTime >= accumulatedTime && timelineTime <= clipEndTime) {
      const timeIntoClip = timelineTime - accumulatedTime;
      const localMediaTime = clip.trimStart + timeIntoClip * (clip.playbackRate || 1);

      // Check transition near end of clip
      const transDuration = clip.transitionDuration || 0.5;
      const timeLeft = clipEndTime - timelineTime;
      let transitionProgress: number | undefined = undefined;
      let nextClip: VideoClip | undefined = undefined;

      if (clip.transition !== 'none' && timeLeft <= transDuration && i < clips.length - 1) {
        transitionProgress = 1 - (timeLeft / transDuration);
        nextClip = clips[i + 1];
      }

      return {
        clip,
        clipIndex: i,
        clipStartTime: accumulatedTime,
        localTime: localMediaTime,
        nextClip,
        transitionProgress,
      };
    }
    accumulatedTime = clipEndTime;
  }

  // Fallback to last clip if at exact end
  if (clips.length > 0 && timelineTime >= accumulatedTime) {
    const lastClip = clips[clips.length - 1];
    return {
      clip: lastClip,
      clipIndex: clips.length - 1,
      clipStartTime: accumulatedTime - (lastClip.trimEnd - lastClip.trimStart) / (lastClip.playbackRate || 1),
      localTime: lastClip.trimEnd,
    };
  }

  return null;
}

/**
 * Renders a single frame onto a 2D canvas context at any target width/height
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  project: ProjectState,
  currentTime: number,
  videoElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>
) {
  // 1. Background fill
  ctx.save();
  ctx.fillStyle = project.canvasBackgroundColor || '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Active Clip
  const clipInfo = getClipAtTime(project.clips, currentTime);
  if (clipInfo) {
    const { clip, transitionProgress, nextClip } = clipInfo;
    const mediaEl = videoElementsMap.get(clip.id);

    if (mediaEl) {
      drawClipToCanvas(ctx, mediaEl, clip, targetWidth, targetHeight);

      // Render transition overlay if active
      if (transitionProgress !== undefined && clip.transition !== 'none') {
        renderTransitionEffect(ctx, targetWidth, targetHeight, clip.transition, transitionProgress, nextClip, videoElementsMap);
      }
    }
  }

  // 3. Graphic Overlays (Stickers, Badges, Watermark)
  project.graphicOverlays.forEach((ov) => {
    if (currentTime >= ov.startTime && currentTime <= ov.startTime + ov.duration) {
      drawGraphicOverlay(ctx, ov, targetWidth, targetHeight);
    }
  });

  // 4. Text Overlays (Titles, Captions)
  project.textOverlays.forEach((txt) => {
    if (currentTime >= txt.startTime && currentTime <= txt.startTime + txt.duration) {
      drawTextOverlay(ctx, txt, currentTime - txt.startTime, targetWidth, targetHeight);
    }
  });

  ctx.restore();
}

function drawClipToCanvas(
  ctx: CanvasRenderingContext2D,
  mediaEl: HTMLVideoElement | HTMLImageElement,
  clip: VideoClip,
  targetWidth: number,
  targetHeight: number
) {
  ctx.save();

  // Apply CSS Filter string
  const f = clip.filter;
  const filterParts = [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    `hue-rotate(${f.hueRotate}deg)`,
    `blur(${f.blur}px)`,
    `sepia(${f.sepia}%)`,
    `grayscale(${f.grayscale}%)`,
  ];
  ctx.filter = filterParts.join(' ');

  // Dimensions & aspect ratio
  const sourceWidth = mediaEl instanceof HTMLVideoElement ? mediaEl.videoWidth || 1920 : mediaEl.naturalWidth || 1920;
  const sourceHeight = mediaEl instanceof HTMLVideoElement ? mediaEl.videoHeight || 1080 : mediaEl.naturalHeight || 1080;

  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let drawW = targetWidth;
  let drawH = targetHeight;
  let drawX = 0;
  let drawY = 0;

  if (clip.fitMode === 'cover') {
    if (sourceAspect > targetAspect) {
      drawH = targetHeight;
      drawW = targetHeight * sourceAspect;
      drawX = (targetWidth - drawW) / 2;
    } else {
      drawW = targetWidth;
      drawH = targetWidth / sourceAspect;
      drawY = (targetHeight - drawH) / 2;
    }
  } else if (clip.fitMode === 'contain') {
    if (sourceAspect > targetAspect) {
      drawW = targetWidth;
      drawH = targetWidth / sourceAspect;
      drawY = (targetHeight - drawH) / 2;
    } else {
      drawH = targetHeight;
      drawW = targetHeight * sourceAspect;
      drawX = (targetWidth - drawW) / 2;
    }
  }

  // Transform center
  const centerX = targetWidth / 2;
  const centerY = targetHeight / 2;

  ctx.translate(centerX, centerY);

  // Rotation
  if (clip.rotation) {
    ctx.rotate((clip.rotation * Math.PI) / 180);
  }

  // Scale & Flip
  const scaleX = (clip.flipH ? -1 : 1) * (clip.scale || 1);
  const scaleY = (clip.flipV ? -1 : 1) * (clip.scale || 1);
  ctx.scale(scaleX, scaleY);

  // Draw media centered
  ctx.drawImage(mediaEl, drawX - centerX, drawY - centerY, drawW, drawH);

  ctx.restore();

  // Vignette effect if set
  if (f.vignette > 0) {
    ctx.save();
    const radius = Math.max(targetWidth, targetHeight) * 0.7;
    const vigGrad = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      radius * 0.4,
      targetWidth / 2,
      targetHeight / 2,
      radius
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, `rgba(0,0,0,${f.vignette / 100})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.restore();
  }
}

function renderTransitionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transition: string,
  progress: number,
  nextClip: VideoClip | undefined,
  videoElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>
) {
  ctx.save();
  if (transition === 'fade-black') {
    // Fade out to black in first half, fade in from black in second half
    const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha)})`;
    ctx.fillRect(0, 0, width, height);
  } else if (transition === 'fade-white') {
    const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
    ctx.fillRect(0, 0, width, height);
  } else if (transition === 'cross-dissolve' && nextClip) {
    const nextMedia = videoElementsMap.get(nextClip.id);
    if (nextMedia) {
      ctx.globalAlpha = progress;
      drawClipToCanvas(ctx, nextMedia, nextClip, width, height);
    }
  } else if (transition === 'wipe-left' && nextClip) {
    const nextMedia = videoElementsMap.get(nextClip.id);
    if (nextMedia) {
      ctx.beginPath();
      ctx.rect(width * (1 - progress), 0, width * progress, height);
      ctx.clip();
      drawClipToCanvas(ctx, nextMedia, nextClip, width, height);
    }
  } else if (transition === 'wipe-right' && nextClip) {
    const nextMedia = videoElementsMap.get(nextClip.id);
    if (nextMedia) {
      ctx.beginPath();
      ctx.rect(0, 0, width * progress, height);
      ctx.clip();
      drawClipToCanvas(ctx, nextMedia, nextClip, width, height);
    }
  } else if (transition === 'zoom-in' && nextClip) {
    const nextMedia = videoElementsMap.get(nextClip.id);
    if (nextMedia) {
      ctx.globalAlpha = progress;
      const zoomScale = 1 + (1 - progress) * 0.4;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-width / 2, -height / 2);
      drawClipToCanvas(ctx, nextMedia, nextClip, width, height);
    }
  }
  ctx.restore();
}

function drawGraphicOverlay(
  ctx: CanvasRenderingContext2D,
  ov: GraphicOverlay,
  targetWidth: number,
  targetHeight: number
) {
  ctx.save();
  const posX = (ov.x / 100) * targetWidth;
  const posY = (ov.y / 100) * targetHeight;
  ctx.globalAlpha = ov.opacity ?? 1;

  if (ov.type === 'sticker') {
    // Render sticker emoji or badge
    const size = Math.floor(targetHeight * 0.09 * (ov.scale || 1));
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ov.content, posX, posY);

    if (ov.label) {
      ctx.font = `600 ${Math.floor(size * 0.35)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ov.label, posX, posY + size * 0.6);
    }
  } else if (ov.type === 'badge') {
    const size = Math.floor(targetHeight * 0.05 * (ov.scale || 1));
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(ov.content).width;
    const padX = size * 0.8;
    const padY = size * 0.4;

    // Badge rounded rect
    ctx.fillStyle = '#e11d48'; // Rose red
    ctx.beginPath();
    ctx.roundRect(posX - textWidth / 2 - padX, posY - size / 2 - padY, textWidth + padX * 2, size + padY * 2, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(ov.content, posX, posY);
  } else if (ov.type === 'watermark' && ov.content) {
    // Watermark image
    const img = new Image();
    img.src = ov.content;
    const size = Math.floor(targetHeight * 0.12 * (ov.scale || 1));
    ctx.drawImage(img, posX - size / 2, posY - size / 2, size, size);
  }

  ctx.restore();
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  txt: TextOverlay,
  timeIntoText: number,
  targetWidth: number,
  targetHeight: number
) {
  ctx.save();
  const posX = (txt.x / 100) * targetWidth;
  const posY = (txt.y / 100) * targetHeight;

  // Scale fontSize proportionally to target height (base 1080p)
  const scaleRatio = targetHeight / 1080;
  const scaledFontSize = Math.max(14, Math.floor(txt.fontSize * scaleRatio));

  ctx.font = `${txt.fontWeight || '700'} ${scaledFontSize}px ${txt.fontFamily || 'Inter, sans-serif'}`;
  ctx.textAlign = txt.textAlign || 'center';
  ctx.textBaseline = 'middle';

  // Animation handling
  let alpha = 1.0;
  let offsetY = 0;
  let textToRender = txt.text;

  if (txt.animation === 'fade') {
    if (timeIntoText < 0.4) alpha = timeIntoText / 0.4;
    else if (timeIntoText > txt.duration - 0.4) alpha = (txt.duration - timeIntoText) / 0.4;
  } else if (txt.animation === 'slide-up') {
    if (timeIntoText < 0.4) {
      const p = timeIntoText / 0.4;
      alpha = p;
      offsetY = (1 - p) * 30 * scaleRatio;
    }
  } else if (txt.animation === 'pop') {
    if (timeIntoText < 0.3) {
      const popScale = 0.5 + (timeIntoText / 0.3) * 0.5;
      ctx.translate(posX, posY);
      ctx.scale(popScale, popScale);
      ctx.translate(-posX, -posY);
    }
  } else if (txt.animation === 'typewriter') {
    const charsToShow = Math.min(txt.text.length, Math.floor((timeIntoText / Math.min(1.5, txt.duration * 0.5)) * txt.text.length));
    textToRender = txt.text.slice(0, charsToShow);
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Background box if enabled
  if (txt.backgroundOpacity > 0 && textToRender.length > 0) {
    const metrics = ctx.measureText(textToRender);
    const padX = scaledFontSize * 0.6;
    const padY = scaledFontSize * 0.35;
    const boxW = metrics.width + padX * 2;
    const boxH = scaledFontSize * 1.3 + padY * 2;

    let boxX = posX - padX;
    if (txt.textAlign === 'center') boxX = posX - boxW / 2;
    else if (txt.textAlign === 'right') boxX = posX - boxW + padX;

    const boxY = posY - boxH / 2 + offsetY;

    ctx.save();
    ctx.fillStyle = txt.backgroundColor || '#000000';
    ctx.globalAlpha = (txt.backgroundOpacity / 100) * ctx.globalAlpha;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8 * scaleRatio);
    ctx.fill();
    ctx.restore();
  }

  // Shadow
  if (txt.shadowBlur > 0) {
    ctx.shadowColor = txt.shadowColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = txt.shadowBlur * scaleRatio;
    ctx.shadowOffsetX = 2 * scaleRatio;
    ctx.shadowOffsetY = 2 * scaleRatio;
  }

  // Stroke/Outline
  if (txt.strokeWidth > 0) {
    ctx.strokeStyle = txt.strokeColor || '#000000';
    ctx.lineWidth = txt.strokeWidth * scaleRatio;
    ctx.strokeText(textToRender, posX, posY + offsetY);
  }

  // Fill text
  ctx.fillStyle = txt.color || '#ffffff';
  ctx.fillText(textToRender, posX, posY + offsetY);

  ctx.restore();
}

/**
 * High-Resolution Export Engine
 * Encodes full timeline with offscreen canvas and mixed audio stream
 */
export async function exportVideo(
  project: ProjectState,
  settings: ExportSettings,
  onProgress: (progress: RenderProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const totalDuration = calculateTotalDuration(project.clips);
  if (totalDuration <= 0) {
    throw new Error('Timeline is empty. Please add video clips to export.');
  }

  const { width, height, fps } = settings;
  const totalFrames = Math.floor(totalDuration * fps);

  // Setup Offscreen Render Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to get 2D rendering context');

  // Load and prepare all media elements
  const mediaElementsMap = new Map<string, HTMLVideoElement | HTMLImageElement>();
  for (const clip of project.clips) {
    if (clip.type === 'video') {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.src = clip.src;
      await new Promise((res) => {
        v.onloadeddata = res;
        v.onerror = res; // Proceed even if one fails
      });
      mediaElementsMap.set(clip.id, v);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.src;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      mediaElementsMap.set(clip.id, img);
    }
  }

  // Audio mixdown setup
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioElementsToClean: HTMLAudioElement[] = [];

  if (settings.includeAudio && project.audioTracks.length > 0) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioDestination = audioContext.createMediaStreamDestination();

      for (const track of project.audioTracks) {
        if (track.isMuted) continue;
        const audio = new Audio(track.src);
        audio.crossOrigin = 'anonymous';
        audioElementsToClean.push(audio);
        const source = audioContext.createMediaElementSource(audio);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = track.volume;
        source.connect(gainNode);
        gainNode.connect(audioDestination);
      }
    } catch {
      // Audio mix fallback
    }
  }

  // Capture canvas stream
  const videoStream = canvas.captureStream(fps);

  // Combine video + audio streams
  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
  if (audioDestination) {
    audioDestination.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
  }

  // Select codec and bitrate
  let mimeType = 'video/webm;codecs=vp9';
  if (settings.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    mimeType = 'video/mp4;codecs=avc1';
  } else if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
  }

  // Bitrates based on quality and resolution
  let bitsPerSecond = 14000000; // 14 Mbps for 1080p balanced
  if (settings.resolutionPreset === '4k') {
    bitsPerSecond = settings.bitratePreset === 'high' ? 38000000 : 25000000;
  } else if (settings.resolutionPreset === '1440p') {
    bitsPerSecond = settings.bitratePreset === 'high' ? 24000000 : 16000000;
  } else if (settings.resolutionPreset === '1080p') {
    bitsPerSecond = settings.bitratePreset === 'high' ? 18000000 : settings.bitratePreset === 'medium' ? 12000000 : 6000000;
  } else {
    bitsPerSecond = 6000000;
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: bitsPerSecond,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);

  // Start audio playback synchronized
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  audioElementsToClean.forEach((audio) => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  const startTimeEpoch = performance.now();

  // Step through frames precisely
  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) {
      recorder.stop();
      audioElementsToClean.forEach((a) => a.pause());
      if (audioContext) audioContext.close();
      throw new Error('Export cancelled by user');
    }

    const currentTime = frame / fps;

    // Seek all active video elements to current frame position
    const clipInfo = getClipAtTime(project.clips, currentTime);
    if (clipInfo) {
      const mediaEl = mediaElementsMap.get(clipInfo.clip.id);
      if (mediaEl instanceof HTMLVideoElement) {
        if (Math.abs(mediaEl.currentTime - clipInfo.localTime) > 0.05) {
          mediaEl.currentTime = clipInfo.localTime;
          await new Promise((r) => {
            const onSeeked = () => {
              mediaEl.removeEventListener('seeked', onSeeked);
              r(null);
            };
            mediaEl.addEventListener('seeked', onSeeked);
            setTimeout(onSeeked, 60); // Timeout fallback
          });
        }
      }

      // If transition has next clip, seek it too
      if (clipInfo.nextClip) {
        const nextEl = mediaElementsMap.get(clipInfo.nextClip.id);
        if (nextEl instanceof HTMLVideoElement) {
          nextEl.currentTime = clipInfo.nextClip.trimStart;
        }
      }
    }

    // Render this frame to canvas
    drawFrame(ctx, width, height, project, currentTime, mediaElementsMap);

    // Progress update
    const percent = Math.min(99, Math.round(((frame + 1) / totalFrames) * 100));
    const elapsedSec = (performance.now() - startTimeEpoch) / 1000;
    const framesLeft = totalFrames - (frame + 1);
    const fpsSpeed = (frame + 1) / Math.max(0.1, elapsedSec);
    const estimatedRemainingSec = Math.round(framesLeft / Math.max(1, fpsSpeed));

    // Thumbnail preview every 10 frames
    let previewDataUrl: string | undefined = undefined;
    if (frame % 10 === 0 || frame === totalFrames - 1) {
      previewDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    }

    onProgress({
      percent,
      currentFrame: frame + 1,
      totalFrames,
      elapsedSec: Math.round(elapsedSec),
      estimatedRemainingSec,
      previewDataUrl,
    });

    // Control frame pacing for MediaRecorder buffer intake
    await new Promise((r) => setTimeout(r, Math.max(4, Math.floor(1000 / fps))));
  }

  // Stop audio and recorder
  audioElementsToClean.forEach((a) => a.pause());
  if (audioContext) audioContext.close();

  // Final frames flush
  await new Promise((r) => setTimeout(r, 200));
  recorder.stop();

  const finalBlob = await recordingPromise;

  onProgress({
    percent: 100,
    currentFrame: totalFrames,
    totalFrames,
    elapsedSec: Math.round((performance.now() - startTimeEpoch) / 1000),
    estimatedRemainingSec: 0,
    previewDataUrl: canvas.toDataURL('image/jpeg', 0.8),
  });

  return finalBlob;
}

/**
 * Instant High-Resolution Frame Grab (PNG/JPEG)
 */
export function captureHighResSnapshot(
  project: ProjectState,
  currentTime: number,
  resolution: { width: number; height: number },
  videoElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context error');

  drawFrame(ctx, resolution.width, resolution.height, project, currentTime, videoElementsMap);
  return canvas.toDataURL(format, 0.95);
}
