import { FilterSettings, VideoClip } from '../types';

export const DEFAULT_FILTER: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  temperature: 0,
  vignette: 0,
  presetName: 'Normal',
};

export const COLOR_PRESETS: { name: string; filter: Partial<FilterSettings> }[] = [
  { name: 'Normal', filter: { brightness: 100, contrast: 100, saturation: 100, hueRotate: 0, sepia: 0, grayscale: 0, temperature: 0, vignette: 0 } },
  { name: 'Cinematic Teal/Orange', filter: { brightness: 105, contrast: 125, saturation: 130, temperature: 15, vignette: 25 } },
  { name: 'Warm Sunset', filter: { brightness: 108, contrast: 110, saturation: 140, temperature: 35, sepia: 15, vignette: 15 } },
  { name: 'Moody Dark', filter: { brightness: 88, contrast: 135, saturation: 90, temperature: -10, vignette: 40 } },
  { name: 'Cyber Neon', filter: { brightness: 110, contrast: 130, saturation: 170, hueRotate: 45, vignette: 20 } },
  { name: 'Classic B&W', filter: { brightness: 102, contrast: 130, grayscale: 100, vignette: 30 } },
  { name: 'Vintage 90s', filter: { brightness: 110, contrast: 95, saturation: 115, sepia: 30, vignette: 20 } },
  { name: 'Vibrant Pop', filter: { brightness: 105, contrast: 115, saturation: 160, temperature: 5 } },
];

/**
 * Creates a high quality 5-second dynamic canvas video blob
 */
