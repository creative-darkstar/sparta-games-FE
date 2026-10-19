import axios from "axios";
import { sparta_games_auth } from "./axios";

// An isolated client must never attach application JWTs or cookies to S3.
const storage = axios.create({ withCredentials: false });
export async function uploadGameZip(file: File, progress: (value: number | null) => void, signal?: AbortSignal) {
  const response = await sparta_games_auth.post(
    "/commons/api/presigned-url/upload/",
    {
      base_path: "zips",
      extension: "zip",
      filename: file.name,
    },
    { signal },
  );
  const { upload_url, file_key } = response.data.data;
  if (typeof upload_url !== "string" || typeof file_key !== "string" || !/^zips\/[^/\\]+\.zip$/.test(file_key)) {
    throw new Error("Invalid upload response");
  }
  await storage.put(upload_url, file, {
    signal,
    headers: { "Content-Type": "application/zip", "x-amz-tagging": "is_used=false", "If-None-Match": "*" },
    onUploadProgress: ({ loaded, total }) => progress(total ? Math.round((loaded / total) * 100) : null),
  });
  return file_key;
}
