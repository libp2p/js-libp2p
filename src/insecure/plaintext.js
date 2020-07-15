'use strict'

const handshake = require('it-handshake')
const lp = require('it-length-prefixed')
const PeerId = require('peer-id')
const debug = require('debug')
const log = debug('libp2p:plaintext')
log.error = debug('libp2p:plaintext:error')
const { UnexpectedPeerError, InvalidCryptoExchangeError } = require('libp2p-interfaces/src/crypto/errors')

const { Exchange, KeyType } = require('./proto')
const protocol = '/plaintext/2.0.0'

function lpEncodeExchange (exchange) {
  const pb = Exchange.encode(exchange)
  return lp.encode.single(pb)
}

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

module.exports = {
  protocol,
  secureInbound: (localId, conn, remoteId) => {
    return encrypt(localId, conn, remoteId)
  },
  secureOutbound: (localId, conn, remoteId) => {
    return encrypt(localId, conn, remoteId)
  }
}
