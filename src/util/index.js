'use strict'
const once = require('once')
const defer = require('p-defer')
const Writer = require('it-pushable')

/**
 * Registers `handler` to each event in `events`. The `handler`
 * will only be called for the first event fired, at which point
 * the `handler` will be removed as a listener.
 *
 * Ensures `handler` is only called once.
 *
 * @example
 * // will call `callback` when `start` or `error` is emitted by `this`
 * emitFirst(this, ['error', 'start'], callback)
 *
 * @private
 * @param {EventEmitter} emitter The emitter to listen on
 * @param {Array<string>} events The events to listen for
 * @param {function(*)} handler The handler to call when an event is triggered
 * @returns {void}
 */
function emitFirst (emitter, events, handler) {
  handler = once(handler)
  events.forEach((e) => {
    emitter.once(e, (...args) => {
      events.forEach((ev) => {
        emitter.removeListener(ev, handler)
      })
      handler.apply(emitter, args)
    })
  })
}

function toWriter ({ sink, source }) {
  const writer = Writer() // Write bytes on demand to the sink

  // Waits for a source to be passed to the restSink
  const sourcePromise = defer()

  const sinkPromise = sink((async function * () {
    yield * writer
    const source = await sourcePromise.promise
    yield * source
  })())

  const restSink = source => {
    sourcePromise.resolve(source)
    return sinkPromise
  }

  return {
    writer,
    sink: restSink,
    // Make the source a generator so `.next` can be used
    source: (async function * () {
      yield * source
    })()
  }
}

module.exports.emitFirst = emitFirst
module.exports.toWriter = toWriter
