import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { TypedEventEmitter } from 'main-event'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { PeerDiscovery, PeerDiscoveryEvents, PeerInfo, Startable, Libp2p } from '@libp2p/interface'

describe('peer discovery', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should start/stop startable discovery on libp2p start/stop', async () => {
    const discovery = stubInterface<PeerDiscovery & Startable>()

    libp2p = await createLibp2p({
      peerDiscovery: [
        () => discovery
      ]
    })

    await libp2p.start()
    expect(discovery.start.calledOnce).to.be.true()
    expect(discovery.stop.called).to.be.false()

    await libp2p.stop()
    expect(discovery.start.calledOnce).to.be.true()
    expect(discovery.stop.calledOnce).to.be.true()
  })

  it('should append peer id to circuit relay addresses in peer:discovery event', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // Address without target peer ID (e.g. as announced via identify by the remote peer)
    const relayAddr = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit`)

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [relayAddr]
      }
    })

    const evt = await eventPromise

    expect(evt.detail.id.toString()).to.equal(remotePeerId.toString())
    expect(evt.detail.multiaddrs).to.have.length(1)
    expect(evt.detail.multiaddrs[0].toString()).to.equal(
      `/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`
    )
  })

  it('should not duplicate peer id in circuit relay addresses that already have one', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // Address already has the target peer ID (e.g. as sent by pubsub-peer-discovery)
    const relayAddrWithPeerId = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`)

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [relayAddrWithPeerId]
      }
    })

    const evt = await eventPromise

    expect(evt.detail.id.toString()).to.equal(remotePeerId.toString())
    expect(evt.detail.multiaddrs).to.have.length(1)
    expect(evt.detail.multiaddrs[0].toString()).to.equal(
      `/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`
    )
  })

  it('should not modify direct (non-relay) addresses in peer:discovery event', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const directAddr = multiaddr('/ip4/1.2.3.4/tcp/4001')

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [directAddr]
      }
    })

    const evt = await eventPromise

    expect(evt.detail.multiaddrs).to.have.length(1)
    expect(evt.detail.multiaddrs[0].toString()).to.equal('/ip4/1.2.3.4/tcp/4001')
  })

  it('should append peer id to WebRTC circuit relay addresses missing one', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // WebRTC relay address without target peer ID
    const webrtcRelayAddr = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/webrtc`)

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [webrtcRelayAddr]
      }
    })

    const evt = await eventPromise

    expect(evt.detail.multiaddrs).to.have.length(1)
    expect(evt.detail.multiaddrs[0].toString()).to.equal(
      `/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/webrtc/p2p/${remotePeerId}`
    )
  })

  it('should not duplicate peer id in WebRTC circuit relay addresses that already have one', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // WebRTC relay address that already includes the target peer ID (e.g. from pubsub-peer-discovery)
    const webrtcRelayAddrWithPeerId = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/webrtc/p2p/${remotePeerId}`)

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [webrtcRelayAddrWithPeerId]
      }
    })

    const evt = await eventPromise

    expect(evt.detail.multiaddrs).to.have.length(1)
    expect(evt.detail.multiaddrs[0].toString()).to.equal(
      `/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/webrtc/p2p/${remotePeerId}`
    )
  })

  it('should handle mixed relay and direct addresses correctly in peer:discovery event', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [() => discovery]
    })

    await libp2p.start()

    const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const directAddr = multiaddr('/ip4/1.2.3.4/tcp/4001')
    const relayAddrNoId = multiaddr(`/ip4/5.6.7.8/tcp/1234/p2p/${relayPeerId}/p2p-circuit`)
    const relayAddrWithId = multiaddr(`/ip4/9.10.11.12/tcp/5678/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`)

    const eventPromise = pEvent<'peer:discovery', CustomEvent<PeerInfo>>(libp2p, 'peer:discovery')

    discovery.safeDispatchEvent('peer', {
      detail: {
        id: remotePeerId,
        multiaddrs: [directAddr, relayAddrNoId, relayAddrWithId]
      }
    })

    const evt = await eventPromise

    const addrStrings = evt.detail.multiaddrs.map(ma => ma.toString())

    // Direct address unchanged
    expect(addrStrings).to.include('/ip4/1.2.3.4/tcp/4001')
    // Relay without peer ID gets it appended
    expect(addrStrings).to.include(`/ip4/5.6.7.8/tcp/1234/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`)
    // Relay that already has peer ID is not modified
    expect(addrStrings).to.include(`/ip4/9.10.11.12/tcp/5678/p2p/${relayPeerId}/p2p-circuit/p2p/${remotePeerId}`)
    // No address should have a double peer ID
    expect(addrStrings.every(a => !a.includes(`/p2p/${remotePeerId}/p2p/${remotePeerId}`))).to.be.true()
  })

  it('should ignore self on discovery', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
      peerDiscovery: [
        () => discovery
      ]
    })

    await libp2p.start()
    const discoverySpy = sinon.spy()
    libp2p.addEventListener('peer:discovery', discoverySpy)
    discovery.safeDispatchEvent('peer', {
      detail: {
        id: libp2p.peerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/2341')
        ]
      }
    })

    expect(discoverySpy.called).to.eql(false)
  })
})
