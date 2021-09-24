'use strict'
/* eslint-env mocha */

const Transport = require('libp2p-websockets')
const { NOISE: Crypto } = require('@chainsafe/libp2p-noise')

const Libp2p = require('../../src')
const { createPeerId } = require('../utils/creators/peer')

describe('Consume peer record', () => {
  let libp2p

  beforeEach(async () => {
    const [peerId] = await createPeerId()
    const config = {
      peerId,
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    }
    libp2p = await Libp2p.create(config)
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should consume peer record when observed addrs are added', async () => {
    let done

    libp2p.peerStore.addressBook.consumePeerRecord = () => {
      done()
    }

    const p = new Promise(resolve => {
      done = resolve
    })

    libp2p.addressManager.addObservedAddr('/ip4/123.123.123.123/tcp/3983')

    await p

    libp2p.stop()
  })
})
