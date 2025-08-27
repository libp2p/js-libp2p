/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { yamux } from '@chainsafe/libp2p-yamux'
import { RELAY_V2_HOP_CODEC, circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { PeerSet } from '@libp2p/peer-collections'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { echo } from '@libp2p/utils'
import { Circuit } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import pRetry from 'p-retry'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { Uint8ArrayList } from 'uint8arraylist'
import { discoveredRelayConfig, doesNotHaveRelay, getRelayAddress, hasRelay, notUsingAsRelay, usingAsRelay } from './fixtures/utils.js'
import type { CircuitRelayService } from '@libp2p/circuit-relay-v2'
import type { Libp2p } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { Libp2pOptions } from 'libp2p'

const DEFAULT_DATA_LIMIT = BigInt(1 << 17)

async function createClient (options: Libp2pOptions = {}): Promise<Libp2p> {
  return createLibp2p({
    addresses: {
      listen: [
        '/p2p-circuit'
      ]
    },
    transports: [
      tcp(),
      circuitRelayTransport()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    services: {
      identify: identify()
    },
    connectionMonitor: {
      enabled: false
    },
    ...options
  })
}

async function createRelay (options: Libp2pOptions = {}): Promise<Libp2p<{ relay: CircuitRelayService }>> {
  return createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0']
    },
    transports: [
      tcp(),
      circuitRelayTransport()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    connectionMonitor: {
      enabled: false
    },
    ...options,
    services: {
      relay: circuitRelayServer(),
      identify: identify(),
      ...(options.services ?? {})
    }
  })
}

interface EchoServiceComponents {
  registrar: Registrar
}

const ECHO_PROTOCOL = '/test/echo/1.0.0'
const echoService = (components: EchoServiceComponents): unknown => {
  return {
    async start () {
      await components.registrar.handle(ECHO_PROTOCOL, (stream) => {
        return echo(stream)
      }, {
        runOnLimitedConnection: true
      })
    },
    stop () {}
  }
}

