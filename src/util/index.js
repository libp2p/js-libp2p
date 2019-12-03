'use strict'

const AbortController = require('abort-controller')

/**
 * Converts BufferList messages to Buffers
 * @param {*} source
 * @returns {AsyncGenerator}
 */
function toBuffer (source) {
  return (async function * () {
    for await (const chunk of source) {
      yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
    }
  })()
}

/**
 * Takes an array of AbortSignals and returns a single signal.
 * If any signals are aborted, the returned signal will be aborted.
 * @param {Array<AbortSignal>} signals
 * @returns {AbortSignal}
 */
function anySignal (signals) {
  const controller = new AbortController()

  function onAbort () {
    controller.abort()

    // Cleanup
    for (const signal of signals) {
      signal.removeEventListener('abort', onAbort)
    }
  }

  for (const signal of signals) {
    if (signal.aborted) {
      onAbort()
      break
    }
    signal.addEventListener('abort', onAbort)
  }

  return controller.signal
}

module.exports.toBuffer = toBuffer
module.exports.anySignal = anySignal
