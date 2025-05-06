import { Queue, QueueEvents } from "bullmq"
import { redisConnection } from "../db/redis"
import { prisma } from "../db/client"
import { getIO } from "../ws/socket"

export const imageQueue = new Queue("image-generation", {
  connection: redisConnection,
  blockingConnection: false,
})
console.log("🚀 Queue and QueueEvents initialized.")

/**
 * Initialize BullMQ queue event listeners.
 */
export const initQueueEventListeners = () => {
  const events = new QueueEvents("image-generation", {
    connection: redisConnection,
    blockingTimeout: 30000,
  })

  // 🔥 ACTIVE EVENT
  events.on("active", async ({ jobId }) => {
    console.log("⚙️ [QueueEvent:active] Job picked up:", jobId)

    const dbJob = await getJobAndData(jobId)
    if (!dbJob) return

    const io = getIO()
    io.to(`user:${dbJob.userId}`).emit("job:progress", {
      id: dbJob.id,
      status: "PROCESSING",
      progress: dbJob.progress ?? 10,
    })
    console.log(`📢 Emitted 'job:progress' to user:${dbJob.userId}`)
  })

  // 🔥 COMPLETED EVENT
  events.on("completed", async ({ jobId }) => {
    console.log("✅ [QueueEvent:completed] Job completed:", jobId)

    const dbJob = await getJobAndData(jobId)
    if (!dbJob) return

    const generateImage = await prisma.generatedImage.findUnique({
      where: { jobId: dbJob.id },
    })

    const io = getIO()
    io.to(`user:${dbJob.userId}`).emit("job:completed", {
      id: dbJob.id,
      generateId: generateImage?.id,
      status: dbJob.status,
      progress: dbJob.progress ?? 100,
      imageUrl: dbJob.imageUrl,
      error: dbJob.error,
    })

    console.log(`📢 Emitted 'job:completed' to user:${dbJob.userId}`)
  })

  // 🔥 FAILED EVENT
  events.on("failed", async ({ jobId, failedReason }) => {
    console.log("❌ [QueueEvent:failed] Job failed:", jobId, "| Reason:", failedReason)

    const dbJob = await getJobAndData(jobId)
    if (!dbJob) return

    const io = getIO()
    io.to(`user:${dbJob.userId}`).emit("job:failed", {
      id: dbJob.id,
      status: "FAILED",
      error: dbJob.error || failedReason,
    })

    console.log(`📢 Emitted 'job:failed' to user:${dbJob.userId}`)
  })
}

/**
 * Helper: Fetch jobData → DB job record safely.
 */
async function getJobAndData(queueJobId: string) {
  try {
    const jobData = await imageQueue.getJob(queueJobId)
    if (!jobData) {
      console.warn(`⚠️ No jobData found for queue ID: ${queueJobId}`)
      return null
    }

    const realJobId = jobData.data?.jobId
    if (!realJobId) {
      console.warn(`⚠️ jobData.data.jobId missing for queue ID: ${queueJobId}`)
      return null
    }

    const dbJob = await prisma.job.findUnique({ where: { id: realJobId } })
    if (!dbJob || !dbJob.userId) {
      console.warn(`⚠️ No DB job found for jobId: ${realJobId}`)
      return null
    }

    return dbJob
  } catch (err) {
    console.error(`❌ Error fetching job record for queue ID: ${queueJobId}`, err)
    return null
  }
}
