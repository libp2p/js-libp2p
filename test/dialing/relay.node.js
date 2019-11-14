'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const multiaddr = require('multiaddr')
const { collect } = require('streaming-iterables')
const pipe = require('it-pipe')
const { createPeerInfoFromFixture } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')
const Libp2p = require('../../src')

describe('Dialing (via relay, TCP)', () => {
  let srcLibp2p
  let relayLibp2p
  let dstLibp2p

  before(async () => {
    const peerInfos = await createPeerInfoFromFixture(3)
    // Create 3 nodes, and turn HOP on for the relay
    ;[srcLibp2p, relayLibp2p, dstLibp2p] = peerInfos.map((peerInfo, index) => {
      const opts = baseOptions
      index === 1 && (opts.config.relay.hop.enabled = true)
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      return new Libp2p({
        ...opts,
        peerInfo
      })
    })

    dstLibp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))
  })

  beforeEach(() => {
    // Start each node
    return Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(libp2p => libp2p.start()))
  })

  afterEach(() => {
    // Stop each node
    return Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(libp2p => libp2p.stop()))
  })

  it('should be able to connect to a peer over a relay with active connections', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerInfo.id.toString()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toString()}`)

    // Connect the target peer and the relay, since the relay is not active
    const destToRelayConn = await dstLibp2p.dial(relayAddr)
    expect(destToRelayConn).to.exist()

    const tcpAddrs = dstLibp2p.transportManager.getAddrs()
    await dstLibp2p.transportManager.listen([multiaddr(`/p2p-circuit${relayAddr}/p2p/${relayIdString}`)])
    expect(dstLibp2p.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    dstLibp2p.transportManager.getAddrs().forEach(addr => console.log(String(addr)))

    const connection = await srcLibp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remotePeer.toBytes()).to.eql(dstLibp2p.peerInfo.id.toBytes())
    expect(connection.localPeer.toBytes()).to.eql(srcLibp2p.peerInfo.id.toBytes())
    expect(connection.remoteAddr).to.eql(dialAddr)
    expect(connection.localAddr).to.eql(
      relayAddr // the relay address
        .encapsulate(`/p2p/${relayIdString}`) // with its peer id
        .encapsulate('/p2p-circuit') // the local peer is connected over the relay
        .encapsulate(`/p2p/${srcLibp2p.peerInfo.id.toB58String()}`) // and the local peer id
    )

    const { stream: echoStream } = await connection.newStream('/echo/1.0.0')
    const input = Buffer.from('hello')
    const [output] = await pipe(
      [input],
      echoStream,
      collect
    )
    expect(output.slice()).to.eql(input)
  })
})