describe('circuit-relay', () => {
  describe('flows with 1 client', () => {
    let local: Libp2p
    let relay1: Libp2p<{ relay: CircuitRelayService }>
    let relay2: Libp2p<{ relay: CircuitRelayService }>
    let relay3: Libp2p<{ relay: CircuitRelayService }>

    beforeEach(async () => {
      // create 1 node and 3 relays
      [local, relay1, relay2, relay3] = await Promise.all([
        createClient(),
        createRelay(),
        createRelay(),
        createRelay()
      ])
    })

    afterEach(async () => {
      // Stop each node
      await Promise.all([local, relay1, relay2, relay3].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should ask if node supports hop on protocol change (relay protocol) and add to listen multiaddrs', async () => {
      // discover relay
      await local.dial(relay1.getMultiaddrs()[0])
      await discoveredRelayConfig(local, relay1)

      // wait for peer added as listen relay
      await usingAsRelay(local, relay1)

      // peer has relay multicodec
      const peer = await local.peerStore.get(relay1.peerId)
      expect(peer.protocols).to.include(RELAY_V2_HOP_CODEC)
    })

    it('should only add discovered relays relayed addresses', async () => {
      // discover all relays and connect
      await Promise.all([relay1, relay2, relay3].map(async relay => {
        await local.dial(relay.getMultiaddrs()[0])
        await discoveredRelayConfig(local, relay)
      }))

      const relayPeerId = await hasRelay(local)

      // find the relay we aren't using
      const nonRelays = [relay1, relay2, relay3].filter(node => !node.peerId.equals(relayPeerId))

      // should not be listening on two of them
      expect(nonRelays).to.have.lengthOf(2)

      await Promise.all(
        nonRelays.map(async nonRelay => {
          // wait to guarantee the dialed peer is not added as a listen relay
          await expect(usingAsRelay(local, nonRelay, {
            timeout: 1000
          })).to.eventually.be.rejected()
        })
      )
    })

    it('should not listen on a relayed address after we disconnect from peer', async () => {
      // discover one relay and connect
      await local.dial(relay1.getMultiaddrs()[0])
      await discoveredRelayConfig(local, relay1)

      // wait for listening on the relay
      await usingAsRelay(local, relay1)

      // disconnect from peer used for relay
      await local.hangUp(relay1.peerId)

      // stop the relay so we don't reconnect to it
      await relay1.stop()

      // wait for removed listening on the relay
      await expect(notUsingAsRelay(local, relay1, {
        timeout: 1000
      })).to.eventually.be.undefined('local node did not remove relay address after relay stopped')
    })

    it('should try to listen on other connected peers relayed address if one used relay disconnects', async () => {
      // connect to all relays
      await Promise.all([relay1, relay2, relay3].map(async relay => {
        await local.dial(relay.getMultiaddrs()[0])
      }))

      // discover one relay and connect
      const relayPeerId = await hasRelay(local)

      // shut down the connected relay
      const relay = [local, relay1, relay2, relay3].find(node => node.peerId.equals(relayPeerId))

      if (relay == null) {
        throw new Error('could not find relay')
      }

      await relay.stop()
      await pWaitFor(() => local.getConnections(relay.peerId).length === 0)

      // should not be using the relay any more
      await expect(usingAsRelay(local, relay, {
        timeout: 1000
      })).to.eventually.be.rejected()

      // should connect to another available relay
      const newRelayPeerId = await hasRelay(local)
      expect(newRelayPeerId.toString()).to.not.equal(relayPeerId.toString())
    })

    it('should try to listen on stored peers relayed address if one used relay disconnects and there are not enough connected', async () => {
      // discover one relay and connect
      await local.dial(relay1.getMultiaddrs()[0])

      // wait for peer to be used as a relay
      await usingAsRelay(local, relay1)

      // discover an extra relay and connect to gather its Hop support
      await local.dial(relay2.getMultiaddrs()[0])

      // wait for identify for newly dialed peer
      await discoveredRelayConfig(local, relay2)

      // disconnect not used listen relay
      await local.hangUp(relay2.peerId)

      // shut down connected relay
      await relay1.stop()
      await pWaitFor(() => local.getConnections(relay1.peerId).length === 0)

      // should have retrieved other relay details from peer store and connected to it
      await usingAsRelay(local, relay2)
    })

    it('should not fail when trying to dial unreachable peers to add as hop relay and replaced removed ones', async () => {
      const deferred = Promise.withResolvers<void>()

      // discover one relay and connect
      await local.dial(relay1.getMultiaddrs()[0])

      // wait for peer to be used as a relay
      await usingAsRelay(local, relay1)

      // discover an extra relay and connect to gather its Hop support
      await local.dial(relay2.getMultiaddrs()[0])

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(local, relay2)

      // stub dial, make sure we can't reconnect
      // @ts-expect-error private field
      sinon.stub(local.components.connectionManager, 'openConnection').callsFake(async () => {
        deferred.resolve()
        return Promise.reject(new Error('failed to dial'))
      })

      await Promise.all([
        // disconnect not used listen relay
        local.hangUp(relay2.peerId),

        // disconnect from relay
        local.hangUp(relay1.peerId)
      ])

      expect(local.getConnections()).to.be.empty()

      // wait for failed dial
      await deferred.promise
    })

    it('should announce new addresses when using a peer as a relay', async () => {
      // should not have have a circuit address to start with
      expect(local.getMultiaddrs().find(ma => Circuit.matches(ma))).to.be.undefined()

      // set up listener for address change
      const deferred = Promise.withResolvers<void>()

      local.addEventListener('self:peer:update', ({ detail }) => {
        const hasCircuitRelayAddress = detail.peer.addresses
          .map(({ multiaddr }) => multiaddr)
          .find(ma => Circuit.matches(ma)) != null

        if (hasCircuitRelayAddress) {
          deferred.resolve()
        }
      })

      // discover relay
      await local.dial(relay1.getMultiaddrs()[0])
      await discoveredRelayConfig(local, relay1)

      // wait for peer added as listen relay
      await usingAsRelay(local, relay1)

      // should have emitted a change:multiaddrs event with a circuit address
      await deferred.promise
    })

    it('should announce new addresses when using no longer using peer as a relay', async () => {
      // should not have have a circuit address to start with
      expect(local.getMultiaddrs().find(ma => Circuit.matches(ma))).to.be.undefined()

      // discover relay
      await local.dial(relay1.getMultiaddrs()[0])
      await discoveredRelayConfig(local, relay1)

      // wait for peer added as listen relay
      await usingAsRelay(local, relay1)

      // shut down the relay
      await relay1.stop()

      // should no longer have a circuit address
      await doesNotHaveRelay(local)
    })
  })

  describe('flows with 2 clients', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay1: Libp2p<{ relay: CircuitRelayService }>
    let relay2: Libp2p<{ relay: CircuitRelayService }>
    let relay3: Libp2p<{ relay: CircuitRelayService }>

    beforeEach(async () => {
      [local, remote, relay1, relay2, relay3] = await Promise.all([
        createClient({
          addresses: {
            listen: [
              '/p2p-circuit',
              '/p2p-circuit',
              '/p2p-circuit'
            ]
          }
        }),
        createClient(),
        createRelay({
          addresses: {
            listen: [
              '/ip4/127.0.0.1/tcp/0',
              '/p2p-circuit'
            ]
          }
        }),
        createRelay({
          addresses: {
            listen: [
              '/ip4/127.0.0.1/tcp/0',
              '/p2p-circuit'
            ]
          }
        }),
        createRelay()
      ])
    })

    afterEach(async () => {
      // Stop each node
      return Promise.all([local, remote, relay1, relay2, relay3].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should not add listener to a already relayed connection', async () => {
      // Relay 1 discovers Relay 3 and connect
      await relay1.dial(relay3.getMultiaddrs())
      await usingAsRelay(relay1, relay3)

      // Relay 2 discovers Relay 3 and connect
      await relay2.dial(relay3.getMultiaddrs())
      await usingAsRelay(relay2, relay3)

      // Relay 1 discovers Relay 2 relayed multiaddr via Relay 3
      const ma2RelayedBy3 = relay2.getMultiaddrs()[relay2.getMultiaddrs().length - 1]
      await relay1.peerStore.merge(relay2.peerId, {
        multiaddrs: [ma2RelayedBy3]
      })
      await relay1.dial(relay2.peerId)

      // Peer not added as listen relay
      await expect(usingAsRelay(relay1, relay2, {
        timeout: 1000
      })).to.eventually.be.rejected()
    })

    it('should be able to dial a peer from its relayed address previously added', async () => {
      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      await local.dial(ma)
    })

    it('should be able to dial a peer from its relayed address without peer id', async () => {
      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // get the relayed multiaddr without the remote's peer id
      const ma = getRelayAddress(remote)
      const maWithoutPeerId = multiaddr(`${ma.toString().split('/p2p-circuit')[0]}/p2p-circuit`)
      expect(maWithoutPeerId.getPeerId()).to.not.equal(remote.peerId.toString())

      // ensure this is the only address we have for the peer
      await local.peerStore.patch(remote.peerId, {
        multiaddrs: [
          maWithoutPeerId
        ]
      })

      // dial via peer id so we load the address from the address book
      await local.dial(remote.peerId)
    })

    it('dialer should stay connected to an already connected relay on hop failure', async () => {
      await local.dial(relay1.getMultiaddrs()[0])

      // dial the remote through the relay
      const relayedMultiaddr = relay1.getMultiaddrs()[0].encapsulate(`/p2p-circuit/p2p/${remote.peerId.toString()}`)

      await expect(local.dial(relayedMultiaddr))
        .to.eventually.be.rejected()
        .and.to.have.property('message').that.matches(/NO_RESERVATION/)

      // we should still be connected to the relay
      const conns = local.getConnections(relay1.peerId)
      expect(conns).to.have.lengthOf(1)
      expect(conns).to.have.nested.property('[0].status', 'open')
    })

    it('dialer should close hop stream on hop failure', async () => {
      await local.dial(relay1.getMultiaddrs()[0])

      // dial the remote through the relay
      const relayedMultiaddr = relay1.getMultiaddrs()[0].encapsulate(`/p2p-circuit/p2p/${remote.peerId.toString()}`)

      await expect(local.dial(relayedMultiaddr))
        .to.eventually.be.rejected()
        .and.to.have.property('message').that.matches(/NO_RESERVATION/)

      // we should still be connected to the relay
      const conns = local.getConnections(relay1.peerId)
      expect(conns).to.have.lengthOf(1)
      expect(conns).to.have.nested.property('[0].status', 'open')

      await pRetry(() => {
        // we should not have any streams with the hop codec
        const streams = local.getConnections(relay1.peerId)
          .map(conn => conn.streams)
          .flat()
          .filter(stream => stream.protocol === RELAY_V2_HOP_CODEC)

        expect(streams).to.be.empty()
      })
    })

    it('destination peer should stay connected to an already connected relay on hop failure', async () => {
      await local.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(local, relay1)

      const conns = relay1.getConnections(local.peerId)
      expect(conns).to.have.lengthOf(1)

      // this should fail as the local peer has HOP disabled
      await expect(conns[0].newStream([RELAY_V2_HOP_CODEC, '/other/1.0.0']))
        .to.be.rejected()

      // we should still be connected to the relay
      const remoteConns = local.getConnections(relay1.peerId)
      expect(remoteConns).to.have.lengthOf(1)
      expect(remoteConns).to.have.nested.property('[0].status', 'open')
    })

    it('should fail to dial remote over relay over relay', async () => {
      // relay1 dials relay2
      await relay1.dial(relay2.getMultiaddrs()[0])
      await usingAsRelay(relay1, relay2)

      // remote dials relay2
      await remote.dial(relay2.getMultiaddrs()[0])
      await usingAsRelay(remote, relay2)

      // local dials remote via relay1 via relay2
      const ma = getRelayAddress(relay1).encapsulate(`/p2p-circuit/p2p/${remote.peerId.toString()}`)

      await expect(local.dial(ma)).to.eventually.be.rejected
        .with.property('name', 'NoValidAddressesError')
    })

    it('should emit connection:close when relay stops', async () => {
      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      await local.dial(ma)

      const deferred = Promise.withResolvers<void>()
      const disconnectedPeers = new PeerSet()

      local.addEventListener('connection:close', (evt) => {
        disconnectedPeers.add(evt.detail.remotePeer)

        if (disconnectedPeers.size === 2) {
          deferred.resolve()
        }
      })

      // shut down relay
      await relay1.stop()

      // wait for events
      await deferred.promise

      // should have closed connections to remote and to relay
      expect(disconnectedPeers.has(remote.peerId)).to.be.true()
      expect(disconnectedPeers.has(relay1.peerId)).to.be.true()
    })

    it('should mark an outgoing relayed connection as limited', async () => {
      // discover relay and make reservation
      const connectionToRelay = await remote.dial(relay1.getMultiaddrs()[0])

      // connection to relay should not be limited
      expect(connectionToRelay).to.have.property('limits').that.is.undefined()

      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      const connection = await local.dial(ma)

      // connection to remote through relay should be limited
      expect(connection).to.have.property('limits').that.is.ok()
    })

    it('should mark an incoming relayed connection as limited', async () => {
      // discover relay and make reservation
      const connectionToRelay = await remote.dial(relay1.getMultiaddrs()[0])

      // connection to relay should not be limited
      expect(connectionToRelay).to.have.property('limits').that.is.undefined()

      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      await local.dial(ma)

      // connection from local through relay should be limited
      const connections = remote.getConnections(local.peerId)
      expect(connections).to.have.lengthOf(1)
      expect(connections).to.have.nested.property('[0].limits').that.is.ok()
    })

    it('should not open streams on a limited connection', async () => {
      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      const connection = await local.dial(ma)

      // connection should be marked limited
      expect(connection).to.have.property('limits').that.is.ok()

      await expect(connection.newStream('/my-protocol/1.0.0'))
        .to.eventually.be.rejected.with.property('name', 'LimitedConnectionError')
    })

    it('should not allow incoming streams on a limited connection', async () => {
      const protocol = '/my-protocol/1.0.0'

      // remote registers handler, disallow running over limited connections
      await remote.handle(protocol, (stream) => {
        echo(stream)
      }, {
        runOnLimitedConnection: false
      })

      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      const connection = await local.dial(ma)

      // connection should be marked limited
      expect(connection).to.have.property('limits').that.is.ok()

      await expect(connection.newStream('/my-protocol/1.0.0', {
        runOnLimitedConnection: false
      }))
        .to.eventually.be.rejected.with.property('name', 'LimitedConnectionError')
    })

    it('should open streams on a limited connection when told to do so', async () => {
      const protocol = '/my-protocol/1.0.0'

      // remote registers handler, allow running over limited streams
      await remote.handle(protocol, (stream) => {
        echo(stream)
      }, {
        runOnLimitedConnection: true
      })

      // discover relay and make reservation
      await remote.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(remote, relay1)

      // dial the remote through the relay
      const ma = getRelayAddress(remote)
      const connection = await local.dial(ma)

      // connection should be marked limited
      expect(connection).to.have.property('limits').that.is.ok()

      await expect(connection.newStream('/my-protocol/1.0.0', {
        runOnLimitedConnection: true
      }))
        .to.eventually.be.ok()
    })
  })

  describe('flows with data limit', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p<{ relay: CircuitRelayService }>
    const DATA_LIMIT = 2048

    beforeEach(async () => {
      [local, remote, relay] = await Promise.all([
        createClient(),
        createClient(),
        createRelay({
          services: {
            relay: circuitRelayServer({
              reservations: {
                defaultDataLimit: BigInt(DATA_LIMIT)
              }
            })
          }
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      return Promise.all([local, remote, relay].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should close the connection when too much data is sent', async () => {
      // local discover relay
      await local.dial(relay.getMultiaddrs()[0])
      await usingAsRelay(local, relay)

      // remote discover relay
      await remote.dial(relay.getMultiaddrs()[0])
      await usingAsRelay(remote, relay)

      // collect transferred data
      const transferred = new Uint8ArrayList()

      // set up an echo server on the remote
      const protocol = '/test/protocol/1.0.0'
      await remote.handle(protocol, (stream) => {
        stream.addEventListener('message', (evt) => {
          transferred.append(evt.data)
        })
      }, {
        runOnLimitedConnection: true
      })

      // dial the remote from the local through the relay
      const ma = getRelayAddress(remote)
      const stream = await local.dialProtocol(ma, protocol, {
        runOnLimitedConnection: true
      })

      Promise.resolve().then(async () => {
        while (true) {
          await delay(100)
          stream.send(new Uint8Array(2048))
        }
      }).catch(() => {
        // writing to a closed stream will throw so swallow the error
      })

      // we cannot be exact about this figure because mss, encryption and other
      // protocols all send data over connections when they are opened
      expect(transferred.byteLength).to.be.lessThan(DATA_LIMIT)
    })
  })

  describe('flows with duration limit', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p<{ relay: CircuitRelayService }>

    beforeEach(async () => {
      [local, remote, relay] = await Promise.all([
        createClient(),
        createClient(),
        createRelay({
          services: {
            relay: circuitRelayServer({
              reservations: {
                defaultDurationLimit: 1000
              }
            })
          }
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      return Promise.all([local, remote, relay].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should close the connection when connection is open for too long', async () => {
      // local discover relay
      await local.dial(relay.getMultiaddrs()[0])
      await usingAsRelay(local, relay)

      // remote discover relay
      await remote.dial(relay.getMultiaddrs()[0])
      await usingAsRelay(remote, relay)

      // collect transferred data
      const transferred = new Uint8ArrayList()

      // set up an echo server on the remote
      const protocol = '/test/protocol/1.0.0'
      await remote.handle(protocol, (stream) => {
        stream.addEventListener('message', (evt) => {
          transferred.append(evt.data)
        })
      }, {
        runOnLimitedConnection: true
      })

      // dial the remote from the local through the relay
      const ma = getRelayAddress(remote)

      const stream = await local.dialProtocol(ma, protocol, {
        runOnLimitedConnection: true
      })

      await Promise.all([
        pEvent(stream, 'close'),
        Promise.resolve().then(async () => {
          while (true) {
            await delay(100)
            stream.send(new Uint8Array(10))
            await delay(5000)
          }
        }).catch(() => {
          // writing to a closed stream will throw so swallow the error
        })
      ])

      expect(transferred.byteLength).to.equal(10)
    })
  })

  describe('pre-configured relay address', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p<{ relay: CircuitRelayService }>

    beforeEach(async () => {
      relay = await createRelay()

      ;[local, remote] = await Promise.all([
        createClient(),
        createClient({
          addresses: {
            listen: [
              `${relay.getMultiaddrs()[0].toString()}/p2p-circuit`
            ]
          }
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      await Promise.all([local, remote, relay].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should be able to dial remote on pre-configured relay address', async () => {
      const ma = getRelayAddress(remote)

      await expect(local.dial(ma)).to.eventually.be.ok()
    })
  })

  describe('pre-configured relay without a peer id', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p<{ relay: CircuitRelayService }>

    beforeEach(async () => {
      relay = await createRelay()

      ;[local, remote] = await Promise.all([
        createClient(),
        createClient({
          addresses: {
            listen: [
              `${relay.getMultiaddrs()[0].toString().split('/p2p')[0]}/p2p-circuit`
            ]
          }
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      await Promise.all([local, remote, relay].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should be able to dial remote on pre-configured relay address', async () => {
      await usingAsRelay(remote, relay)

      const ma = getRelayAddress(remote)

      await expect(local.dial(ma)).to.eventually.be.ok()
    })
  })

  describe('unlimited relay', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p<{ relay: CircuitRelayService }>
    const defaultDurationLimit = 100

    beforeEach(async () => {
      relay = await createRelay({
        services: {
          relay: circuitRelayServer({
            reservations: {
              defaultDurationLimit,
              applyDefaultLimit: false
            }
          }),
          identify: identify()
        }
      })

      ;[local, remote] = await Promise.all([
        createClient(),
        createClient({
          addresses: {
            listen: [
              `${relay.getMultiaddrs()[0].toString().split('/p2p')[0]}/p2p-circuit`
            ]
          },
          services: {
            echoService,
            identify: identify()
          }
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      await Promise.all([local, remote, relay].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should not apply a data limit', async () => {
      const ma = getRelayAddress(remote)
      const stream = await local.dialProtocol(ma, ECHO_PROTOCOL)

      // write more than the default data limit
      const data = new Uint8Array(Number(DEFAULT_DATA_LIMIT * 2n))
      const receivedData = Promise.withResolvers<void>()

      const output = new Uint8ArrayList()

      stream.addEventListener('message', (evt) => {
        output.append(evt.data)

        if (output.byteLength === data.byteLength) {
          receivedData.resolve()
        }
      })

      if (!stream.send(data)) {
        await pEvent(stream, 'drain', {
          rejectionEvents: ['close']
        })
      }

      await receivedData.promise

      expect(output.subarray()).to.equalBytes(data)
    })

    it('should not apply a time limit', async () => {
      const ma = getRelayAddress(remote)

      const stream = await local.dialProtocol(ma, ECHO_PROTOCOL, {
        runOnLimitedConnection: true
      })

      let finished = false

      setTimeout(() => {
        finished = true
      }, defaultDurationLimit * 5)

      const start = Date.now()
      let finish = 0

      while (true) {
        stream.send(new Uint8Array())
        await delay(10)

        if (finished) {
          finish = Date.now()
          break
        }
      }

      // default time limit is set to 100ms so the stream should have been open
      // for longer than that
      expect(finish - start).to.be.greaterThan(defaultDurationLimit)
    })

    it('should not mark an outgoing connection as limited', async () => {
      const ma = getRelayAddress(remote)

      const connection = await local.dial(ma)
      expect(connection).to.have.property('limits').that.is.undefined()
    })

    it('should not mark an incoming connection as limited', async () => {
      const ma = getRelayAddress(remote)

      await local.dial(ma)

      const connections = remote.getConnections(local.peerId)
      expect(connections).to.have.lengthOf(1)
      expect(connections).to.have.nested.property('[0].limits').that.is.undefined()
    })
  })
})
