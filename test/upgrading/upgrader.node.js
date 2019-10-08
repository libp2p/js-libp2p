'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')
const Muxer = require('libp2p-mplex')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const pipe = require('it-pipe')
const Upgrader = require('../../src/upgrader')
const { codes } = require('../../src/errors')
const { collect } = require('streaming-iterables')
const pSettle = require('p-settle')

const mockMultiaddrConn = require('../utils/mockMultiaddrConn')
const Peers = require('../fixtures/peers')
const addrs = [
  multiaddr('/ip4/127.0.0.1/tcp/0'),
  multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Upgrader', () => {
  let localUpgrader
  let remoteUpgrader
  let localPeer
  let remotePeer

  before(async () => {
    ([
      localPeer,
      remotePeer
    ] = await Promise.all([
      PeerId.createFromJSON(Peers[0]),
      PeerId.createFromJSON(Peers[1])
    ]))

    localUpgrader = new Upgrader({
      localPeer
    })
    remoteUpgrader = new Upgrader({
      localPeer: remotePeer
    })

    localUpgrader.protocols.set('/echo/1.0.0', (stream) => pipe(stream, stream))
    remoteUpgrader.protocols.set('/echo/1.0.0', (stream) => pipe(stream, stream))
  })

  it('should ignore a missing remote peer id', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: (localPeer, stream) => {
        return {
          conn: stream,
          remotePeer: localPeer
        }
      },
      secureOutbound: (localPeer, stream, remotePeerId) => {
        return {
          conn: stream,
          remotePeer: remotePeer
        }
      }
    }
    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Remove the peer id from the remote address
    outbound.remoteAddr = outbound.remoteAddr.decapsulateCode(421)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)
  })

  it('should upgrade with valid muxers and crypto', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: (localPeer, stream) => {
        return {
          conn: stream,
          remotePeer: localPeer
        }
      },
      secureOutbound: (localPeer, stream, remotePeerId) => {
        return {
          conn: stream,
          remotePeer: remotePeer
        }
      }
    }
    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const { stream, protocol } = await connections[0].newStream('/echo/1.0.0')
    expect(protocol).to.equal('/echo/1.0.0')

    const hello = Buffer.from('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      collect
    )

    expect(result).to.eql([hello])
  })

  it('should fail if crypto fails', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: () => { throw new Error('Boom') },
      secureOutbound: () => { throw new Error('Boom') }
    }

    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Wait for the results of each side of the connection
    const results = await pSettle([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_ENCRYPTION_FAILED)
    })
  })

  it('should fail if muxers do not match', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxersLocal = new Map([['/muxer-local', Muxer]])
    const muxersRemote = new Map([['/muxer-remote', Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxersLocal)
    sinon.stub(remoteUpgrader, 'muxers').value(muxersRemote)

    const crypto = {
      tag: '/insecure',
      secureInbound: (remotePeer, conn) => {
        return { conn, remotePeer }
      },
      secureOutbound: (_, conn, remotePeer) => {
        return { conn, remotePeer }
      }
    }

    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Wait for the results of each side of the connection
    const results = await pSettle([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_MUXER_UNAVAILABLE)
    })
  })

  it('should map getStreams and close methods', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: (localPeer, stream) => {
        return {
          conn: stream,
          remotePeer: localPeer
        }
      },
      secureOutbound: (localPeer, stream, remotePeerId) => {
        return {
          conn: stream,
          remotePeer: remotePeer
        }
      }
    }
    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    // Create a few streams, at least 1 in each direction
    await connections[0].newStream('/echo/1.0.0')
    await connections[1].newStream('/echo/1.0.0')
    await connections[0].newStream('/echo/1.0.0')
    connections.forEach(conn => {
      expect(conn.streams).to.have.length(3)
    })

    // Verify the MultiaddrConnection close method is called
    sinon.spy(inbound, 'close')
    sinon.spy(outbound, 'close')
    await Promise.all(connections.map(conn => conn.close()))
    expect(inbound.close.callCount).to.equal(1)
    expect(outbound.close.callCount).to.equal(1)
  })

  it('should fail to create a stream for an unsupported protocol', async () => {
    const { inbound, outbound } = mockMultiaddrConn({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: (localPeer, stream) => {
        return {
          conn: stream,
          remotePeer: localPeer
        }
      },
      secureOutbound: (localPeer, stream, remotePeerId) => {
        return {
          conn: stream,
          remotePeer: remotePeer
        }
      }
    }
    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const results = await pSettle([
      connections[0].newStream('/unsupported/1.0.0'),
      connections[1].newStream('/unsupported/1.0.0')
    ])
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_UNSUPPORTED_PROTOCOL)
    })
  })
})
