'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const peerUtils = require('../utils/creators/peer')

describe('libp2p.keychain', () => {
  it('needs a passphrase to be used, otherwise throws an error', async () => {
    const [libp2p] = await peerUtils.createPeer({
      started: false
    })

    try {
      await libp2p.keychain.createKey('keyName', 'rsa', 2048)
    } catch (err) {
      expect(err).to.exist()
      return
    }
    throw new Error('should throw an error using the keychain if no passphrase provided')
  })

  it('can be used if a passphrase is provided', async () => {
    const [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        keychain: {
          pass: '12345678901234567890'
        }
      }
    })

    const kInfo = await libp2p.keychain.createKey('keyName', 'rsa', 2048)
    expect(kInfo).to.exist()
  })
})
