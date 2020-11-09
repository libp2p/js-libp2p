'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const pWaitFor = require('p-wait-for')

const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')

const {
  rendezvousClientOptions,
  rendezvousServerOptions,
  listenAddrs
} = require('./utils')
const peerUtils = require('../utils/creators/peer')

describe('libp2p.rendezvous', () => {
  let libp2p, remoteLibp2p, rendezvousLibp2p

  // Create Rendezvous server node
  before(async () => {
    [rendezvousLibp2p] = await peerUtils.createPeer({
      number: 1,
      fixture: false,
      config: {
        ...rendezvousServerOptions,
        addresses: {
          listen: listenAddrs
        }
      }
    })
  })

  // Create libp2p nodes to act as rendezvous clients
  before(async () => {
    [libp2p, remoteLibp2p] = await peerUtils.createPeer({
      number: 2,
      populateAddressBooks: false,
      config: {
        ...rendezvousClientOptions,
        addresses: {
          listen: listenAddrs
        },
        config: {
          peerDiscovery: {
            bootstrap: { // Bootstrap rendezvous server
              enabled: true,
              list: [
                `${rendezvousLibp2p.multiaddrs[0]}/p2p/${rendezvousLibp2p.peerId.toB58String()}`
              ]
            }
          }
        }
      }
    })
  })

  // Wait for bootstrap peer connected and identified as rendezvous server
  before(async () => {
    await pWaitFor(() => Boolean(rendezvousLibp2p.connectionManager.get(libp2p.peerId)) &&
      Boolean(rendezvousLibp2p.connectionManager.get(remoteLibp2p.peerId))
    )

    await pWaitFor(() => libp2p.rendezvous._rendezvousPoints.size === 1 &&
      remoteLibp2p.rendezvous._rendezvousPoints.size === 1
    )
  })

  after(() => {
    return Promise.all([libp2p, remoteLibp2p, rendezvousLibp2p].map(node => node.stop()))
  })

  it('should have rendezvous libp2p node as rendezvous server', () => {
    expect(libp2p.rendezvous._rendezvousPoints.get(rendezvousLibp2p.peerId.toB58String())).to.exist()
    expect(remoteLibp2p.rendezvous._rendezvousPoints.get(rendezvousLibp2p.peerId.toB58String())).to.exist()
  })

  it('should discover remoteLibp2p when it registers on a namespace', async () => {
    const namespace = '/test-namespace'
    const registers = []

    // libp2p does not discovery any peer registered
    for await (const reg of libp2p.rendezvous.discover(namespace)) { // eslint-disable-line
      throw new Error('no registers should exist')
    }

    // remoteLibp2p register itself on namespace
    await remoteLibp2p.rendezvous.register(namespace)

    // libp2p discover remote libp2p
    for await (const reg of libp2p.rendezvous.discover(namespace)) { // eslint-disable-line
      registers.push(reg)
    }

    expect(registers).to.have.lengthOf(1)
    expect(registers[0].signedPeerRecord).to.exist()
    expect(registers[0].ns).to.eql(namespace)

    // Validate peer
    const envelope = await Envelope.openAndCertify(registers[0].signedPeerRecord, PeerRecord.DOMAIN)
    expect(envelope.peerId.equals(remoteLibp2p.peerId)).to.eql(true)

    // Validate multiaddrs
    const rec = PeerRecord.createFromProtobuf(envelope.payload)
    expect(rec.multiaddrs.length).to.eql(remoteLibp2p.multiaddrs.length)

    rec.multiaddrs.forEach((ma, index) => {
      expect(ma).to.eql(remoteLibp2p.multiaddrs[index])
    })
  })
})
