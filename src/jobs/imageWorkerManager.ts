import { Worker, Job } from "bullmq"
import { redisConnection } from "../db/redis"
import { prisma } from "../db/client"
import { generateImageFromPrompt } from "../services/ideogram.service"
import { uploadImageFromUrl } from "../services/uploadToCloudinary"
import { generateRemixFromPrompt } from "../services/ideogramRemix.service"
import { getApiErrorMessage } from "../utils/formatAxiosError"
import { imageQueue } from "../queue/imageQueue"

let imageWorker: Worker | null = null

/**
 * Starts the BullMQ worker to process image generation jobs.
 * Automatically avoids multiple workers starting at once.
 */
export async function startImageWorker() {
  if (imageWorker) {
    console.log("⚙️ [WorkerManager] Worker already running. Skip starting again.")
    return
  }

  console.log("🛠️ [WorkerManager] Starting new Worker...")

  imageWorker = new Worker(
    "image-generation",
    async (job: Job) => {
      const {
        jobId,
        prompt,
        userId,
        model,
        isRemix,
        style_type,
        aspect_ratio,
        magic_prompt_option,
        negative_prompt,
        seed,
        color_palette,
        image_weight,
        image_input_url,
      } = job.data

      try {
        console.log("👷 [Worker] Processing Job:", jobId)

        // Update DB: Job started processing
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "PROCESSING", progress: 10 },
        })

        // Generate image (remix or new)
        const data = isRemix
          ? await generateRemixFromPrompt({
              prompt,
              model,
              style_type,
              aspect_ratio,
              magic_prompt_option,
              image_input_url,
              seed,
              color_palette,
              image_weight,
            })
          : await generateImageFromPrompt({
              prompt,
              model,
              style_type,
              aspect_ratio,
              seed,
              magic_prompt_option,
              color_palette,
              negative_prompt,
            })

        // Upload to Cloudinary
        const cdnUrl = await uploadImageFromUrl(data.url, userId)

        // Fetch original job for extra metadata (if needed)
        const originalJob = await prisma.job.findUnique({ where: { id: jobId } })

        // Update DB: Job completed
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            progress: 100,
            imageUrl: cdnUrl,
            metadata: {
              original_url: data.url,
              model,
              style_type,
              aspect_ratio,
              magic_prompt_option,
              negative_prompt,
            },
          },
        })

        // Create GeneratedImage record
        await prisma.generatedImage.create({
          data: {
            userId,
            jobId,
            prompt,
            model: model ?? undefined,
            style_type: style_type ?? undefined,
            aspect_ratio,
            color_palette: color_palette ? JSON.parse(JSON.stringify(color_palette)) : undefined,
            negative_prompt: negative_prompt ?? undefined,
            image_weight: image_weight ?? undefined,
            image_description: originalJob?.image_description || "",
            image_input_url: image_input_url ?? undefined,
            seed: data.seed,
            prompt_enhanced: magic_prompt_option?.toLowerCase() === "on" ? data.prompt : "",
            img_result: cdnUrl,
            style_builder: originalJob?.style_builder,
            style_builder_value: originalJob?.style_builder_value,
            is_published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        console.log(`✅ [Worker] Job ${jobId} completed.`)
        return { imageUrl: cdnUrl }
      } catch (error: any) {
        const friendlyMessage = getApiErrorMessage(error)

        // Update DB: Mark job as failed
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "FAILED", progress: 0, error: friendlyMessage },
        })

        console.error(`❌ [Worker] Job ${jobId} failed:`, friendlyMessage)
        return { error: friendlyMessage }
      }
    },
    {
      connection: redisConnection,
      removeOnComplete: { age: 60, count: 2 },
      removeOnFail: { age: 120, count: 2 },
      stalledInterval: 86400000, // 24 hours
    }
  )

  // Graceful shutdown on SIGTERM
  process.on("SIGTERM", async () => {
    if (imageWorker) {
      console.log("🔻 [WorkerManager] Shutting down Worker due to SIGTERM...")
      await imageWorker.close()
      imageWorker = null
    }
  })

  imageWorker.on("completed", async (job) => {
    console.log(`🛑 [WorkerManager] Worker completed job: ${job.id}`)
    await handleWorkerShutdown()
  })

  imageWorker.on("failed", async (job) => {
    console.log(`🛑 [WorkerManager] Worker failed job: ${job?.id}`)
    await handleWorkerShutdown()
  })
}

/**
 * Checks if the queue is empty.
 * Stops the worker if no jobs are left.
 */
async function handleWorkerShutdown() {
  const counts = await imageQueue.getJobCounts()
  console.log("📊 [WorkerManager] Queue status after job:", counts)

  if (counts.waiting === 0 && counts.active === 0) {
    console.log("🛑 [WorkerManager] No jobs left. Stopping Worker...")
    await stopImageWorker()
  } else {
    console.log("⏳ [WorkerManager] Jobs still pending. Worker continues running...")
  }
}

/**
 * Stops the current worker instance.
 */
export async function stopImageWorker() {
  if (imageWorker) {
    console.log("🛑 [WorkerManager] Stopping Worker cleanly...")
    await imageWorker.close()
    imageWorker = null
  }
}
