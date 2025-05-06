import { Server } from "socket.io"
import { Server as HTTPServer } from "http"

let io: Server | null = null

/**
 * Initialize the Socket.IO server.
 */
export const initSocketServer = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Optional: Replace with frontend URL in production
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket] Client connected: ${socket.id}`)

    // ✅ Join user room
    socket.on("join", ({ room }) => {
      if (!room || typeof room !== "string") {
        console.warn(`⚠️ [Socket] Invalid room provided by socket ${socket.id}`)
        return
      }

      socket.join(room)
      console.log(`✅ [Socket] ${socket.id} joined room: ${room}`)
    })

    socket.on("disconnect", () => {
      console.log(`❌ [Socket] Client disconnected: ${socket.id}`)
    })
  })
}

/**
 * Get the active Socket.IO instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}
