import multer from "multer"

/**
 * Multer configuration for uploading remix images.
 * Uses in-memory storage and limits file size to 5MB.
 */

export const remixUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("image_file")
