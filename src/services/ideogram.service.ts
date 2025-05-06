import axios from "axios"
import { getApiErrorMessage } from "../utils/formatAxiosError"
import dotenv from "dotenv"
dotenv.config()

const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY || ""
const IDEOGRAM_API_URL = "https://api.ideogram.ai/generate"

interface GenerateOptions {
  prompt: string
  model?: string
  style_type?: string
  aspect_ratio?: string
  seed?: string
  magic_prompt_option?: string
  negative_prompt?: string
  color_palette?: Record<string, any>
}

interface ResponseType {
  url: string
  seed: number
  prompt: string
}

/**
 * Sends a request to Ideogram's /generate endpoint to create an image.
 * @param {GenerateOptions} options - Options for image generation.
 * @returns {Promise<ResponseType>}
 */
export const generateImageFromPrompt = async (options: GenerateOptions): Promise<ResponseType> => {
  const {
    prompt,
    model,
    style_type,
    aspect_ratio,
    seed,
    magic_prompt_option,
    negative_prompt,
    color_palette,
  } = options

  const payload: any = {
    image_request: {
      prompt,
      ...(model && { model }),
      ...(model === "V_2" && style_type && { style_type }),
      ...(aspect_ratio && { aspect_ratio }),
      ...(magic_prompt_option && { magic_prompt_option }),
      ...(negative_prompt && { negative_prompt }),
      ...(color_palette && Object.keys(color_palette).length > 0 && { color_palette }),
      ...(seed && { seed }),
    },
  }

  try {
    const response = await axios.post(IDEOGRAM_API_URL, payload, {
      headers: {
        "Api-Key": IDEOGRAM_API_KEY,
        "Content-Type": "application/json",
      },
    })

    const imageUrl = response.data?.data?.[0]?.url || ""
    const seedIdo = response.data?.data?.[0]?.seed || 0
    const promptIdo = response.data?.data?.[0]?.prompt || ""
    if (!imageUrl) {
      throw new Error("No image URL returned by Ideogram.")
    }

    return {
      url: imageUrl,
      seed: seedIdo,
      prompt: promptIdo,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}
