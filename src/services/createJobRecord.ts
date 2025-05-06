import { prisma } from "../db/client"

export interface SharedJobInput {
  prompt: string
  userId: string
  isRemix?: boolean
  model?: string
  style_type?: string
  aspect_ratio?: string
  magic_prompt_option?: string
  negative_prompt?: string
  seed?: number
  color_palette?: any
  image_description?: string
  image_input_url?: string
  image_weight?: number
  style_builder?: string
  style_builder_value?: string
  is_published?: boolean
}

/**
 * Creates a Job record in the database.
 * @param {SharedJobInput} input - The job data to save.
 * @returns {Promise<string>} - The ID of the created job.
 */
export const createJobRecord = async (input: SharedJobInput): Promise<string> => {
  const {
    prompt,
    userId,
    model,
    style_type,
    aspect_ratio,
    image_description,
    magic_prompt_option,
    negative_prompt,
    seed,
    color_palette,
    is_published,
    image_input_url,
    image_weight,
    style_builder,
    style_builder_value,
    isRemix = false,
  } = input

  const job = await prisma.job.create({
    data: {
      userId,
      prompt,
      status: "PROCESSING",
      progress: 0,
      model: model || "",
      style_type: style_type || undefined,
      aspect_ratio: aspectRatioToEnum(aspect_ratio),
      image_description: image_description || "",
      magic_prompt_option: magic_prompt_option || undefined,
      negative_prompt: negative_prompt || undefined,
      seed: seed ? seed : 0,
      image_input_url,
      color_palette,
      image_weight,
      style_builder,
      style_builder_value,
      metadata: {
        remix: isRemix,
        image_input_url,
        image_weight,
        seed,
        color_palette,
        is_published: !!is_published,
      },
    },
  })

  return job.id
}

const aspectRatioToEnum = (value?: string): any => {
  if (!value) return undefined
  return value as any
}

/**
 * Fetches a job by ID from the database.
 * @param {string} jobId - The ID of the job.
 * @returns {Promise<Job|null>}
 */

export const getJobById = async (jobId: string) => {
  return await prisma.job.findUnique({ where: { id: jobId } })
}
