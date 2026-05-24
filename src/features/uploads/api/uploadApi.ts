import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import { extractUploadError } from "@/shared/utils/apiError";
import { prepareImageForUpload } from "@/shared/utils/prepareImageForUpload";

export interface UploadResult {
  url: string;
  public_id: string;
}

export class UploadImageError extends Error {
  readonly stage: "prepare" | "upload";

  constructor(message: string, stage: "prepare" | "upload") {
    super(message);
    this.name = "UploadImageError";
    this.stage = stage;
  }
}

/** Axios debe fijar el boundary del multipart; no enviar Content-Type manual. */
function postMultipart<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post<T>(url, form).then((res) => res.data);
}

/**
 * Optimiza (redimensiona + comprime) y sube la imagen a Cloudinary vía backend.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  let preparedFile: File;
  try {
    const prepared = await prepareImageForUpload(file);
    preparedFile = prepared.file;
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "No se pudo preparar la imagen. Probá con JPG o PNG.";
    throw new UploadImageError(msg, "prepare");
  }

  try {
    return await postMultipart<UploadResult>(EP.UPLOAD_IMAGE, preparedFile);
  } catch (err) {
    throw new UploadImageError(extractUploadError(err), "upload");
  }
}

export interface UploadDocumentResult extends UploadResult {
  content_type?: string;
}

/** PDF, Word, Excel, texto → Cloudinary raw. */
export async function uploadDocument(file: File): Promise<UploadDocumentResult> {
  return postMultipart<UploadDocumentResult>(EP.UPLOAD_DOCUMENT, file);
}

/** Nota de voz / dictado (webm, mp3, …). */
export async function uploadAudio(file: File): Promise<UploadDocumentResult> {
  return postMultipart<UploadDocumentResult>(EP.UPLOAD_AUDIO, file);
}
