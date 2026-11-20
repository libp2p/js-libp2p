import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { dedupeFilterAndSortAddresses } from '../../src/utils/dedupe-addresses.ts'
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

  it('should upgrade isCertified when a certified duplicate follows an uncertified address', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr1,
      isCertified: true
    }])).to.deep.equal([{
      multiaddr: addr1.bytes,
      isCertified: true
    }])
  })

  it('should dedupe addresses with and without a trailing peer id', async () => {
    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr1.encapsulate(`/p2p/${peerId}`),
      isCertified: true
    }])).to.deep.equal([{
      multiaddr: addr1.bytes,
      isCertified: true
    }])
  })

  it('should strip a trailing peer id from a circuit address', async () => {
    const relay = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const circuit = multiaddr(`/ip4/20.0.0.1/tcp/8001/p2p/${relay}/p2p-circuit`)

    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: circuit.encapsulate(`/p2p/${peerId}`),
      isCertified: false
    }, {
      multiaddr: circuit,
      isCertified: false
    }])).to.deep.equal([{
      multiaddr: circuit.bytes,
      isCertified: false
    }])
  })

  it('should not strip a different trailing peer id', async () => {
    const other = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const withOther = addr1.encapsulate(`/p2p/${other}`)

    expect(await dedupeFilterAndSortAddresses(peerId, async () => true, [{
      multiaddr: withOther,
      isCertified: false
    }])).to.deep.equal([{
      multiaddr: withOther.bytes,
      isCertified: false
    }])
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
