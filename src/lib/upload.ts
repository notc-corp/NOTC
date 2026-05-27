import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export async function saveUpload(
  file: File,
  subfolder: "odometer" | "receipts" | "defects"
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${subfolder}/${randomUUID()}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  return blob.url;
}
