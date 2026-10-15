import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.ts'
import type { Libp2p } from '@libp2p/interface'

describe('config validation', () => {
  let libp2p: Libp2p | undefined

  afterEach(async () => {
    await libp2p?.stop()
    libp2p = undefined
  })

  it('should accept a valid config', async () => {
    libp2p = await createLibp2p({
      start: false,
      nodeInfo: {
        name: 'test-node'
      },
      addresses: {
        // @ts-expect-error the type asks for strings but instances work at runtime
        listen: ['/ip4/127.0.0.1/tcp/0', multiaddr('/ip4/127.0.0.1/tcp/0/ws')],
        maxObservedAddresses: 5
      },
      services: {}
    })

    expect(libp2p).to.be.ok()
  })

  describe('Libp2p', () => {
    it('should reject transports that are not an array', async () => {
      await expect(createLibp2p({
        start: false,
        // @ts-expect-error should be an array of transport factories
        transports: () => {}
      })).to.eventually.be.rejectedWith('Invalid libp2p config: transports')
        .with.property('name', 'InvalidParametersError')
    })

    it('should reject a service that is not a factory function', async () => {
      await expect(createLibp2p({
        start: false,
        services: {
          // @ts-expect-error should be a factory function
          foo: { start: true }
        }
      })).to.eventually.be.rejectedWith('Invalid libp2p config: services.foo')
    })

    it('should reject a node name that is not a string', async () => {
      await expect(createLibp2p({
        start: false,
        nodeInfo: {
          // @ts-expect-error should be a string
          name: 5
        }
      })).to.eventually.be.rejectedWith('Invalid libp2p config: nodeInfo.name')
    })

    it('should reject a non-boolean connection monitor flag', async () => {
      await expect(createLibp2p({
        start: false,
        connectionMonitor: {
          // @ts-expect-error should be a boolean
          enabled: 'yes'
        }
      })).to.eventually.be.rejectedWith('Invalid libp2p config: connectionMonitor.enabled')
    })
  })

  describe('AddressManager', () => {
    it('should reject an invalid listen address and name the field', async () => {
      await expect(createLibp2p({
        start: false,
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0', 'not-a-multiaddr']
        }
      })).to.eventually.be.rejectedWith('Invalid addresses config: listen.1 is not a valid multiaddr: not-a-multiaddr')
        .with.property('name', 'InvalidParametersError')
    })

    it('should reject an address list that is not an array', async () => {
      await expect(createLibp2p({
        start: false,
        addresses: {
          // @ts-expect-error should be an array
          announce: '/ip4/1.2.3.4/tcp/1234'
        }
      })).to.eventually.be.rejectedWith('Invalid addresses config: announce')
    })

    it('should reject a negative maxObservedAddresses', async () => {
      await expect(createLibp2p({
        start: false,
        addresses: {
          maxObservedAddresses: -1
        }
      })).to.eventually.be.rejectedWith('Invalid addresses config: maxObservedAddresses must be greater than or equal to 0')
    })
  })
})
