'use strict'

const pipe = require('it-pipe')
const { Connection } = require('libp2p-interfaces/src/connection')
const multiaddr = require('multiaddr')
const Muxer = require('libp2p-mplex')
const Multistream = require('multistream-select')
const pair = require('it-pair')
const errCode = require('err-code')
const { codes } = require('../../src/errors')

const mockMultiaddrConnPair = require('./mockMultiaddrConn')
const peerUtils = require('./creators/peer')

module.exports = async (properties = {}) => {
  const localAddr = multiaddr('/ip4/127.0.0.1/tcp/8080')
  const remoteAddr = multiaddr('/ip4/127.0.0.1/tcp/8081')

  const [localPeer, remotePeer] = await peerUtils.createPeerId({ number: 2 })
  const openStreams = []
  let streamId = 0

  return new Connection({
    localPeer: localPeer,
    remotePeer: remotePeer,
    localAddr,
    remoteAddr,
    stat: {
      timeline: {
        open: Date.now() - 10,
        upgraded: Date.now()
      },
      direction: 'outbound',
      encryption: '/noise',
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

/**
 * Creates a full connection pair, without the transport or encryption
 *
 * @param {object} options
 * @param {Multiaddr[]} options.addrs - Should contain two addresses for the local and remote peer respectively
 * @param {Array<PeerId>} options.peers - Array containing local and remote peer ids
 * @param {Map<string, Function>} options.protocols - The protocols the connections should support
 * @returns {{inbound:Connection, outbound:Connection}}
 */
module.exports.pair = function connectionPair ({ addrs, peers, protocols }) {
  const [localPeer, remotePeer] = peers

  const {
    inbound: inboundMaConn,
    outbound: outboundMaConn
  } = mockMultiaddrConnPair({ addrs, remotePeer })

  const inbound = createConnection({
    direction: 'inbound',
    maConn: inboundMaConn,
    protocols,
    // Inbound connection peers are reversed
    localPeer: remotePeer,
    remotePeer: localPeer
  })
  const outbound = createConnection({
    direction: 'outbound',
    maConn: outboundMaConn,
    protocols,
    localPeer,
    remotePeer
  })

  return { inbound, outbound }
}

function createConnection ({
  direction,
  maConn,
  localPeer,
  remotePeer,
  protocols
}) {
  // Create the muxer
  const muxer = new Muxer({
    // Run anytime a remote stream is created
    onStream: async muxedStream => {
      const mss = new Multistream.Listener(muxedStream)
      try {
        const { stream, protocol } = await mss.handle(Array.from(protocols.keys()))
        connection.addStream(stream, protocol)
        // Need to be able to notify a peer of this this._onStream({ connection, stream, protocol })
        const handler = protocols.get(protocol)
        handler({ connection, stream, protocol })
      } catch (err) {
        // Do nothing
      }
    },
    // Run anytime a stream closes
    onStreamEnd: muxedStream => {
      connection.removeStream(muxedStream.id)
    }
  })

  const newStream = async protocols => {
    const muxedStream = muxer.newStream()
    const mss = new Multistream.Dialer(muxedStream)
    try {
      const { stream, protocol } = await mss.select(protocols)
      return { stream: { ...muxedStream, ...stream }, protocol }
    } catch (err) {
      throw errCode(err, codes.ERR_UNSUPPORTED_PROTOCOL)
    }
  }

  // Pipe all data through the muxer
  pipe(maConn, muxer, maConn)

  maConn.timeline.upgraded = Date.now()

  // Create the connection
  const connection = new Connection({
    localAddr: maConn.localAddr,
    remoteAddr: maConn.remoteAddr,
    localPeer: localPeer,
    remotePeer: remotePeer,
    stat: {
      direction,
      timeline: maConn.timeline,
      multiplexer: Muxer.multicodec,
      encryption: 'N/A'
    },
    newStream,
    getStreams: () => muxer.streams,
    close: err => maConn.close(err)
  })

  return connection
}
