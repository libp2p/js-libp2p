/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { expect } from 'aegir/chai'
import defer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { RELAY_V2_HOP_CODEC } from '../../src/circuit-relay/constants.js'
import { createNode } from '../utils/creators/peer.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import { createNodeOptions, discoveredRelayConfig, getRelayAddress, hasRelay, usingAsRelay } from './utils.js'
import { circuitRelayServer, circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { tcp } from '@libp2p/tcp'
import { Uint8ArrayList } from 'uint8arraylist'
import delay from 'delay'
import type { Libp2p } from '@libp2p/interface-libp2p'
import { pbStream } from 'it-pb-stream'
import { HopMessage, Status } from '../../src/circuit-relay/pb/index.js'
import { Circuit } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'

describe('circuit-relay', () => {
  describe('flows with 1 listener', () => {
    let local: Libp2p
    let relay1: Libp2p
    let relay2: Libp2p
    let relay3: Libp2p

    beforeEach(async () => {
      // create 1 node and 3 relays
      [local, relay1, relay2, relay3] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        })
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
      const knownProtocols = await local.peerStore.protoBook.get(relay1.peerId)
      expect(knownProtocols).to.include(RELAY_V2_HOP_CODEC)
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
      await expect(usingAsRelay(local, relay1, {
        timeout: 1000
      })).to.eventually.be.rejected()
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
      const deferred = defer()

      // discover one relay and connect
      await relay1.dial(relay2.getMultiaddrs()[0])

      // wait for peer to be used as a relay
      await usingAsRelay(relay1, relay2)

      // discover an extra relay and connect to gather its Hop support
      await relay1.dial(relay3.getMultiaddrs()[0])

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(relay1, relay3)

      // disconnect not used listen relay
      await relay1.hangUp(relay3.peerId)

      // Stub dial
      // @ts-expect-error private field
      sinon.stub(relay1.components.connectionManager, 'openConnection').callsFake(async () => {
        deferred.resolve()
        return await Promise.reject(new Error('failed to dial'))
      })

      // Remove peer used as relay from peerStore and disconnect it
      await relay1.hangUp(relay2.peerId)
      await relay1.peerStore.delete(relay2.peerId)
      expect(relay1.getConnections()).to.be.empty()

      // Wait for failed dial
      await deferred.promise
    })

    it('should announce new addresses when using a peer as a relay', async () => {
      // should not have have a circuit address to start with
      expect(local.getMultiaddrs().find(ma => Circuit.matches(ma))).to.be.undefined()

      // set up listener for address change
      const deferred = defer()

      local.peerStore.addEventListener('change:multiaddrs', ({ detail }) => {
        const isLocalPeerId = local.peerId.equals(detail.peerId)
        const hasCircuitRelayAddress = detail.multiaddrs.find(ma => Circuit.matches(ma)) != null

        if (isLocalPeerId && hasCircuitRelayAddress) {
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

      // set up listener for address change
      const deferred = defer()

      local.peerStore.addEventListener('change:multiaddrs', ({ detail }) => {
        const isLocalPeerId = local.peerId.equals(detail.peerId)
        const hasNoCircuitRelayAddress = detail.multiaddrs.find(ma => Circuit.matches(ma)) == null

        if (isLocalPeerId && hasNoCircuitRelayAddress) {
          deferred.resolve()
        }
      })

      // shut down the relay
      await relay1.stop()

      // should no longer have a circuit address
      await deferred.promise
    })
  })

  describe('flows with 2 listeners', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay1: Libp2p
    let relay2: Libp2p
    let relay3: Libp2p

    beforeEach(async () => {
      [local, remote, relay1, relay2, relay3] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ],
            relay: circuitRelayServer()
          })
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([local, remote, relay1, relay2, relay3].map(async libp2p => {
        if (libp2p != null) {
          await libp2p.stop()
        }
      }))
    })

    it('should not add listener to a already relayed connection', async () => {
      // Relay 1 discovers Relay 3 and connect
      await relay1.peerStore.addressBook.add(relay3.peerId, relay3.getMultiaddrs())
      await relay1.dial(relay3.peerId)
      await usingAsRelay(relay1, relay3)

      // Relay 2 discovers Relay 3 and connect
      await relay2.peerStore.addressBook.add(relay3.peerId, relay3.getMultiaddrs())
      await relay2.dial(relay3.peerId)
      await usingAsRelay(relay2, relay3)

      // Relay 1 discovers Relay 2 relayed multiaddr via Relay 3
      const ma2RelayedBy3 = relay2.getMultiaddrs()[relay2.getMultiaddrs().length - 1]
      await relay1.peerStore.addressBook.add(relay2.peerId, [ma2RelayedBy3])
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

      // dial the remote through the relay
      const ma = getRelayAddress(remote)

      // remove the peer id from the multiaddr
      const maWithoutPeerId = multiaddr(`${ma.toString().split('/p2p-circuit')[0]}/p2p-circuit`)
      expect(maWithoutPeerId.getPeerId()).to.not.equal(remote.peerId.toString())

      // ensure this is the only address we have for the peer
      await local.peerStore.addressBook.set(remote.peerId, [
        maWithoutPeerId
      ])

      // dial via peer id so we load the address from the address book
      await local.dial(remote.peerId)
    })

    it('should not stay connected to a relay when not already connected and HOP fails', async () => {
      // dial the remote through the relay
      const relayedMultiaddr = relay1.getMultiaddrs()[0].encapsulate(`/p2p-circuit/p2p/${remote.peerId.toString()}`)

      await expect(local.dial(relayedMultiaddr))
        .to.eventually.be.rejected()
        .and.to.have.property('message').that.matches(/NO_RESERVATION/)

      // we should not be connected to the relay, because we weren't before the dial
      expect(local.getConnections(relay1.peerId)).to.be.empty()
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
      expect(conns).to.have.nested.property('[0].stat.status', 'OPEN')
    })

    it('destination peer should stay connected to an already connected relay on hop failure', async () => {
      await local.dial(relay1.getMultiaddrs()[0])
      await usingAsRelay(local, relay1)

      const conns = relay1.getConnections(local.peerId)
      expect(conns).to.have.lengthOf(1)

      // this should fail as the local peer has HOP disabled
      await expect(conns[0].newStream(RELAY_V2_HOP_CODEC))
        .to.be.rejected()

      // we should still be connected to the relay
      const remoteConns = local.getConnections(relay1.peerId)
      expect(remoteConns).to.have.lengthOf(1)
      expect(remoteConns).to.have.nested.property('[0].stat.status', 'OPEN')
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
        .with.property('code', 'ERR_RELAYED_DIAL')
    })

    it('should fail to open connection over relayed connection', async () => {
      // relay1 dials relay2
      await relay1.dial(relay2.getMultiaddrs()[0])
      await usingAsRelay(relay1, relay2)

      // remote dials relay2
      await remote.dial(relay2.getMultiaddrs()[0])
      await usingAsRelay(remote, relay2)

      // local dials relay1 via relay2
      const ma = getRelayAddress(relay1)

      // open hop stream and try to connect to remote
      const stream = await local.dialProtocol(ma, RELAY_V2_HOP_CODEC)

      const hopStream = pbStream(stream).pb(HopMessage)

      hopStream.write({
        type: HopMessage.Type.CONNECT,
        peer: {
          id: remote.peerId.toBytes(),
          addrs: []
        }
      })

      const response = await hopStream.read()
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.PERMISSION_DENIED)
    })
  })

  describe('flows with data limit', () => {
    let local: Libp2pNode
    let remote: Libp2pNode
    let relay: Libp2pNode

    beforeEach(async () => {
      [local, remote, relay] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp()
            ],
            relay: circuitRelayServer({
              reservations: {
                defaultDataLimit: 1024n
              }
            })
          })
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([local, remote, relay].map(async libp2p => {
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
      await remote.handle(protocol, ({ stream }) => {
        void Promise.resolve().then(async () => {
          try {
            for await (const buf of stream.source) {
              transferred.append(buf)
            }
          } catch {}
        })
      })

      // dial the remote from the local through the relay
      const ma = getRelayAddress(remote)

      try {
        const stream = await local.dialProtocol(ma, protocol)

        await stream.sink(async function * () {
          while (true) {
            await delay(100)
            yield new Uint8Array(2048)
          }
        }())
      } catch {}

      // we cannot be exact about this figure because mss, encryption and other
      // protocols all send data over connections when they are opened
      expect(transferred.byteLength).to.be.lessThan(1024)
    })
  })

  describe('flows with duration limit', () => {
    let local: Libp2pNode
    let remote: Libp2pNode
    let relay: Libp2pNode

    beforeEach(async () => {
      [local, remote, relay] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport({
                discoverRelays: 1
              })
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            transports: [
              tcp()
            ],
            relay: circuitRelayServer({
              reservations: {
                defaultDurationLimit: 1000
              }
            })
          })
        })
      ])
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([local, remote, relay].map(async libp2p => {
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
      await remote.handle(protocol, ({ stream }) => {
        void Promise.resolve().then(async () => {
          try {
            for await (const buf of stream.source) {
              transferred.append(buf)
            }
          } catch {}
        })
      })

      // dial the remote from the local through the relay
      const ma = getRelayAddress(remote)

      try {
        const stream = await local.dialProtocol(ma, protocol)

        await stream.sink(async function * () {
          while (true) {
            await delay(100)
            yield new Uint8Array(10)
            await delay(5000)
          }
        }())
      } catch {}

      expect(transferred.byteLength).to.equal(10)
    })
  })

  describe('preconfigured relay address', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p

    beforeEach(async () => {
      relay = await createNode({
        config: createNodeOptions({
          transports: [
            tcp(),
            circuitRelayTransport()
          ],
          relay: circuitRelayServer()
        })
      })

      ;[local, remote] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport()
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            addresses: {
              listen: [
                `${relay.getMultiaddrs()[0].toString()}/p2p-circuit`
              ]
            },
            transports: [
              tcp(),
              circuitRelayTransport()
            ]
          })
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

    it('should be able to dial remote on preconfigured relay address', async () => {
      const ma = getRelayAddress(remote)

      await expect(local.dial(ma)).to.eventually.be.ok()
    })
  })

  describe('preconfigured relay without a peer id', () => {
    let local: Libp2p
    let remote: Libp2p
    let relay: Libp2p

    beforeEach(async () => {
      relay = await createNode({
        config: createNodeOptions({
          transports: [
            tcp(),
            circuitRelayTransport()
          ],
          relay: circuitRelayServer()
        })
      })

      ;[local, remote] = await Promise.all([
        createNode({
          config: createNodeOptions({
            transports: [
              tcp(),
              circuitRelayTransport()
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            addresses: {
              listen: [
                `${relay.getMultiaddrs()[0].toString().split('/p2p')[0]}/p2p-circuit`
              ]
            },
            transports: [
              tcp(),
              circuitRelayTransport()
            ]
          })
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

    it('should be able to dial remote on preconfigured relay address', async () => {
      const ma = getRelayAddress(remote)

      await expect(local.dial(ma)).to.eventually.be.ok()
    })
  })
})
