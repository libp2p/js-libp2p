import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerMap } from '@libp2p/peer-collections'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { ConnectionPruner } from '../../src/connection-manager/connection-pruner.js'
import type { Libp2pEvents, PeerStore, Stream, TypedEventTarget, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface ConnectionPrunerComponents {
  connectionManager: StubbedInstance<ConnectionManager>
  peerStore: StubbedInstance<PeerStore>
  events: TypedEventTarget<Libp2pEvents>
}

describe('connection-pruner', () => {
  let pruner: ConnectionPruner
  let components: ConnectionPrunerComponents

  beforeEach(() => {
    components = {
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>(),
      events: new TypedEventEmitter()
    }

    pruner = new ConnectionPruner({
      ...components,
      logger: defaultLogger()
    }, {})
  })

  it('should sort connections for pruning', async () => {
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
              remotePeer: await createEd25519PeerId(),
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
})
