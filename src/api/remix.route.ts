import { Router } from "express"
import { handleRemixImage } from "../controllers/remixImage.controller"
import { remixUpload } from "../middleware/uploadMiddleware"
import { asyncHandler } from "../middleware/asyncHandler"

const router = Router()

router.post("/", remixUpload, asyncHandler(handleRemixImage))

export default router
