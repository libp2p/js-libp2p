/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { dedupeFilterAndSortAddresses } from '../../src/utils/dedupe-addresses.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { PeerId } from '@libp2p/interface-peer-id'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')

describe('dedupe-addresses', () => {
  let peerId: PeerId

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
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
