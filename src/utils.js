'use strict'

const { AbortError } = require('abortable-iterator')

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {AbortSignal} [signal]
 */
async function raceSignal (promise, signal) {
  if (!signal) {
    return promise
  }

  if (signal.aborted) {
    return Promise.reject(new AbortError('aborted'))
  }

  let listener

  try {
    return Promise.race([
      promise,
      new Promise((resolve, reject) => {
        listener = reject
        signal.addEventListener('abort', reject)
      })
    ])
  } finally {
    if (listener) {
      signal.removeEventListener('abort', listener)
    }
  }
}

module.exports = {
  raceSignal
}
