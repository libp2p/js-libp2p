/* eslint-env mocha */

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
