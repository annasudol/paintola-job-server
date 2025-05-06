import { Request, Response, NextFunction } from "express"

/**
 * Wraps async route handlers to forward errors to Express error handler.
 * Avoids repetitive try/catch in controllers.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
