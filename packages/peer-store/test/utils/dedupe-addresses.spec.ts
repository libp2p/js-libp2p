import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { dedupeFilterAndSortAddresses } from '../../src/utils/dedupe-addresses.js'
import type { PeerId } from '@libp2p/interface'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')

describe('dedupe-addresses', () => {
  let peerId: PeerId

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('should dedupe addresses', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr2,
      isCertified: false
    }])).to.deep.equal([{
      multiaddr: addr1.bytes,
      isCertified: false
    }, {
      multiaddr: addr2.bytes,
      isCertified: false
    }])
  })

  it('should sort addresses', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: addr2,
      isCertified: false
    }, {
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr1,
      isCertified: false
    }])).to.deep.equal([{
      multiaddr: addr1.bytes,
      isCertified: false
    }, {
      multiaddr: addr2.bytes,
      isCertified: false
    }])
  })

  it('should retain isCertified when deduping addresses', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: addr1,
      isCertified: true
    }, {
      multiaddr: addr1,
      isCertified: false
    }])).to.deep.equal([{
      multiaddr: addr1.bytes,
      isCertified: true
    }])
  })

  it('should preserve target peer id in circuit relay addresses', async () => {
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const targetPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // Address that includes the target peer ID after /p2p-circuit (e.g. from pubsub-peer-discovery)
    const relayAddr = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/p2p/${targetPeerId}`)

    const result = await dedupeFilterAndSortAddresses(targetPeerId, async () => true, [{
      multiaddr: relayAddr,
      isCertified: false
    }])

    expect(result).to.have.length(1)
    // The trailing /p2p/TARGET_ID must not be stripped - it is needed for dialling via relay
    expect(multiaddr(result[0].multiaddr).toString()).to.equal(relayAddr.toString())
  })

  it('should preserve target peer id in WebRTC circuit relay addresses', async () => {
    const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const targetPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // WebRTC browser-to-browser relay address includes /webrtc before the target peer ID
    const webrtcRelayAddr = multiaddr(`/ip4/1.2.3.4/tcp/1234/p2p/${relayPeerId}/p2p-circuit/webrtc/p2p/${targetPeerId}`)

    const result = await dedupeFilterAndSortAddresses(targetPeerId, async () => true, [{
      multiaddr: webrtcRelayAddr,
      isCertified: false
    }])

    expect(result).to.have.length(1)
    expect(multiaddr(result[0].multiaddr).toString()).to.equal(webrtcRelayAddr.toString())
  })

  it('should strip peer id from direct addresses', async () => {
    const targetPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // Direct address with redundant peer ID appended (common from identify / pubsub-peer-discovery)
    const directAddrWithPeerId = multiaddr(`/ip4/1.2.3.4/tcp/4001/p2p/${targetPeerId}`)
    const directAddr = multiaddr('/ip4/1.2.3.4/tcp/4001')

    const result = await dedupeFilterAndSortAddresses(targetPeerId, async () => true, [{
      multiaddr: directAddrWithPeerId,
      isCertified: false
    }])

    expect(result).to.have.length(1)
    // Peer ID is stripped from direct addresses in storage (it is redundant - known from peer store key)
    expect(multiaddr(result[0].multiaddr).toString()).to.equal(directAddr.toString())
  })

  it('should filter addresses', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => false, [{
      multiaddr: addr1,
      isCertified: true
    }, {
      multiaddr: addr1,
      isCertified: false
    }])).to.deep.equal([])
  })
})
