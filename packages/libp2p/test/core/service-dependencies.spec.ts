import { serviceCapabilities, serviceDependencies, stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

/**
 * A service with no dependencies
 */
function serviceA () {
  return () => {
    return {
      [serviceCapabilities]: [
        '@libp2p/service-a'
      ]
    }
  }
}

/**
 * A service with a dependency on service A
 */
function serviceB () {
  return () => {
    return {
      [Symbol.toStringTag]: 'service-b',
      [serviceDependencies]: [
        '@libp2p/service-a'
      ]
    }
  }
}

describe('service dependencies', () => {
  let node: Libp2p

  afterEach(async () => {
    await stop(node)
  })

  it('should start when services have no dependencies', async () => {
    node = await createLibp2p({
      services: {
        a: serviceA()
      }
    })

    expect(node).to.be.ok()
  })

  it('should error when service dependencies are unmet', async () => {
    await expect(createLibp2p({
      services: {
        b: serviceB()
      }
    })).to.eventually.be.rejected
      .with.property('code', 'ERR_UNMET_SERVICE_DEPENDENCIES')
  })

  it('should not error when service dependencies are met', async () => {
    node = await createLibp2p({
      services: {
        a: serviceA(),
        b: serviceB()
      }
    })

    expect(node).to.be.ok()
  })
})
