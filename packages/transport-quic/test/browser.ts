import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { isBrowser, isWebWorker } from 'wherearewe'
import { quic } from '../src/index.ts'

describe('browser non-support', () => {
  it('should throw in browsers', function () {
    if (!isBrowser && !isWebWorker) {
      return this.skip()
    }

    expect(async () => {
      const privateKey = await generateKeyPair('Ed25519')

      quic()({
        privateKey,
        logger: defaultLogger()
      })
    }).to.throw()
  })
})
