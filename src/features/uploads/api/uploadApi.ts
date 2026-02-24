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
