import cloudinary from "../config/cloudinary"

/**
 * Uploads an image from a public URL to Cloudinary.
 * @param {string} imageUrl - The URL of the image to upload.
 * @param {string} userId - The ID of the user (for naming purposes).
 * @returns {Promise<string>} - The Cloudinary secure URL.
 */
export const uploadImageFromUrl = async (imageUrl: string, userId: string): Promise<string> => {
  const timestamp = Date.now()
  const filename = `${userId}-${timestamp}`

  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "paintola/generated",
      public_id: filename,
      use_filename: false,
      unique_filename: false,
      overwrite: false,
    })

    return result.secure_url
  } catch (error: any) {
    console.error("❌ Cloudinary upload failed:", error.message)
    throw new Error("Image upload to CDN failed.")
  }
}

/**
 * Uploads an image from a file buffer (e.g., uploaded by user) to Cloudinary.
 * @param {Express.Multer.File} file - The file object.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string>} - The Cloudinary secure URL.
 */
export const uploadImageFromFile = async (
  file: Express.Multer.File,
  userId: string
): Promise<string> => {
  const timestamp = Date.now()
  const filename = `${userId}-${timestamp}`

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "paintola/remix",
          public_id: filename,
          use_filename: false,
          unique_filename: false,
          overwrite: false,
        },
        (err, result) => {
          if (err || !result) {
            console.error("❌ Cloudinary upload failed:", err?.message)
            return reject(new Error("Image upload to CDN failed."))
          }

          resolve(result.secure_url)
        }
      )
      .end(file.buffer)
  })
}
