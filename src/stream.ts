import { abortableSource } from 'abortable-iterator'
import { pushable } from 'it-pushable'
import errCode from 'err-code'
import { MAX_MSG_SIZE } from './restrict-size.js'
import { anySignal } from 'any-signal'
import { InitiatorMessageTypes, ReceiverMessageTypes } from './message-types.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Uint8ArrayList } from 'uint8arraylist'
import { logger } from '@libp2p/logger'
import type { Message } from './message-types.js'
import type { Timeline } from '@libp2p/interfaces/connection'
import type { Source } from 'it-stream-types'
import type { MplexStream } from './mplex.js'

const log = logger('libp2p:mplex:stream')

const ERR_MPLEX_STREAM_RESET = 'ERR_MPLEX_STREAM_RESET'
const ERR_MPLEX_STREAM_ABORT = 'ERR_MPLEX_STREAM_ABORT'

export interface Options {
  id: number
  send: (msg: Message) => void
  name?: string
  onEnd?: (err?: Error) => void
  type?: 'initiator' | 'receiver'
  maxMsgSize?: number
}

export function createStream (options: Options): MplexStream {
  const { id, name, send, onEnd, type = 'initiator', maxMsgSize = MAX_MSG_SIZE } = options

  const abortController = new AbortController()
  const resetController = new AbortController()
  const Types = type === 'initiator' ? InitiatorMessageTypes : ReceiverMessageTypes
  const externalId = type === 'initiator' ? (`i${id}`) : `r${id}`
  const streamName = `${name == null ? id : name}`

  let sourceEnded = false
  let sinkEnded = false
  let endErr: Error | undefined

  const timeline: Timeline = {
    open: Date.now()
  }

  const onSourceEnd = (err?: Error) => {
    if (sourceEnded) {
      return
    }

    sourceEnded = true
    log.trace('%s stream %s source end', type, streamName, err)

    if (err != null && endErr == null) {
      endErr = err
    }

    if (sinkEnded) {
      stream.timeline.close = Date.now()

      if (onEnd != null) {
        onEnd(endErr)
      }
    }
  }

  const onSinkEnd = (err?: Error) => {
    if (sinkEnded) {
      return
    }

    sinkEnded = true
    log.trace('%s stream %s sink end - err: %o', type, streamName, err)

    if (err != null && endErr == null) {
      endErr = err
    }

    if (sourceEnded) {
      timeline.close = Date.now()

      if (onEnd != null) {
        onEnd(endErr)
      }
    }
  }

  const stream = {
    // Close for reading
    close: () => {
      stream.source.end()
    },
    // Close for reading and writing (local error)
    abort: (err?: Error) => {
      log.trace('%s stream %s abort', type, streamName, err)
      // End the source with the passed error
      stream.source.end(err)
      abortController.abort()
      onSinkEnd(err)
    },
    // Close immediately for reading and writing (remote error)
    reset: () => {
      const err = errCode(new Error('stream reset'), ERR_MPLEX_STREAM_RESET)
      resetController.abort()
      stream.source.end(err)
      onSinkEnd(err)
    },
    sink: async (source: Source<Uint8Array>) => {
      source = abortableSource(source, anySignal([
        abortController.signal,
        resetController.signal
      ]))

      try {
        if (type === 'initiator') { // If initiator, open a new stream
          send({ id, type: InitiatorMessageTypes.NEW_STREAM, data: uint8ArrayFromString(streamName) })
        }

        const uint8ArrayList = new Uint8ArrayList()

        for await (const data of source) {
          uint8ArrayList.append(data)

          while (uint8ArrayList.length !== 0) {
            if (uint8ArrayList.length <= maxMsgSize) {
              send({ id, type: Types.MESSAGE, data: uint8ArrayList.subarray() })
              uint8ArrayList.consume(uint8ArrayList.length)
              break
            }

            const toSend = uint8ArrayList.length - maxMsgSize
            send({ id, type: Types.MESSAGE, data: uint8ArrayList.subarray(0, toSend) })
            uint8ArrayList.consume(toSend)
          }
        }
      } catch (err: any) {
        if (err.type === 'aborted' && err.message === 'The operation was aborted') {
          if (resetController.signal.aborted) {
            err.message = 'stream reset'
            err.code = ERR_MPLEX_STREAM_RESET
          }

          if (abortController.signal.aborted) {
            err.message = 'stream aborted'
            err.code = ERR_MPLEX_STREAM_ABORT
          }
        }

        // Send no more data if this stream was remotely reset
        if (err.code === ERR_MPLEX_STREAM_RESET) {
          log.trace('%s stream %s reset', type, name)
        } else {
          log.trace('%s stream %s error', type, name, err)
          try {
            send({ id, type: Types.RESET })
          } catch (err) {
            log.trace('%s stream %s error sending reset', type, name, err)
          }
        }

        stream.source.end(err)
        onSinkEnd(err)
        return
      }

      try {
        send({ id, type: Types.CLOSE })
      } catch (err) {
        log.trace('%s stream %s error sending close', type, name, err)
      }

      onSinkEnd()
    },
    source: pushable<Uint8Array>({
      onEnd: onSourceEnd
    }),
    timeline,
    id: externalId
  }

  return stream
}
