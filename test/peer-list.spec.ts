/* eslint-env mocha */

import type { PeerId } from '@libp2p/interface-peer-id'
import { expect } from 'aegir/chai'
import { PeerList } from '../src/peer-list/index.js'
import { createPeerIds } from './utils/create-peer-id.js'

describe('PeerList', () => {
  let peers: PeerId[]

  before(async () => {
    peers = await createPeerIds(3)
  })

  it('basics', () => {
    const l = new PeerList()

    expect(l.push(peers[0])).to.eql(true)
    expect(l.push(peers[0])).to.eql(false)
    expect(l).to.have.length(1)
    expect(l.push(peers[1])).to.eql(true)
    expect(l.pop()).to.eql(peers[1])
    expect(l).to.have.length(1)
    expect(l.toArray()).to.eql([peers[0]])
  })
})
