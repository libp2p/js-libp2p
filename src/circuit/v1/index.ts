import { CircuitRelay } from './pb/index'
import type { StreamHandlerV1 } from './stream-handler.js'
export * from './hop.js'

export function handleCircuitV1Error (streamHandler: StreamHandlerV1, code: CircuitRelay.Status): void {
  streamHandler.write({
    type: CircuitRelay.Type.STATUS,
    code
  })
  streamHandler.close()
}
