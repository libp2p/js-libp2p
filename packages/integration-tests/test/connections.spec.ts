/* eslint-env mocha */

import { stop } from '@libp2p/interface'
import { dns } from '@multiformats/dns'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createPeers } from './fixtures/create-peers.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from '@libp2p/interface'

describe('connections', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('libp2p.getConnections gets the conns', async () => {
    ({ dialer, listener } = await createPeers())

    const conn = await dialer.dial(listener.getMultiaddrs())

    expect(conn).to.be.ok()
    expect(dialer.getConnections()).to.have.lengthOf(1)
  })

  it('should open multiple connections when forced', async () => {
    ({ dialer, listener } = await createPeers())

    // connect once, should have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // connect twice, should still only have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // force connection, should have two connections now
    await dialer.dial(listener.getMultiaddrs(), {
      force: true
    })
    expect(dialer.getConnections()).to.have.lengthOf(2)
  })

  it('should use custom DNS resolver', async () => {
    const resolver = sinon.stub()

    ;({ dialer, listener } = await createPeers({
      dns: dns({
        resolvers: {
          '.': resolver
        }
      })
    }))

    const ma = multiaddr('/dnsaddr/example.com/tcp/12345')
    const err = new Error('Could not resolve')

    resolver.withArgs('_dnsaddr.example.com').rejects(err)

    await expect(dialer.dial(ma)).to.eventually.be.rejectedWith(err)
  })

  it('should fail to dial if resolve fails and there are no addresses to dial', async () => {
    const resolver = sinon.stub()

    ;({ dialer, listener } = await createPeers({
      dns: dns({
        resolvers: {
          '.': resolver
        }
      })
    }))

    const ma = multiaddr('/dnsaddr/example.com/tcp/12345')

    resolver.withArgs('_dnsaddr.example.com').resolves({
      Answer: []
    })

    await expect(dialer.dial(ma)).to.eventually.be.rejected
      .with.property('name', 'NoValidAddressesError')
  })
})
