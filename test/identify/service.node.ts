/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { identifyService } from '../../src/identify/index.js'
import { createLibp2pNode } from '../../src/libp2p.js'
import { createBaseOptions } from '../utils/base-options.js'
import { createNode } from '../utils/creators/peer.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

const LOCAL_PORT = 47321
const REMOTE_PORT = 47322

describe('identify', () => {
  let libp2p: Libp2p<{ identify: unknown }>
  let remoteLibp2p: Libp2p<{ identify: unknown }>

  beforeEach(async () => {
    libp2p = await createLibp2pNode(createBaseOptions({
      addresses: {
        announce: [`/dns4/localhost/tcp/${LOCAL_PORT}`],
        listen: [`/ip4/0.0.0.0/tcp/${LOCAL_PORT}`]
      },
      services: {
        identify: identifyService()
      }
    }))
    remoteLibp2p = await createLibp2pNode(createBaseOptions({
      addresses: {
        announce: [`/dns4/localhost/tcp/${REMOTE_PORT}`],
        listen: [`/ip4/0.0.0.0/tcp/${REMOTE_PORT}`]
      },
      services: {
        identify: identifyService()
      }
    }))
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should run identify automatically for outbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.services.identify == null) {
      throw new Error('Identity service was not configured')
    }

    const eventPromise = pEvent(libp2p, 'peer:identify')

    // dial local -> remote via loopback in order to assert we receive the announce address via identify
    const connection = await libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/${REMOTE_PORT}/p2p/${remoteLibp2p.peerId.toString()}`))
    expect(connection).to.exist()

    // wait for identify to run on the new connection
    await eventPromise

    // assert we have received certified announce addresses
    const peer = await libp2p.peerStore.get(remoteLibp2p.peerId)
    expect(peer.addresses).to.have.lengthOf(1)
    expect(peer.addresses[0].isCertified).to.be.true('did not receive certified address via identify')
    expect(peer.addresses[0].multiaddr.toString()).to.startWith('/dns4/localhost/', 'did not receive announce address via identify')
  })

  it('should run identify automatically for inbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.services.identify == null) {
      throw new Error('Identity service was not configured')
    }

    const eventPromise = pEvent(remoteLibp2p, 'peer:identify')

    // dial remote -> local via loopback in order to assert we receive the announce address via identify
    const connection = await remoteLibp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/${LOCAL_PORT}/p2p/${libp2p.peerId.toString()}`))
    expect(connection).to.exist()

    // wait for identify to run on the new connection
    await eventPromise

    // assert we have received certified announce addresses
    const peer = await libp2p.peerStore.get(remoteLibp2p.peerId)
    expect(peer.addresses).to.have.lengthOf(1)
    expect(peer.addresses[0].isCertified).to.be.true('did not receive certified address via identify')
    expect(peer.addresses[0].multiaddr.toString()).to.startWith('/dns4/localhost/', 'did not receive announce address via identify')
  })

  it('should identify connection on dial and get proper announce addresses', async () => {
    const announceAddrs = [
      '/dns4/peers1.com/tcp/433/wss',
      '/dns4/peers2.com/tcp/433/wss'
    ]
    const port = 58322
    const protocol = '/ipfs/bitswap/1.2.0'

    const receiver = await createNode({
      config: {
        addresses: {
          announce: announceAddrs,
          listen: [`/ip4/127.0.0.1/tcp/${port}/ws`]
        },
        services: {
          identify: identifyService()
        }
      }
    })
    await receiver.handle(protocol, () => {})

    const sender = await createNode({
      config: {
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/0/ws']
        },
        services: {
          identify: identifyService()
        }
      }
    })

    const eventPromise = pEvent(sender, 'peer:identify')

    const connection = await sender.dial(multiaddr(`/ip4/127.0.0.1/tcp/${port}/ws/p2p/${receiver.peerId.toString()}`))

    await eventPromise

    const stream = await connection.newStream(protocol)
    const clientPeer = await sender.peerStore.get(receiver.peerId)

    expect(clientPeer.addresses).to.have.length(2)
    expect(clientPeer.addresses[0].multiaddr.toString()).to.equal(announceAddrs[0].toString())
    expect(clientPeer.addresses[1].multiaddr.toString()).to.equal(announceAddrs[1].toString())

    stream.close()
    await connection.close()
    await receiver.stop()
    await sender.stop()
  })
})
