/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { TestDHT } from './utils/test-dht.js'

const testCases: Array<[string, string, string]> = [
  ['should enable server mode when public IP4 addresses are found', '/ip4/139.178.91.71/udp/4001/quic', 'server'],
  ['should enable server mode when public IP6 addresses are found', '/ip6/2604:1380:45e3:6e00::1/udp/4001/quic', 'server'],
  ['should enable server mode when DNS4 addresses are found', '/dns4/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN', 'server'],
  ['should enable server mode when DNS6 addresses are found', '/dns6/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN', 'server'],
  ['should enable server mode when DNSADDR addresses are found', '/dnsaddr/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN', 'server'],
  ['should not enable server mode when private IP4 addresses are found', '/ip4/127.0.0.1/udp/4001/quic', 'client'],
  ['should not enable server mode when private IP6 addresses are found', '/ip6/::1/udp/4001/quic', 'client'],
  ['should not enable server mode when otherwise public circuit relay addresses are found', '/dns4/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit', 'client']
]

describe('enable server mode', () => {
  let tdht: TestDHT

  beforeEach(() => {
    tdht = new TestDHT()
  })

  afterEach(async () => {
    await tdht.teardown()
  })

  testCases.forEach(([name, addr, result]) => {
    it(name, async function () {
      const dht = await tdht.spawn()

      await expect(dht.getMode()).to.eventually.equal('client')

      dht.components.events.safeDispatchEvent('self:peer:update', {
        detail: {
          peer: {
            addresses: [{
              multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
              isCertified: true
            }, {
              multiaddr: multiaddr('/ip6/::1/tcp/4001'),
              isCertified: true
            }, {
              multiaddr: multiaddr(addr),
              isCertified: true
            }]
          }
        }
      })

      await delay(100)

      await expect(dht.getMode()).to.eventually.equal(result, `did not change to "${result}" mode after updating with address ${addr}`)

      dht.components.events.safeDispatchEvent('self:peer:update', {
        detail: {
          peer: {
            addresses: [{
              multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
              isCertified: true
            }]
          }
        }
      })

      await delay(100)

      await expect(dht.getMode()).to.eventually.equal('client', `did not reset to client mode after updating with address ${addr}`)
    })
  })
})
