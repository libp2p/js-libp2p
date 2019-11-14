'use strict'

const lp = require('it-length-prefixed')
const pipe = require('it-pipe')
const DuplexPair = require('it-pair/duplex')

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const PubsubBaseProtocol = require('../../src')
const { message } = require('../../src')

exports.createPeerInfo = async () => {
  const peerId = await PeerId.create({ bits: 1024 })

  return PeerInfo.create(peerId)
}

class PubsubImplementation extends PubsubBaseProtocol {
  constructor (protocol, peerInfo, registrar) {
    super({
      debugName: 'libp2p:pubsub',
      multicodecs: protocol,
      peerInfo: peerInfo,
      registrar: registrar
    })
  }

  publish (topics, messages) {
    // ...
  }

  subscribe (topics) {
    // ...
  }

  unsubscribe (topics) {
    // ...
  }

  _processMessages (idB58Str, conn, peer) {
    pipe(
      conn,
      lp.decode(),
      async function (source) {
        for await (const val of source) {
          const rpc = message.rpc.RPC.decode(val)

          return rpc
        }
      }
    )
  }
}

exports.PubsubImplementation = PubsubImplementation

exports.mockRegistrar = {
  handle: () => {},
  register: () => {},
  unregister: () => {}
}

exports.createMockRegistrar = (registrarRecord) => ({
  handle: (multicodecs, handler) => {
    const rec = registrarRecord[multicodecs[0]] || {}

    registrarRecord[multicodecs[0]] = {
      ...rec,
      handler
    }
  },
  register: ({ multicodecs, _onConnect, _onDisconnect }) => {
    const rec = registrarRecord[multicodecs[0]] || {}

    registrarRecord[multicodecs[0]] = {
      ...rec,
      onConnect: _onConnect,
      onDisconnect: _onDisconnect
    }

    return multicodecs[0]
  },
  unregister: (id) => {
    delete registrarRecord[id]
  }
})

exports.ConnectionPair = () => {
  const [d0, d1] = DuplexPair()

  return [
    {
      stream: d0,
      newStream: () => Promise.resolve({ stream: d0 })
    },
    {
      stream: d1,
      newStream: () => Promise.resolve({ stream: d1 })
    }
  ]
}
