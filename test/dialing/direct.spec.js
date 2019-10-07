'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const Dialer = require('../../src/dialer')
const TransportManager = require('../../src/transport-manager')
const Transport = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const mockUpgrader = require('../utils/mockUpgrader')
const { codes: ErrorCodes } = require('../../src/errors')
const Peers = require('../fixtures/peers')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws')

describe('Dialing (direct, WebSockets)', () => {
  let localTM
  const remoteAddr = MULTIADDRS_WEBSOCKETS[0]

  before(() => {
    localTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
    localTM.add(Transport.prototype[Symbol.toStringTag], Transport)
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    const connection = await dialer.connectToMultiaddr(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to a remote node via its stringified multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    const connection = await dialer.connectToMultiaddr(remoteAddr.toString())
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    try {
      await dialer.connectToMultiaddr(unsupportedAddr)
    } catch (err) {
      expect(err).to.satisfy((err) => err.code === ErrorCodes.ERR_TRANSPORT_DIAL_FAILED)
      return
    }

    expect.fail('Dial should have failed')
  })

  it('should be able to connect to a given peer', async () => {
    const dialer = new Dialer({ transportManager: localTM })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(remoteAddr)

    const connection = await dialer.connectToPeer(peerInfo)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer({ transportManager: localTM })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(unsupportedAddr)

    try {
      await dialer.connectToPeer(peerInfo)
    } catch (err) {
      expect(err).to.satisfy((err) => err.code === ErrorCodes.ERR_CONNECTION_FAILED)
      return
    }

    expect.fail('Dial should have failed')
  })
})
