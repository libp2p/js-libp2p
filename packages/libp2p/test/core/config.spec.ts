import { FaultTolerance } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { validateConfig } from '../../src/config.ts'
import type { Libp2pInit } from '../../src/index.ts'

describe('config validation', () => {
  it('should accept an empty config', async () => {
    await expect(validateConfig({})).to.eventually.deep.equal({})
  })

  it('should return the config it was given', async () => {
    const config: Libp2pInit = {
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0', '/p2p-circuit', '/webrtc']
      },
      connectionManager: {
        maxConnections: 10,
        dialTimeout: 5000
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      }
    }

    await expect(validateConfig(config)).to.eventually.equal(config)
  })

  it('should accept Infinity for numeric limits', async () => {
    await expect(validateConfig({
      connectionManager: {
        inboundConnectionThreshold: Infinity,
        maxIncomingPendingConnections: Infinity
      }
    })).to.eventually.be.ok()
  })

  it('should accept Multiaddr instances in address lists', async () => {
    await expect(validateConfig({
      addresses: {
        // @ts-expect-error the type asks for strings but instances work at runtime
        listen: [multiaddr('/ip4/127.0.0.1/tcp/0')]
      }
    })).to.eventually.be.ok()
  })

  it('should allow keys it does not know about', async () => {
    await expect(validateConfig({
      // @ts-expect-error not a known config key
      somethingElse: { enabled: 'yes' }
    })).to.eventually.be.ok()
  })

  it('should reject an invalid listen address and name the field', async () => {
    await expect(validateConfig({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0', 'not-a-multiaddr']
      }
    })).to.eventually.be.rejected().with.property('name', 'InvalidParametersError')

    await expect(validateConfig({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0', 'not-a-multiaddr']
      }
    })).to.eventually.be.rejectedWith('addresses.listen.1 is not a valid multiaddr: not-a-multiaddr')
  })

  it('should reject an address list that is not an array', async () => {
    await expect(validateConfig({
      addresses: {
        // @ts-expect-error should be an array
        announce: '/ip4/1.2.3.4/tcp/1234'
      }
    })).to.eventually.be.rejectedWith('addresses.announce')
  })

  it('should reject an invalid address in the connection manager deny list', async () => {
    await expect(validateConfig({
      connectionManager: {
        deny: ['/ip4/1.2.3.4', 'nope']
      }
    })).to.eventually.be.rejectedWith('connectionManager.deny.1 is not a valid multiaddr: nope')
  })

  it('should reject maxConnections that is not greater than 0', async () => {
    await expect(validateConfig({
      connectionManager: {
        maxConnections: 0
      }
    })).to.eventually.be.rejectedWith('connectionManager.maxConnections must be greater than 0')
  })

  it('should reject negative timeouts', async () => {
    await expect(validateConfig({
      connectionManager: {
        inboundUpgradeTimeout: -5
      }
    })).to.eventually.be.rejectedWith('connectionManager.inboundUpgradeTimeout must be greater than or equal to 0')
  })

  it('should reject numbers passed as strings', async () => {
    await expect(validateConfig({
      connectionManager: {
        // @ts-expect-error should be a number
        dialTimeout: '5000'
      }
    })).to.eventually.be.rejectedWith('connectionManager.dialTimeout')
  })

  it('should reject an unknown fault tolerance', async () => {
    await expect(validateConfig({
      transportManager: {
        // @ts-expect-error not a FaultTolerance value
        faultTolerance: 2
      }
    })).to.eventually.be.rejectedWith('transportManager.faultTolerance must be FaultTolerance.FATAL_ALL or FaultTolerance.NO_FATAL')
  })

  it('should reject a non-boolean connection monitor flag', async () => {
    await expect(validateConfig({
      connectionMonitor: {
        // @ts-expect-error should be a boolean
        enabled: 'yes'
      }
    })).to.eventually.be.rejectedWith('connectionMonitor.enabled')
  })
})
