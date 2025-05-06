import { Router } from "express"
import { asyncHandler } from "../middleware/asyncHandler"
import { deleteJobById, getJobsByUser } from "../controllers/getJobsByUser.controller"

const router = Router()
router.get("/:userId", asyncHandler(getJobsByUser))
router.delete("/:jobId", asyncHandler(deleteJobById))

export default router
