import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { isBrowser, isWebWorker } from 'wherearewe'
import { tcp } from '../src/index.js'

describe('browser non-support', () => {
  it('should throw in browsers', function () {
    if (!isBrowser && !isWebWorker) {
      return this.skip()
    }

    expect(() => {
      tcp()({
        logger: defaultLogger()
      })
    }).to.throw()
  })
})
