/* eslint-env mocha */

import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createPeers } from '../fixtures/create-peers.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from '@libp2p/interface'

describe('connection-gater', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('intercept peer dial', async () => {
    const denyDialPeer = sinon.stub().returns(true)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        denyDialPeer
      }
    }))

    await expect(dialer.dial(listener.getMultiaddrs()))
      .to.eventually.be.rejected().with.property('name', 'DialDeniedError')
  })

  it('intercept addr dial', async () => {
    const denyDialMultiaddr = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        denyDialMultiaddr
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    for (const multiaddr of listener.getMultiaddrs()) {
      expect(denyDialMultiaddr.calledWith(multiaddr)).to.be.true()
    }
  })

  it('intercept multiaddr store', async () => {
    const filterMultiaddrForPeer = sinon.stub().returns(true)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        filterMultiaddrForPeer
      }
    }))

    const fullMultiaddr = listener.getMultiaddrs()[0]

    await dialer.peerStore.merge(listener.peerId, {
      multiaddrs: [fullMultiaddr]
    })

    expect(filterMultiaddrForPeer.callCount).to.equal(1)

    const args = filterMultiaddrForPeer.getCall(0).args
    expect(args[0].toString()).to.equal(listener.peerId.toString())
    expect(args[1].toString()).to.equal(fullMultiaddr.toString())
  })

  it('intercept accept inbound connection', async () => {
    const denyInboundConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({}, {
      connectionGater: {
        denyInboundConnection
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    expect(denyInboundConnection.called).to.be.true()
  })

  it('intercept accept outbound connection', async () => {
    const denyOutboundConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        denyOutboundConnection
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    expect(denyOutboundConnection.called).to.be.true()
  })

  it('intercept inbound encrypted', async () => {
    const denyInboundEncryptedConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({}, {
      connectionGater: {
        denyInboundEncryptedConnection
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    expect(denyInboundEncryptedConnection.called).to.be.true()
    expect(denyInboundEncryptedConnection.getCall(0).args[0].toMultihash().bytes).to.equalBytes(dialer.peerId.toMultihash().bytes)
  })

  it('intercept outbound encrypted', async () => {
    const denyOutboundEncryptedConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        denyOutboundEncryptedConnection
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    expect(denyOutboundEncryptedConnection.called).to.be.true()
    expect(denyOutboundEncryptedConnection.getCall(0).args[0].toMultihash().bytes).to.equalBytes(listener.peerId.toMultihash().bytes)
  })

  it('intercept inbound upgraded', async () => {
    const denyInboundUpgradedConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({}, {
      connectionGater: {
        denyInboundUpgradedConnection
      }
    }))

    const input = Uint8Array.from([0])
    const output = await dialer.services.echo.echo(listener.getMultiaddrs(), input)
    expect(output).to.equalBytes(input)

    expect(denyInboundUpgradedConnection.called).to.be.true()
    expect(denyInboundUpgradedConnection.getCall(0).args[0].toMultihash().bytes).to.equalBytes(dialer.peerId.toMultihash().bytes)
  })

  it('intercept outbound upgraded', async () => {
    const denyOutboundUpgradedConnection = sinon.stub().returns(false)

    ;({ dialer, listener } = await createPeers({
      connectionGater: {
        denyOutboundUpgradedConnection
      }
    }))

    const input = Uint8Array.from([0])
    const output = await dialer.services.echo.echo(listener.getMultiaddrs(), input)
    expect(output).to.equalBytes(input)

    expect(denyOutboundUpgradedConnection.called).to.be.true()
    expect(denyOutboundUpgradedConnection.getCall(0).args[0].toMultihash().bytes).to.equalBytes(listener.peerId.toMultihash().bytes)
  })
})
