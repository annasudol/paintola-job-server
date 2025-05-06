// import { prisma } from "../db/client"
// import { imageGenerationQueue } from "../jobs/imageGenerationQueue"

// export const createJobAndQueue = async (data: {
//   prompt: string
//   userId: string
//   model?: string
//   style_type?: string
//   aspect_ratio?: string
//   magic_prompt_option?: string
//   negative_prompt?: string
// }): Promise<string> => {
//   const { prompt, userId, ...options } = data

//   // Save to DB
//   const job = await prisma.job.create({
//     data: { prompt, userId },
//   })

//   // Queue it
//   await imageGenerationQueue.add("generate", {
//     jobId: job.id,
//     prompt,
//     userId,
//     ...options, // pass rest of values to the worker
//   })

//   return job.id
// }

// export const getJobById = async (jobId: string) => {
//   return prisma.job.findUnique({
//     where: { id: jobId },
//   })
// }

// export const getJobsByUser = async (userId: string) => {
//   return prisma.job.findMany({
//     where: { userId },
//     orderBy: { createdAt: "desc" },
//   })
// }
