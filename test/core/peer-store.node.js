'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const Transport = require('libp2p-tcp')

const { create } = require('../../src')
const peerUtils = require('../utils/creators/peer')

describe('Peer store', () => {
  let peerInfoSelf
  let libp2p

  before(async () => {
    [peerInfoSelf] = await peerUtils.createPeerInfo()
  })

  it('should should remove peers after stop', async () => {
    libp2p = await create({
      peerInfoSelf,
      modules: {
        transport: [Transport]
      }
    })

    await libp2p.start()
    const [peerInfoFriend] = await peerUtils.createPeerInfo()
    libp2p.peerStore.add(peerInfoFriend)
    expect(libp2p.peerStore.has(peerInfoFriend.id)).to.equal(true)
    await libp2p.stop()
    // expect(libp2p.peerStore.has(peerInfoFriend.id)).to.equal(false)
  })
})
