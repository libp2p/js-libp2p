import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerMap } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { TypedEventEmitter } from 'main-event'
import { pEvent } from 'p-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { ConnectionPruner } from '../../src/connection-manager/connection-pruner.js'
import type { Libp2pEvents, PeerStore, Stream, Connection, AbortOptions, ComponentLogger, Peer } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

interface ConnectionPrunerComponents {
  connectionManager: StubbedInstance<ConnectionManager>
  peerStore: StubbedInstance<PeerStore>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

describe('connection-pruner', () => {
  let pruner: ConnectionPruner
  let components: ConnectionPrunerComponents

  beforeEach(() => {
    components = {
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>(),
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }

    pruner = new ConnectionPruner(components)
  })

  afterEach(async () => {
    await stop(pruner)
  })

  it('should sort connections for pruning, closing connections without streams first unless they are tagged', async () => {
    const tagged = ['tagged', 'untagged']
    const streams = ['streams', 'no-streams']
    const direction = ['inbound', 'outbound']
    const age = ['old', 'new']

    const connections = []
    const peerValues = new PeerMap<number>()

    for (const t of tagged) {
      for (const s of streams) {
        for (const d of direction) {
          for (const a of age) {
            const connection = stubInterface<Connection>({
              id: `${t}-${s}-${d}-${a}`,
              remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
              streams: s === 'streams'
                ? [stubInterface<Stream>()]
                : [],
              direction: d === 'inbound' ? 'inbound' : 'outbound',
              timeline: {
                open: a === 'old' ? 0 : (Date.now() - 100)
              }
            })

            // eslint-disable-next-line max-depth
            if (t === 'tagged') {
              peerValues.set(connection.remotePeer, 100)
            }

            connections.push(
              connection
            )
          }
        }
      }
    }

    // priority is:
    // 1. tagged peers
    // 2. connections with streams
    // 3. outbound connections
    // 4. longer-lived connections
    expect(pruner.sortConnections(connections.sort((a, b) => Math.random() > 0.5 ? -1 : 1), peerValues).map(conn => conn.id))
      .to.deep.equal([
        'untagged-no-streams-inbound-new',
        'untagged-no-streams-inbound-old',
        'untagged-no-streams-outbound-new',
        'untagged-no-streams-outbound-old',
        'untagged-streams-inbound-new',
        'untagged-streams-inbound-old',
        'untagged-streams-outbound-new',
        'untagged-streams-outbound-old',
        'tagged-no-streams-inbound-new',
        'tagged-no-streams-inbound-old',
        'tagged-no-streams-outbound-new',
        'tagged-no-streams-outbound-old',
        'tagged-streams-inbound-new',
        'tagged-streams-inbound-old',
        'tagged-streams-outbound-new',
        'tagged-streams-outbound-old'
      ])
  })

  it('should close connections with low tag values first', async () => {
    const max = 5
    pruner = new ConnectionPruner(components, {
      maxConnections: max
    })
    pruner.start()

    const connections: Connection[] = []
    components.connectionManager.getConnections.returns(connections)

    const spies = new Map<number, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()

    // wait for prune event
    const eventPromise = pEvent(components.events, 'connection:prune')

    // Add 1 connection too many
    for (let i = 0; i < max + 1; i++) {
      const connection = stubInterface<Connection>({
        remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        streams: []
      })
      const spy = connection.close

      const value = i * 10
      spies.set(value, spy)
      components.peerStore.get.withArgs(connection.remotePeer).resolves(stubInterface<Peer>({
        tags: new Map([['test-tag', { value }]])
      }))

      connections.push(connection)

      components.events.safeDispatchEvent('connection:open', {
        detail: connection
      })
    }

    await eventPromise

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort((a, b) => {
      if (a > b) {
        return 1
      }

      if (a < b) {
        return -1
      }

      return 0
    })[0]

    expect(spies.get(lowest)).to.have.property('callCount', 1)
  })

  it('should close shortest-lived connection if the tag values are equal', async () => {
    const max = 5
    pruner = new ConnectionPruner(components, {
      maxConnections: max
    })
    pruner.start()

    const connections: Connection[] = []
    components.connectionManager.getConnections.returns(connections)

    const spies = new Map<string, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()
    const eventPromise = pEvent(components.events, 'connection:prune')

    const createConnection = async (value: number, open: number = Date.now(), peerTag: string = 'test-tag'): Promise<void> => {
      // #TODO: Mock the connection timeline to simulate an older connection
      const connection = stubInterface<Connection>({
        remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        streams: [],
        timeline: {
          open
        }
      })
      const spy = connection.close

      // The lowest tag value will have the longest connection
      spies.set(peerTag, spy)
      components.peerStore.get.withArgs(connection.remotePeer).resolves(stubInterface<Peer>({
        tags: new Map([['test-tag', { value }]])
      }))

      connections.push(connection)

      components.events.safeDispatchEvent('connection:open', {
        detail: connection
      })
    }

    // Create one short of enough connections to initiate pruning
    for (let i = 1; i < max; i++) {
      const value = i * 10
      await createConnection(value)
    }

    const value = 0 * 10
    // Add a connection with the lowest tag value BUT the longest lived connection
    await createConnection(value, 18000, 'longest')
    // Add one more connection with the lowest tag value BUT the shortest-lived connection
    await createConnection(value, Date.now(), 'shortest')

    // wait for prune event
    await eventPromise

    // get the lowest tagged value, but this would be also the longest lived connection
    const longestLivedWithLowestTagSpy = spies.get('longest')

    // Get lowest tagged connection but with a shorter-lived connection
    const shortestLivedWithLowestTagSpy = spies.get('shortest')

    expect(longestLivedWithLowestTagSpy).to.have.property('callCount', 0)
    expect(shortestLivedWithLowestTagSpy).to.have.property('callCount', 1)
  })

  it('should correctly parse and store allow list as IpNet objects in ConnectionPruner', () => {
    const mockInit = {
      allow: [
        multiaddr('/ip4/83.13.55.32/ipcidr/32'),
        multiaddr('/ip4/83.13.55.32'),
        multiaddr('/ip4/192.168.1.1/ipcidr/24'),
        multiaddr('/ip6/2001::0/ipcidr/64')
      ]
    }

    // Create a ConnectionPruner instance
    const pruner = new ConnectionPruner(components, mockInit)

    // Expected IpNet objects for comparison
    const expectedAllowList = [
      {
        mask: new Uint8Array([255, 255, 255, 255]),
        network: new Uint8Array([83, 13, 55, 32])
      },
      {
        mask: new Uint8Array([255, 255, 255, 255]),
        network: new Uint8Array([83, 13, 55, 32])
      },
      {
        mask: new Uint8Array([255, 255, 255, 0]),
        network: new Uint8Array([192, 168, 1, 0])
      },
      {
        mask: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0]),
        network: new Uint8Array([32, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      }
    ]

    // Verify that the allow list in the pruner matches the expected IpNet objects

    expect(pruner['allow']).to.deep.equal(expectedAllowList)
  })

  it('should not close connection that is on the allowlist when pruning', async () => {
    const max = 2
    const remoteAddr = multiaddr('/ip4/83.13.55.32/tcp/59283')

    pruner = new ConnectionPruner(components, {
      maxConnections: max,
      allow: [
        multiaddr('/ip4/83.13.55.32')
      ]
    })
    pruner.start()

    const connections: Connection[] = []
    components.connectionManager.getConnections.returns(connections)

    const spies = new Map<number, sinon.SinonSpy<[options?: AbortOptions], Promise<void>>>()
    const eventPromise = pEvent(components.events, 'connection:prune')

    // Max out connections
    for (let i = 0; i < max; i++) {
      const connection = stubInterface<Connection>({
        remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/12345'),
        streams: []
      })
      const spy = connection.close

      const value = (i + 1) * 10
      spies.set(value, spy)
      components.peerStore.get.withArgs(connection.remotePeer).resolves(stubInterface<Peer>({
        tags: new Map([['test-tag', { value }]])
      }))

      connections.push(connection)

      components.events.safeDispatchEvent('connection:open', {
        detail: connection
      })
    }

    // an outbound connection is opened from an address in the allow list
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = stubInterface<Connection>({
      remotePeer,
      remoteAddr,
      streams: []
    })

    const value = 0
    const spy = connection.close
    spies.set(value, spy)
    // Tag that allowed peer with lowest value
    components.peerStore.get.withArgs(connection.remotePeer).resolves(stubInterface<Peer>({
      tags: new Map([['test-tag', { value }]])
    }))

    connections.push(connection)

    components.events.safeDispatchEvent('connection:open', {
      detail: connection
    })

    // wait for prune event
    await eventPromise

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort((a, b) => {
      if (a > b) {
        return 1
      }

      if (a < b) {
        return -1
      }

      return 0
    })[0]
    const lowestSpy = spies.get(lowest)

    // expect lowest value spy NOT to be called since the peer is in the allow list
    expect(lowestSpy).to.have.property('callCount', 0)
  })

  it('should close connection when the maximum connections has been reached even without tags', async () => {
    const max = 5
    pruner = new ConnectionPruner(components, {
      maxConnections: max
    })
    pruner.start()

    const connections: Connection[] = []
    components.connectionManager.getConnections.returns(connections)

    const eventPromise = pEvent(components.events, 'connection:prune')

    // Add 1 too many connections
    const spy = Sinon.spy()
    for (let i = 0; i < max + 1; i++) {
      const connection = stubInterface<Connection>({
        remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        streams: [],
        limits: undefined,
        close: spy
      })

      components.peerStore.get.withArgs(connection.remotePeer).resolves(stubInterface<Peer>({
        tags: new Map()
      }))

      connections.push(connection)

      components.events.safeDispatchEvent('connection:open', {
        detail: connection
      })
    }

    // wait for prune event
    await eventPromise

    expect(spy).to.have.property('callCount', 1)
  })
})
