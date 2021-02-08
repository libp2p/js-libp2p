'use strict'

const { pipe } = require('it-pipe')
const lp = require('it-length-prefixed')

const Message = require('../message')
const handlers = require('./handlers')
const utils = require('../utils')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */

/**
 * @param {import('../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc')
  const getMessageHandler = handlers(dht)

  /**
   * Process incoming DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async function handleMessage (peerId, msg) {
    // get handler & execute it
    const handler = getMessageHandler(msg.type)

    try {
      await dht._add(peerId)
    } catch (err) {
      log.error('Failed to update the kbucket store', err)
    }

    if (!handler) {
      log.error(`no handler found for message type: ${msg.type}`)
      return
    }

    return handler(peerId, msg)
  }

  /**
   * Handle incoming streams on the dht protocol
   *
   * @param {object} props
   * @param {MuxedStream} props.stream
   * @param {import('libp2p-interfaces/src/connection').Connection} props.connection
   */
  async function onIncomingStream ({ stream, connection }) {
    const peerId = connection.remotePeer

    try {
      await dht._add(peerId)
    } catch (err) {
      log.error(err)
    }

    const idB58Str = peerId.toB58String()
    log('from: %s', idB58Str)

    await pipe(
      stream.source,
      lp.decode(),
      /**
       * @param {AsyncIterable<Uint8Array>} source
       */
      source => (async function * () {
        for await (const msg of source) {
          // handle the message
          const desMessage = Message.deserialize(msg.slice())
          const res = await handleMessage(peerId, desMessage)

          // Not all handlers will return a response
          if (res) {
            yield res.serialize()
          }
        }
      })(),
      lp.encode(),
      stream.sink
    )
  }

  return onIncomingStream
}
