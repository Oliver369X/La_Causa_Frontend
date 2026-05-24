/** Alineado con backend: settings.CLOUDINARY_* */
export const IMAGE_UPLOAD_MIN = 200;
export const IMAGE_UPLOAD_MAX_WIDTH = 1200;
export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  outputSize: number;
  wasOptimized: boolean;
}

function isAllowedImage(file: File): boolean {
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();
  if (ALLOWED_MIME.has(mime)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "No pudimos abrir esta imagen. Probá con JPG o PNG desde la galería o cámara del celular."
        )
      );
    };
    img.src = url;
  });
}

function targetDimensions(
  width: number,
  height: number
): { width: number; height: number; upscaled: boolean; downscaled: boolean } {
  let w = width;
  let h = height;
  let upscaled = false;
  let downscaled = false;

  if (w < IMAGE_UPLOAD_MIN || h < IMAGE_UPLOAD_MIN) {
    const scale = Math.max(IMAGE_UPLOAD_MIN / w, IMAGE_UPLOAD_MIN / h);
    w = Math.max(IMAGE_UPLOAD_MIN, Math.round(w * scale));
    h = Math.max(IMAGE_UPLOAD_MIN, Math.round(h * scale));
    upscaled = true;
  }

  if (w > IMAGE_UPLOAD_MAX_WIDTH) {
    h = Math.round((h * IMAGE_UPLOAD_MAX_WIDTH) / w);
    w = IMAGE_UPLOAD_MAX_WIDTH;
    downscaled = true;
  }

  return { width: w, height: h, upscaled, downscaled };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen. Intentá con otra foto."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Redimensiona (sube imágenes chicas, baja las grandes) y comprime a JPEG
 * antes de subir a Cloudinary vía el backend.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!isAllowedImage(file)) {
    throw new Error("Formato no válido. Usá JPG, PNG, WebP o GIF.");
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(
      `La imagen pesa demasiado (${(file.size / (1024 * 1024)).toFixed(1)} MB). El máximo es 10 MB.`
    );
  }

  const img = await loadImageFromFile(file);
  const { width, height, upscaled, downscaled } = targetDimensions(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no pudo procesar la imagen. Probá actualizarlo o usar otro dispositivo.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = JPEG_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > 2 * 1024 * 1024 && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  if (blob.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(
      "La imagen sigue siendo muy pesada después de comprimirla. Elegí otra con menos detalle o resolución."
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  const outputFile = new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });

  return {
    file: outputFile,
    width,
    height,
    originalSize: file.size,
    outputSize: outputFile.size,
    wasOptimized: upscaled || downscaled || outputFile.size < file.size * 0.95,
  };
}

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
