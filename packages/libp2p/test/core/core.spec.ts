/* eslint-env mocha */

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

describe.only('core', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should start a minimal node', async () => {
    libp2p = await createLibp2p()

    expect(libp2p).to.have.property('status', 'started')
  })

  it('should say an address is not dialable if we have no transport for it', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ]
    })

    const ma = multiaddr('/dns4/example.com/sctp/1234')

    await expect(libp2p.isDialable(ma)).to.eventually.be.false()
  })

  it('should say an address is dialable if a transport is configured', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ]
    })

    const ma = multiaddr('/dns4/example.com/tls/ws')

    await expect(libp2p.isDialable(ma)).to.eventually.be.true()
  })

  it('should test if a protocol can run over a transient connection', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets(),
        circuitRelayTransport()
      ]
    })

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws'), {
      runOnTransientConnection: true
    })).to.eventually.be.true()

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1/p2p-circuit/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), {
      runOnTransientConnection: true
    })).to.eventually.be.true()

    await expect(libp2p.isDialable(multiaddr('/dns4/example.com/tls/ws/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE1/p2p-circuit/p2p/12D3KooWSExt8hTzoaHEhn435BTK6BPNSY1LpTc1j2o9Gw53tXE2'), {
      runOnTransientConnection: false
    })).to.eventually.be.false()
  })
})
