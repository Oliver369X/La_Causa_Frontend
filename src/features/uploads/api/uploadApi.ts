import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface UploadResult {
  url: string;
  public_id: string;
}

/**
 * Upload an image file to the backend (Cloudinary).
 * Returns the permanent secure URL of the uploaded image.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  const { data } = await apiClient.post<UploadResult>(EP.UPLOAD_IMAGE, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export interface UploadDocumentResult extends UploadResult {
  content_type?: string;
}

/** PDF, Word, Excel, texto → Cloudinary raw. */
export async function uploadDocument(file: File): Promise<UploadDocumentResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<UploadDocumentResult>(EP.UPLOAD_DOCUMENT, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/** Nota de voz / dictado (webm, mp3, …). */
export async function uploadAudio(file: File): Promise<UploadDocumentResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<UploadDocumentResult>(EP.UPLOAD_AUDIO, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
