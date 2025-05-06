import { Request, Response } from "express"
import { uploadImageFromFile } from "../services/uploadToCloudinary"
import { createJobRecord } from "../services/createJobRecord"
import { imageQueue } from "../queue/imageQueue"
import { startImageWorker } from "../jobs/imageWorkerManager"

/**
 * Handles remix image generation.
 */
export const handleRemixImage = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      prompt,
      model,
      style_type,
      aspect_ratio,
      magic_prompt_option,
      negative_prompt,
      seed,
      is_published,
      image_description,
      image_weight,
      style_builder,
      style_builder_value,
      image_input_url,
    } = req.body

    const imageFile = req.file

    let color_palette = req.body.color_palette
    if (typeof color_palette === "string") {
      try {
        color_palette = JSON.parse(color_palette)
      } catch {
        console.warn("Invalid color_palette JSON:", color_palette)
        color_palette = null
      }
    }

    if (!prompt || !userId) {
      return res.status(400).json({ error: "Missing prompt or userId fields" })
    }

    // Must have either image URL or image file
    if (!image_input_url && !imageFile) {
      return res.status(400).json({ error: "Missing imageFile or image_input_url fields" })
    }

    // Final image URL
    let image_url = image_input_url
    if (!image_url && imageFile) {
      image_url = await uploadImageFromFile(imageFile, userId)
    }

    const final_style_type = model?.toLowerCase() === "v1" ? undefined : style_type

    // add job entry
    const jobId = await createJobRecord({
      prompt,
      userId,
      isRemix: true,
      model,
      style_type: final_style_type,
      aspect_ratio,
      magic_prompt_option,
      negative_prompt,
      seed: seed ? parseInt(seed) : 0,
      color_palette,
      image_description,
      is_published: is_published === "true",
      image_input_url: image_url,
      image_weight: image_weight ? parseInt(image_weight) : 50,
      style_builder,
      style_builder_value,
    })

    // Queue the job
    await imageQueue.add("image", {
      jobId,
      prompt,
      userId,
      model,
      isRemix: true,
      style_type: final_style_type,
      aspect_ratio,
      magic_prompt_option,
      negative_prompt,
      seed: seed ? parseInt(seed) : 0,
      color_palette,
      image_weight: image_weight ? parseInt(image_weight) : 50,
      image_input_url: image_url,
    })

    await startImageWorker()

    return res.status(200).json({
      message: "Remix job queued successfully",
      jobId,
    })
  } catch (err) {
    console.error("❌ Error handling remix image:", err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
