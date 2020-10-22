'use strict'

const abortable = require('abortable-iterator')
const AbortController = require('abort-controller')
const log = require('debug')('libp2p:mplex:stream')
const pushable = require('it-pushable')
const BufferList = require('bl/BufferList')
const errCode = require('err-code')
const { MAX_MSG_SIZE } = require('./restrict-size')
const { InitiatorMessageTypes, ReceiverMessageTypes } = require('./message-types')

const ERR_MPLEX_STREAM_RESET = 'ERR_MPLEX_STREAM_RESET'
const ERR_MPLEX_STREAM_ABORT = 'ERR_MPLEX_STREAM_ABORT'

/**
 * @param {object} options
 * @param {number} options.id
 * @param {string} options.name
 * @param {function(*)} options.send - Called to send data through the stream
 * @param {function(Error)} [options.onEnd] - Called whenever the stream ends
 * @param {string} [options.type] - One of ['initiator','receiver']. Defaults to 'initiator'
 * @param {number} [options.maxMsgSize] - Max size of an mplex message in bytes. Writes > size are automatically split. Defaults to 1MB
 * @returns {*} A muxed stream
 */
module.exports = ({ id, name, send, onEnd = () => {}, type = 'initiator', maxMsgSize = MAX_MSG_SIZE }) => {
  const abortController = new AbortController()
  const resetController = new AbortController()
  const Types = type === 'initiator' ? InitiatorMessageTypes : ReceiverMessageTypes
  const externalId = type === 'initiator' ? (`i${id}`) : `r${id}`

  name = String(name == null ? id : name)

  let sourceEnded = false
  let sinkEnded = false
  let endErr

  const onSourceEnd = err => {
    if (sourceEnded) return
    sourceEnded = true
    log('%s stream %s source end', type, name, err)
    if (err && !endErr) endErr = err
    if (sinkEnded) {
      stream.timeline.close = Date.now()
      onEnd(endErr)
    }
  }

  const onSinkEnd = err => {
    if (sinkEnded) return
    sinkEnded = true
    log('%s stream %s sink end', type, name, err)
    if (err && !endErr) endErr = err
    if (sourceEnded) {
      stream.timeline.close = Date.now()
      onEnd(endErr)
    }
  }

  const stream = {
    // Close for reading
    close: () => stream.source.end(),
    // Close for reading and writing (local error)
    abort: err => {
      log('%s stream %s abort', type, name, err)
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
    sink: async source => {
      source = abortable(source, [
        { signal: abortController.signal, options: { abortMessage: 'stream aborted', abortCode: ERR_MPLEX_STREAM_ABORT } },
        { signal: resetController.signal, options: { abortMessage: 'stream reset', abortCode: ERR_MPLEX_STREAM_RESET } }
      ])

      if (type === 'initiator') { // If initiator, open a new stream
        send({ id, type: Types.NEW_STREAM, data: name })
      }

      try {
        for await (let data of source) {
          while (data.length) {
            if (data.length <= maxMsgSize) {
              send({ id, type: Types.MESSAGE, data })
              break
            }
            data = BufferList.isBufferList(data) ? data : new BufferList(data)
            send({ id, type: Types.MESSAGE, data: data.shallowSlice(0, maxMsgSize) })
            data.consume(maxMsgSize)
          }
        }
      } catch (err) {
        // Send no more data if this stream was remotely reset
        if (err.code === ERR_MPLEX_STREAM_RESET) {
          log('%s stream %s reset', type, name)
        } else {
          log('%s stream %s error', type, name, err)
          send({ id, type: Types.RESET })
        }

        stream.source.end(err)
        return onSinkEnd(err)
      }

      send({ id, type: Types.CLOSE })
      onSinkEnd()
    },
    source: pushable(onSourceEnd),
    timeline: {
      open: Date.now(),
      close: null
    },
    id: externalId
  }

  return stream
}
