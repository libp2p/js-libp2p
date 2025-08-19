import { Response } from '@libp2p/daemon-protocol'

/**
 * Creates and encodes an OK response
 */
export function OkResponse (data?: Partial<Response>): Uint8Array {
  return Response.encode({
    type: Response.Type.OK,
    peers: [],
    ...data
  }).subarray()
}

/**
 * Creates and encodes an ErrorResponse
 */
export function ErrorResponse (err: Error): Uint8Array {
  return Response.encode({
    type: Response.Type.ERROR,
    error: {
      msg: err.message
    },
    peers: []
  }).subarray()
}
