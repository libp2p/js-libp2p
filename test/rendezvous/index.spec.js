'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const pWaitFor = require('p-wait-for')

const multiaddr = require('multiaddr')
const { Message } = require('libp2p-rendezvous/src/proto')
const RESPONSE_STATUS = Message.ResponseStatus

const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')
const { codes: errCodes } = require('../../src/rendezvous/errors')

const {
  getSubsystemOptions,
  createRendezvousServer,
  createSignedPeerRecord
} = require('./utils')

const {
  createPeer
} = require('../utils/creators/peer')

const namespace = 'ns'

describe('rendezvous', () => {
  describe('no rendezvous server', () => {
    let clients

    // Create and start Libp2p nodes
    beforeEach(async () => {
      clients = await createPeer({ number: 2, config: getSubsystemOptions([]) })
    })

    afterEach(async () => {
      await Promise.all(clients.map((c) => c.stop()))
    })

    it('register throws error if no rendezvous servers', async () => {
      await expect(clients[0].rendezvous.register(namespace))
        .to.eventually.rejected()
        .and.have.property('code', errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
    })

    it('unregister throws error if no rendezvous servers', async () => {
      await expect(clients[0].rendezvous.unregister(namespace))
        .to.eventually.rejected()
        .and.have.property('code', errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
    })

    it('discover throws error if no rendezvous servers', async () => {
      try {
        for await (const _ of clients[0].rendezvous.discover()) { } // eslint-disable-line
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql(errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
        return
      }
      throw new Error('discover should throw error if no rendezvous servers')
    })
  })

  describe('one rendezvous server', () => {
    let rendezvousServer
    let clients

    // Create and start Libp2p
    beforeEach(async function () {
      this.timeout(10e3)

      // Create Rendezvous Server
      rendezvousServer = await createRendezvousServer()
      await pWaitFor(() => rendezvousServer.multiaddrs.length > 0)
      const rendezvousServerMultiaddr = `${rendezvousServer.multiaddrs[0]}/p2p/${rendezvousServer.peerId.toB58String()}`

      clients = await createPeer({ number: 2, config: getSubsystemOptions([rendezvousServerMultiaddr]) })
    })

    afterEach(async function () {
      this.timeout(10e3)
      sinon.restore()
      await rendezvousServer.rendezvousDatastore.reset()
      await rendezvousServer.stop()

      await Promise.all(clients.map((c) => c.stop()))
    })

    it('register throws error if a namespace is not provided', async () => {
      await expect(clients[0].rendezvous.register())
        .to.eventually.rejected()
        .and.have.property('code', errCodes.INVALID_NAMESPACE)
    })

    it('register throws an error with an invalid namespace', async () => {
      const badNamespace = 'x'.repeat(300)

      await expect(clients[0].rendezvous.register(badNamespace))
        .to.eventually.rejected()
        .and.have.property('code', RESPONSE_STATUS.E_INVALID_NAMESPACE)

      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })

    it('register throws an error with an invalid ttl', async () => {
      const badTtl = 5e10

      await expect(clients[0].rendezvous.register(namespace, { ttl: badTtl }))
        .to.eventually.rejected()
        .and.have.property('code', RESPONSE_STATUS.E_INVALID_TTL)

      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })

    it('register throws an error with an invalid peerId', async () => {
      const badSignedPeerRecord = await createSignedPeerRecord(clients[1].peerId, [multiaddr('/ip4/127.0.0.1/tcp/100')])

      const stub = sinon.stub(clients[0].peerStore.addressBook, 'getRawEnvelope')
      stub.onCall(0).returns(badSignedPeerRecord.marshal())

      await expect(clients[0].rendezvous.register(namespace))
        .to.eventually.rejected()
        .and.have.property('code', RESPONSE_STATUS.E_NOT_AUTHORIZED)

      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })

    it('registers with an available rendezvous server node', async () => {
      const registers = []

      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }

      await clients[0].rendezvous.register(namespace)

      // Peer2 discovers Peer0 registered in Peer1
      for await (const reg of clients[1].rendezvous.discover(namespace)) {
        registers.push(reg)
      }

      expect(registers).to.have.lengthOf(1)
      expect(registers[0].ns).to.eql(namespace)
    })

    it('unregister throws if a namespace is not provided', async () => {
      await expect(clients[0].rendezvous.unregister())
        .to.eventually.rejected()
        .and.have.property('code', errCodes.INVALID_NAMESPACE)
    })

    it('unregisters with an available rendezvous server node', async () => {
      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }

      // Register
      await clients[0].rendezvous.register(namespace)

      // Unregister
      await clients[0].rendezvous.unregister(namespace)

      // other client does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })

    it('unregister not fails if not registered', async () => {
      await clients[0].rendezvous.unregister(namespace)
    })

    it('discover throws error if a namespace is invalid', async () => {
      const badNamespace = 'x'.repeat(300)

      try {
        for await (const _ of clients[0].rendezvous.discover(badNamespace)) { } // eslint-disable-line
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql(RESPONSE_STATUS.E_INVALID_NAMESPACE)
        return
      }

      throw new Error('discover should throw error if a namespace is not provided')
    })

    it('discover does not find any register if there is none', async () => {
      for await (const reg of clients[0].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })

    it('discover finds registered peer for namespace', async () => {
      const registers = []

      // Peer2 does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }

      // Peer0 register itself on namespace (connected to Peer1)
      await clients[0].rendezvous.register(namespace)

      // Peer2 discovers Peer0 registered in Peer1
      for await (const reg of clients[1].rendezvous.discover(namespace)) {
        registers.push(reg)
      }

      expect(registers).to.have.lengthOf(1)
      expect(registers[0].signedPeerRecord).to.exist()
      expect(registers[0].ns).to.eql(namespace)
      expect(registers[0].ttl).to.exist()

      // Validate envelope
      const envelope = await Envelope.openAndCertify(registers[0].signedPeerRecord, PeerRecord.DOMAIN)
      const rec = PeerRecord.createFromProtobuf(envelope.payload)

      expect(rec.multiaddrs).to.eql(clients[0].multiaddrs)
    })

    it('discover finds registered peer for namespace once (cookie)', async () => {
      const registers = []

      // Peer2 does not discovery any peer registered
      for await (const _ of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }

      // Peer0 register itself on namespace (connected to Peer1)
      await clients[0].rendezvous.register(namespace)

      // Peer2 discovers Peer0 registered in Peer1
      for await (const reg of clients[1].rendezvous.discover(namespace)) {
        registers.push(reg)
      }

      expect(registers).to.have.lengthOf(1)
      expect(registers[0].signedPeerRecord).to.exist()
      expect(registers[0].ns).to.eql(namespace)
      expect(registers[0].ttl).to.exist()

      for await (const reg of clients[1].rendezvous.discover(namespace)) {
        registers.push(reg)
      }

      expect(registers).to.have.lengthOf(1)
    })
  })

  describe('multiple rendezvous servers available', () => {
    let rendezvousServers = []
    let clients

    // Create and start Libp2p
    beforeEach(async function () {
      this.timeout(10e3)

      // Create Rendezvous Server
      rendezvousServers = await Promise.all([
        createRendezvousServer(),
        createRendezvousServer()
      ])
      await pWaitFor(() => rendezvousServers[0].multiaddrs.length > 0 && rendezvousServers[1].multiaddrs.length > 0)
      const rendezvousServerMultiaddrs = rendezvousServers.map((rendezvousServer) => `${rendezvousServer.multiaddrs[0]}/p2p/${rendezvousServer.peerId.toB58String()}`)

      clients = await createPeer({ number: 2, config: getSubsystemOptions(rendezvousServerMultiaddrs) })
    })

    afterEach(async function () {
      this.timeout(10e3)
      await Promise.all(rendezvousServers.map((s) => s.rendezvousDatastore.reset()))
      await Promise.all(rendezvousServers.map((s) => s.stop()))

      await Promise.all(clients.map((c) => c.stop()))
    })

    it('discover find registered peer for namespace only when registered ', async () => {
      const registers = []

      // Client 1 does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }

      // Client 0 register itself on namespace (connected to Peer1)
      await clients[0].rendezvous.register(namespace)

      // Client1 discovers Client0
      for await (const reg of clients[1].rendezvous.discover(namespace)) {
        registers.push(reg)
      }

      expect(registers[0].signedPeerRecord).to.exist()
      expect(registers[0].ns).to.eql(namespace)
      expect(registers[0].ttl).to.exist()

      // Client0 unregister itself on namespace
      await clients[0].rendezvous.unregister(namespace)

      // Peer2 does not discovery any peer registered
      for await (const reg of clients[1].rendezvous.discover(namespace)) { // eslint-disable-line
        throw new Error('no registers should exist')
      }
    })
  })
})
