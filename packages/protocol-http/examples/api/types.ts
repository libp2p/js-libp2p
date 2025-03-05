/**
 * Status information about a libp2p node
 */
export interface NodeStatus {
  /** Current timestamp in ISO format */
  time: string
  /** Node uptime in seconds */
  uptime: number
  /** Number of connected peers */
  connectedPeers: number
  /** Protocol version */
  protocolVersion: string
}

/**
 * A note stored in the system
 */
export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title: string
  content: string
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  title?: string
  content?: string
}

/**
 * API Error response
 */
export interface ErrorResponse {
  error: string
  code: string
  statusCode: number
}
