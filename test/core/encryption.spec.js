'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const Transport = require('libp2p-websockets')
const { NOISE: Crypto } = require('libp2p-noise')

const Libp2p = require('../../src')
const { codes: ErrorCodes } = require('../../src/errors')
const { createPeerId } = require('../utils/creators/peer')

describe('Connection encryption configuration', () => {
  let peerId

  before(async () => {
    [peerId] = await createPeerId()
  })

  it('is required', async () => {
    const config = {
      peerId,
      modules: {
        transport: [Transport]
      }
    }

    await expect(Libp2p.create(config)).to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.CONN_ENCRYPTION_REQUIRED)
  })

  it('is required and needs at least one module', async () => {
    const config = {
      peerId,
      modules: {
        transport: [Transport],
        connEncryption: []
      }
    }
    await expect(Libp2p.create(config)).to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.CONN_ENCRYPTION_REQUIRED)
  })

  it('can be created', async () => {
    const config = {
      peerId,
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    }
    await Libp2p.create(config)
  })
})
