'use strict'

const { Connection } = require('libp2p-interfaces/src/connection')
const multiaddr = require('multiaddr')

const pair = require('it-pair')

const peerUtils = require('../utils/creators/peer')

module.exports.createMockConnection = async (properties = {}) => {
  const localAddr = multiaddr('/ip4/127.0.0.1/tcp/8080')
  const remoteAddr = multiaddr('/ip4/127.0.0.1/tcp/8081')

  const [localPeer, remotePeer] = await peerUtils.createPeerInfoFromFixture(2)
  const openStreams = []
  let streamId = 0

  return new Connection({
    localPeer: localPeer.id,
    remotePeer: remotePeer.id,
    localAddr,
    remoteAddr,
    stat: {
      timeline: {
        open: Date.now() - 10,
        upgraded: Date.now()
      },
      direction: 'outbound',
      encryption: '/secio/1.0.0',
      multiplexer: '/mplex/6.7.0'
    },
    newStream: (protocols) => {
      const id = streamId++
      const stream = pair()

      stream.close = () => stream.sink([])
      stream.id = id

      openStreams.push(stream)

      return {
        stream,
        protocol: protocols[0]
      }
    },
    close: () => { },
    getStreams: () => openStreams,
    ...properties
  })
}
