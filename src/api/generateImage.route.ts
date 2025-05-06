import { Router } from "express"
import { handleGenerateImage } from "../controllers/generateImage.controller"
import { asyncHandler } from "./../middleware/asyncHandler"

const router = Router()

router.post("/", asyncHandler(handleGenerateImage))

export default router
