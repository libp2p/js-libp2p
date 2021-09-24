'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:plaintext'), {
  error: debug('libp2p:plaintext:err')
})
// @ts-ignore it-handshake do not export types
const handshake = require('it-handshake')
const lp = require('it-length-prefixed')
const PeerId = require('peer-id')
const { UnexpectedPeerError, InvalidCryptoExchangeError } = require('libp2p-interfaces/src/crypto/errors')

const { Exchange, KeyType } = require('./proto')
const protocol = '/plaintext/2.0.0'

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */

/**
 * @param {import('./proto').IExchange} exchange
 */
function lpEncodeExchange (exchange) {
  const pb = Exchange.encode(exchange).finish()
  // @ts-ignore TODO: Uint8Array not assignable to Buffer
  return lp.encode.single(pb)
}

/**
 * Encrypt connection.
 *
 * @param {PeerId} localId
 * @param {Connection} conn
 * @param {PeerId} [remoteId]
 */
async function encrypt (localId, conn, remoteId) {
  const shake = handshake(conn)

  // Encode the public key and write it to the remote peer
  shake.write(lpEncodeExchange({
    id: localId.toBytes(),
    pubkey: {
      Type: KeyType.RSA, // TODO: dont hard code
      Data: localId.marshalPubKey()
    }
  }))

  log('write pubkey exchange to peer %j', remoteId)

  // Get the Exchange message
  const response = (await lp.decode.fromReader(shake.reader).next()).value
  const id = Exchange.decode(response.slice())
  log('read pubkey exchange from peer %j', remoteId)

  let peerId
  try {
    peerId = await PeerId.createFromPubKey(id.pubkey.Data)
  } catch (err) {
    log.error(err)
    throw new InvalidCryptoExchangeError('Remote did not provide its public key')
  }

  if (remoteId && !peerId.equals(remoteId)) {
    throw new UnexpectedPeerError()
  }

  log('plaintext key exchange completed successfully with peer %j', peerId)

  shake.rest()
  return {
    conn: shake.stream,
    remotePeer: peerId
  }
}

module.exports =
 {
   protocol,
   /**
    * @param {PeerId} localId
    * @param {Connection} conn
    * @param {PeerId | undefined} remoteId
    */
   secureInbound: (localId, conn, remoteId) => {
     return encrypt(localId, conn, remoteId)
   },
   /**
    * @param {PeerId} localId
    * @param {Connection} conn
    * @param {PeerId | undefined} remoteId
    */
   secureOutbound: (localId, conn, remoteId) => {
     return encrypt(localId, conn, remoteId)
   }
 }
