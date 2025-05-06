import { Request, Response } from "express"
import { imageQueue } from "../queue/imageQueue"
import { createJobRecord } from "../services/createJobRecord"
import { startImageWorker } from "../jobs/imageWorkerManager"

/**
 * Handles new image generation request.
 */
export const handleGenerateImage = async (req: Request, res: Response) => {
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
      color_palette,
      is_published,
    } = req.body

    if (!prompt || !userId) {
      return res.status(400).json({ error: "prompt and userId are required" })
    }

    // Parse color_palette if string
    let parsed_color_palette = color_palette
    if (typeof color_palette === "string") {
      try {
        parsed_color_palette = JSON.parse(color_palette)
      } catch {
        console.warn("Invalid color_palette JSON:", color_palette)
        parsed_color_palette = null
      }
    }

    const final_style_type = model?.toLowerCase() === "v1" ? undefined : style_type

    // add job entry
    const jobId = await createJobRecord({
      prompt,
      userId,
      model,
      style_type: final_style_type,
      aspect_ratio,
      magic_prompt_option,
      negative_prompt,
      seed: seed ? parseInt(seed) : 0,
      color_palette: parsed_color_palette,
      is_published: is_published === "true" || is_published === true,
    })

    // Queue the job
    await imageQueue.add("image", {
      jobId,
      prompt,
      userId,
      model,
      isRemix: false,
      style_type: final_style_type,
      aspect_ratio,
      magic_prompt_option,
      negative_prompt,
      seed: seed ? parseInt(seed) : 0,
      color_palette: parsed_color_palette,
    })

    await startImageWorker()

    return res.status(200).json({
      message: "Job added to queue",
      jobId,
    })
  } catch (err) {
    console.error("❌ Error generating image:", err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
