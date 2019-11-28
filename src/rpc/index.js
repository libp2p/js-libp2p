'use strict'

const pipe = require('it-pipe')
const lp = require('it-length-prefixed')
const PeerInfo = require('peer-info')

const Message = require('../message')
const handlers = require('./handlers')
const utils = require('../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc')
  const getMessageHandler = handlers(dht)

  /**
   * Process incoming DHT messages.
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<Message>}
   *
   * @private
   */
  async function handleMessage (peer, msg) {
    // get handler & execute it
    const handler = getMessageHandler(msg.type)

    try {
      await dht._add(peer)
    } catch (err) {
      log.error('Failed to update the kbucket store', err)
    }

    if (!handler) {
      log.error(`no handler found for message type: ${msg.type}`)
      return
    }

    return handler(peer, msg)
  }

  /**
   * Handle incoming streams on the dht protocol.
   * @param {Object} props
   * @param {DuplexStream} props.stream
   * @param {Connection} props.connection connection
   * @returns {Promise<void>}
   */
  return async function onIncomingStream ({ stream, connection }) {
    const peerInfo = await PeerInfo.create(connection.remotePeer)

    try {
      await dht._add(peerInfo)
    } catch (err) {
      log.error(err)
    }

    const idB58Str = peerInfo.id.toB58String()
    log('from: %s', idB58Str)

    await pipe(
      stream.source,
      lp.decode(),
      source => (async function * () {
        for await (const msg of source) {
          // handle the message
          const desMessage = Message.deserialize(msg.slice())
          const res = await handleMessage(peerInfo, desMessage)

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
}