export async function generateSyntheticClip(
  type: 'sunset' | 'cyberpunk' | 'nature' | 'kinetic',
  durationSec: number = 6
): Promise<{ blobUrl: string; thumbnail: string }> {
  const width = 1280;
  const height = 720;
  const fps = 30;
  const totalFrames = Math.floor(durationSec * fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();

  let firstFrameThumbnail = '';

  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    const time = frame / fps;

    ctx.clearRect(0, 0, width, height);

    if (type === 'sunset') {
      // Sunset Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#1a103c');
      skyGrad.addColorStop(0.35, '#6c225a');
      skyGrad.addColorStop(0.7, '#d45745');
      skyGrad.addColorStop(0.9, '#f69d53');
      skyGrad.addColorStop(1, '#ffc77d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Glowing Sun
      const sunY = height * 0.65 - Math.sin(progress * Math.PI) * 40;
      const sunGrad = ctx.createRadialGradient(width * 0.5, sunY, 10, width * 0.5, sunY, 180);
      sunGrad.addColorStop(0, 'rgba(255, 245, 200, 1)');
      sunGrad.addColorStop(0.4, 'rgba(255, 170, 70, 0.8)');
      sunGrad.addColorStop(1, 'rgba(255, 120, 50, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.5, sunY, 180, 0, Math.PI * 2);
      ctx.fill();

      // Sun disk
      ctx.fillStyle = '#fff4cc';
      ctx.beginPath();
      ctx.arc(width * 0.5, sunY, 55, 0, Math.PI * 2);
      ctx.fill();

      // Mountain layers with parallax
      const drawMountains = (baseY: number, color: string, waveFreq: number, speed: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 15) {
          const y = baseY + Math.sin(x * waveFreq + time * speed) * 35 + Math.cos(x * 0.005) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      };

      drawMountains(height * 0.72, 'rgba(75, 25, 65, 0.85)', 0.004, 0.15);
      drawMountains(height * 0.80, 'rgba(40, 12, 35, 0.95)', 0.006, 0.25);
      drawMountains(height * 0.88, '#140612', 0.008, 0.4);

      // Flying birds
      const birdCount = 5;
      for (let b = 0; b < birdCount; b++) {
        const bx = ((width * 0.2 + b * 60 + time * 50) % (width + 100)) - 50;
        const by = height * 0.35 + Math.sin(time * 3 + b) * 15 + b * 20;
        const wing = Math.sin(time * 8 + b) * 8;
        ctx.strokeStyle = '#2b0b24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - 12, by - wing);
        ctx.quadraticCurveTo(bx - 6, by, bx, by + 2);
        ctx.quadraticCurveTo(bx + 6, by, bx + 12, by - wing);
        ctx.stroke();
      }

    } else if (type === 'cyberpunk') {
      // Dark Neon Grid
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0518');
      bgGrad.addColorStop(0.6, '#180a33');
      bgGrad.addColorStop(1, '#05020a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield
      for (let s = 0; s < 50; s++) {
        const sx = ((s * 137.5) % width);
        const sy = ((s * 93.1) % (height * 0.6));
        const blink = Math.abs(Math.sin(time * 2 + s));
        ctx.fillStyle = `rgba(200, 240, 255, ${0.3 + blink * 0.7})`;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Neon horizon sun
      const horizonY = height * 0.62;
      const neonSun = ctx.createRadialGradient(width * 0.5, horizonY, 20, width * 0.5, horizonY, 220);
      neonSun.addColorStop(0, '#ff007f');
      neonSun.addColorStop(0.5, '#7928ca');
      neonSun.addColorStop(1, 'rgba(10, 5, 24, 0)');
      ctx.fillStyle = neonSun;
      ctx.beginPath();
      ctx.arc(width * 0.5, horizonY, 200, Math.PI, 0);
      ctx.fill();

      // Sun horizontal stripes
      ctx.fillStyle = '#0a0518';
      for (let st = 0; st < 8; st++) {
        const sy = horizonY - 140 + st * 18;
        ctx.fillRect(width * 0.5 - 180, sy, 360, 4 + st * 1.2);
      }

      // 3D Perspective Grid
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      const vpX = width * 0.5;
      const vpY = horizonY;

      // Radial grid lines
      for (let angle = -width; angle <= width * 2; angle += 90) {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(angle, height);
        ctx.stroke();
      }

      // Moving horizontal grid lines
      const speed = (time * 1.5) % 1;
      for (let i = 0; i < 15; i++) {
        const ratio = Math.pow((i + speed) / 15, 2.5);
        const y = horizonY + ratio * (height - horizonY);
        ctx.globalAlpha = Math.min(1, ratio * 1.5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

    } else if (type === 'nature') {
      // Nature emerald gradient
      const forestGrad = ctx.createLinearGradient(0, 0, width, height);
      forestGrad.addColorStop(0, '#06291a');
      forestGrad.addColorStop(0.5, '#0e4d34');
      forestGrad.addColorStop(1, '#02180e');
      ctx.fillStyle = forestGrad;
      ctx.fillRect(0, 0, width, height);

      // Water ripples
      for (let r = 0; r < 8; r++) {
        const rx = width * 0.5 + Math.sin(time * 0.8 + r) * 100;
        const ry = height * 0.5 + Math.cos(time * 0.6 + r) * 60;
        const rad = 80 + r * 45 + ((time * 30) % 50);
        ctx.strokeStyle = `rgba(120, 240, 180, ${0.15 - r * 0.015})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(rx, ry, rad * 1.8, rad * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Golden light particles / fireflies
      for (let p = 0; p < 25; p++) {
        const px = (p * 85 + Math.sin(time * 1.2 + p * 2) * 60) % width;
        const py = (p * 50 + Math.cos(time * 1.5 + p * 3) * 40) % height;
        const glow = ctx.createRadialGradient(px, py, 2, px, py, 18);
        glow.addColorStop(0, 'rgba(255, 240, 150, 0.9)');
        glow.addColorStop(0.5, 'rgba(180, 255, 120, 0.4)');
        glow.addColorStop(1, 'rgba(100, 200, 80, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      // Kinetic Abstract Motion
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#12131C');
      bgGrad.addColorStop(1, '#1E2030');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Rotating glowing rings & spheres
      const cx = width * 0.5;
      const cy = height * 0.5;
      const rot = time * 0.8;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#ec4899';
        ctx.lineWidth = 4 + i * 2;
        ctx.beginPath();
        ctx.arc(0, 0, 100 + i * 35, 0, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();

      // Floating modern geometric accents
      for (let g = 0; g < 12; g++) {
        const gx = cx + Math.sin(time * 0.9 + g) * 350;
        const gy = cy + Math.cos(time * 0.7 + g * 1.4) * 200;
        ctx.fillStyle = g % 2 === 0 ? '#818cf8' : '#34d399';
        ctx.beginPath();
        ctx.arc(gx, gy, 8 + (g % 5) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Capture thumbnail at frame 15
    if (frame === 15) {
      firstFrameThumbnail = canvas.toDataURL('image/jpeg', 0.8);
    }

    // Yield slightly to keep UI responsive and feed stream
    await new Promise((r) => setTimeout(r, 1000 / (fps * 2)));
  }

  recorder.stop();
  const recordedBlob = await recordingPromise;
  const blobUrl = URL.createObjectURL(recordedBlob);

  if (!firstFrameThumbnail) {
    firstFrameThumbnail = canvas.toDataURL('image/jpeg', 0.8);
  }

  return { blobUrl, thumbnail: firstFrameThumbnail };
}

/**
 * Extracts metadata and a clean thumbnail from any user uploaded video file
 */
export async function processUploadedVideo(file: File): Promise<{
  src: string;
  name: string;
  duration: number;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to 0.5s or 10% to get a good preview frame
      const seekTime = Math.min(0.5, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = Math.floor((320 * (video.videoHeight || 9)) / (video.videoWidth || 16));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const thumbnail = canvas.toDataURL('image/jpeg', 0.75);
        resolve({
          src: url,
          name: file.name.replace(/\.[^/.]+$/, ''),
          duration: video.duration || 5,
          thumbnail,
        });
      } catch {
        resolve({
          src: url,
          name: file.name.replace(/\.[^/.]+$/, ''),
          duration: video.duration || 5,
          thumbnail: '',
        });
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video file. Please ensure it is a valid MP4, WebM, or MOV.'));
    };
  });
}

/**
 * Processes an uploaded image file for timeline usage
 */
export async function processUploadedImage(file: File): Promise<{
  src: string;
  name: string;
  duration: number;
  thumbnail: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      resolve({
        src,
        name: file.name.replace(/\.[^/.]+$/, ''),
        duration: 4.0, // Default 4 seconds for image slides
        thumbnail: src,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
