'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const AutoDialler = require('../../src/connection-manager/auto-dialler')
const pWaitFor = require('p-wait-for')
const PeerId = require('peer-id')
const delay = require('delay')

describe('Auto-dialler', () => {
  let autoDialler
  let libp2p
  let options

  beforeEach(async () => {
    libp2p = {}
    options = {}
    autoDialler = new AutoDialler(libp2p, options)
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should not dial self', async () => {
    // peers with protocols are dialled before peers without protocols
    const self = {
      id: await PeerId.create(),
      protocols: [
        '/foo/bar'
      ]
    }
    const other = {
      id: await PeerId.create(),
      protocols: []
    }

    autoDialler._options.minConnections = 10
    libp2p.peerId = self.id
    libp2p.connections = {
      size: 1
    }
    libp2p.peerStore = {
      getPeers: sinon.stub().returns([self, other])
    }
    libp2p.connectionManager = {
      get: () => {}
    }
    libp2p.dialer = {
      connectToPeer: sinon.stub().resolves()
    }

    await autoDialler.start()

    await pWaitFor(() => libp2p.dialer.connectToPeer.callCount === 1)
    await delay(1000)

    await autoDialler.stop()

    expect(libp2p.dialer.connectToPeer.callCount).to.equal(1)
    expect(libp2p.dialer.connectToPeer.calledWith(self.id)).to.be.false()
  })
})
