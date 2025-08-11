import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export function uploadBufferToCloudinary(buffer, filename, folder = "webbuses") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        filename_override: filename,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        transformation: [
          { width: 1280, height: 720, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" }
        ]
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}
