/* eslint max-depth: ["error", 5] */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair, pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pRetry from 'p-retry'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { AutoNATv2Service } from '../src/autonat.ts'
import { PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION } from '../src/constants.ts'
import { DialResponse, DialStatus, Message } from '../src/pb/index.ts'
import type { AddressReachabilityChange, AutoNATv2Components, AutoNATv2ServiceInit } from '../src/index.ts'
import type { Connection, PeerId, PeerStore, Peer } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, NodeAddress, RandomWalk, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { StubbedInstance } from 'sinon-ts'

const defaultInit: AutoNATv2ServiceInit = {
  protocolPrefix: 'libp2p',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  timeout: 1000,
  startupDelay: 120000,
  refreshInterval: 120000
}

interface StubbedResponse {
  host: string
  peerId?: PeerId
  messages: Record<string, Message | Message[]>
}

describe('autonat v2 - events', () => {
  let service: any
  let components: AutoNATv2Components
  let randomWalk: StubbedInstance<RandomWalk>
  let registrar: StubbedInstance<Registrar>
  let addressManager: StubbedInstance<AddressManager>
  let connectionManager: StubbedInstance<ConnectionManager>
  let peerStore: StubbedInstance<PeerStore>

  beforeEach(async () => {
    randomWalk = stubInterface<RandomWalk>()
    registrar = stubInterface<Registrar>()
    addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([])

    connectionManager = stubInterface<ConnectionManager>({
      getConnections: () => [],
      getMaxConnections: () => 100
    })
    peerStore = stubInterface<PeerStore>()

    components = {
      logger: defaultLogger(),
      randomWalk,
      registrar,
      addressManager,
      connectionManager,
      peerStore
    }

    service = new AutoNATv2Service(components, defaultInit)

    await start(components)
    await start(service)
  })

  afterEach(async () => {
    sinon.restore()

    await stop(service)
    await stop(components)
  })

  async function stubPeerResponse (data: StubbedResponse): Promise<Connection> {
    const peer: Peer = {
      id: data.peerId ?? peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      addresses: [{
        multiaddr: multiaddr(`/ip4/${data.host}/tcp/28319`),
        isCertified: true
      }],
      protocols: [
        '/libp2p/autonat/2/dial-request',
        '/libp2p/autonat/2/dial-back'
      ],
      metadata: new Map(),
      tags: new Map()
    }

    peerStore.get.withArgs(peer.id).resolves(peer)

    const connection = stubInterface<Connection>()
    connection.remoteAddr = multiaddr(`/ip4/${data.host}/tcp/28319/p2p/${peer.id.toString()}`)
    connection.remotePeer = peer.id
    connectionManager.openConnection.withArgs(peer.id).resolves(connection)

    const [outgoingStream, incomingStream] = await streamPair()

    connection.newStream.withArgs(`/${PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}/dial-request`).resolves(outgoingStream)

    const messages = pbStream(incomingStream).pb(Message)

    Promise.resolve().then(async () => {
      const message = await messages.read()

      if (message.dialRequest == null) {
        throw new Error('Unexpected message')
      }

      for (const addr of message.dialRequest.addrs.map(buf => multiaddr(buf))) {
        let responses = data.messages[addr.toString()]

        if (responses == null) {
          throw new Error(`No response defined for address ${addr}`)
        }

        if (!Array.isArray(responses)) {
          responses = [responses]
        }

        for (const response of responses) {
          await messages.write(response)
        }
      }

      await incomingStream.close()
    })

    return connection
  }

  async function makeResponseConnection (host: string, addr: Multiaddr, dialStatus: DialStatus): Promise<Connection> {
    return stubPeerResponse({
      host,
      messages: {
        [addr.toString()]: {
          dialResponse: {
            addrIdx: 0,
            status: DialResponse.ResponseStatus.OK,
            dialStatus
          }
        }
      }
    })
  }

  // Builds `count` peers each in a distinct network segment (distinct first
  // octet via `hostBase + i`), which is what lets them count toward the
  // success/failure thresholds. Concurrent verification cycles within one test
  // must use non-overlapping `hostBase` values to avoid colliding segments.
  async function stubResponses (count: number, addr: Multiaddr, dialStatus: DialStatus, hostBase = 100): Promise<Connection[]> {
    const conns: Connection[] = []
    for (let i = 0; i < count; i++) {
      conns.push(await makeResponseConnection(`${hostBase + i}.124.124.124`, addr, dialStatus))
    }
    return conns
  }

  async function driveConnections (conns: Connection[]): Promise<void> {
    for (const conn of conns) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }
  }

  function captureEvent (name: 'address:verifying' | 'address:reachable' | 'address:unreachable'): Array<CustomEvent<AddressReachabilityChange>> {
    const fired: Array<CustomEvent<AddressReachabilityChange>> = []
    service.addEventListener(name, (evt: CustomEvent<AddressReachabilityChange>) => {
      fired.push(evt)
    })
    return fired
  }

  function observedEntry (addr: Multiaddr, opts: { verified?: boolean, expires?: number, lastVerified?: number } = {}): NodeAddress {
    return {
      multiaddr: addr,
      verified: opts.verified ?? false,
      type: 'observed',
      expires: opts.expires ?? 0,
      lastVerified: opts.lastVerified
    }
  }

  function transportEntry (addr: Multiaddr, opts: { verified?: boolean, expires?: number } = {}): NodeAddress {
    return {
      multiaddr: addr,
      verified: opts.verified ?? false,
      type: 'transport',
      expires: opts.expires ?? 0
    }
  }

  it('emits address:verifying when a probe starts for a new address', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')

    // Drive a single connection to start a probe without pushing to a verdict
    // (1 OK is below the 4-success threshold for an observed address).
    await driveConnections(await stubResponses(1, addr, DialStatus.OK))

    await pRetry(() => {
      expect(verifying).to.have.lengthOf(1)
    })

    expect(verifying[0].detail.addr.toString()).to.equal(addr.toString())
  })

  it('emits address:verifying for each probing peer, carrying progress', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')

    // Three peers from distinct network segments probe the same address (3
    // successes is below the 4-success threshold for observed, so no verdict).
    await driveConnections(await stubResponses(3, addr, DialStatus.OK))
    await pRetry(() => { expect(verifying).to.have.lengthOf(3) })

    // Each event carries the running tally. Exact values depend on async job
    // interleaving, so assert the shape (monotonic non-decrease, bounded)
    // rather than the exact sequence.
    const successes = verifying.map(e => e.detail.success)
    expect(successes[0]).to.equal(0)
    expect(successes).to.deep.equal([...successes].sort((a, b) => a - b))
    expect(Math.max(...successes)).to.be.lessThan(3)
    expect(verifying.every(e => e.detail.addr.toString() === addr.toString())).to.be.true()
  })

  it('does not re-emit address:verifying for a peer in an already-probed segment', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')

    // first peer in segment 100 contributes and records the segment
    await driveConnections([await makeResponseConnection('100.1.1.1', addr, DialStatus.OK)])
    await pRetry(() => { expect(verifying).to.have.lengthOf(1) })

    // a second peer in the same segment is skipped, so it emits nothing
    await driveConnections([await makeResponseConnection('100.2.2.2', addr, DialStatus.OK)])
    await delay(100)

    expect(verifying).to.have.lengthOf(1)
  })

  it('emits nothing for an inconclusive dial-back error', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    // E_DIAL_BACK_ERROR advances neither counter, so it is inconclusive: no
    // event and no verdict
    await driveConnections(await stubResponses(3, addr, DialStatus.E_DIAL_BACK_ERROR))
    await delay(100)

    expect(verifying).to.have.lengthOf(0)
    expect(reachable).to.have.lengthOf(0)
    expect(unreachable).to.have.lengthOf(0)
  })

  it('emits address:verifying per address when one peer probes several', async () => {
    const addr1 = multiaddr('/ip4/123.123.123.123/tcp/28319')
    const addr2 = multiaddr('/ip4/125.125.125.125/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr1), observedEntry(addr2)])

    const verifying = captureEvent('address:verifying')

    // a single peer verifies both pending addresses in one exchange
    const connection = await stubPeerResponse({
      host: '200.200.200.200',
      messages: {
        [addr1.toString()]: {
          dialResponse: { addrIdx: 0, status: DialResponse.ResponseStatus.OK, dialStatus: DialStatus.OK }
        },
        [addr2.toString()]: {
          dialResponse: { addrIdx: 1, status: DialResponse.ResponseStatus.OK, dialStatus: DialStatus.OK }
        }
      }
    })
    await service.client.verifyExternalAddresses(connection)

    await pRetry(() => { expect(verifying).to.have.lengthOf(2) })
    expect(verifying.map(e => e.detail.addr.toString()).sort()).to.deep.equal(
      [addr1.toString(), addr2.toString()].sort()
    )
  })

  it('does not emit address:verifying when verification is skipped due to connection capacity', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])
    sinon.stub(connectionManager, 'getConnections').returns(new Array(90).fill(null))

    const verifying = captureEvent('address:verifying')
    const connection = await makeResponseConnection('124.124.124.124', addr, DialStatus.OK)

    await service.client.verifyExternalAddresses(connection)
    await delay(100)

    expect(verifying).to.have.lengthOf(0)
    expect((connection.newStream as sinon.SinonStub).called).to.be.false()
  })

  it('emits address:reachable without address:verifying when re-affirming a verified address under connection capacity', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    // previously verified (lastVerified set) and now up for re-verification
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { lastVerified: Date.now() - 1000 })])
    sinon.stub(connectionManager, 'getConnections').returns(new Array(90).fill(null))

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')

    // Near the connection limit we skip the actual probe and re-affirm the
    // prior verdict, so address:reachable fires with no preceding verifying
    // and without opening a stream.
    const connection = await makeResponseConnection('124.124.124.124', addr, DialStatus.OK)
    await service.client.verifyExternalAddresses(connection)
    await delay(100)

    expect(reachable).to.have.lengthOf(1)
    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
    // re-affirmed without probing, so the tally is zero
    expect(reachable[0].detail.success).to.equal(0)
    expect(reachable[0].detail.failure).to.equal(0)
    expect(verifying).to.have.lengthOf(0)
    expect((connection.newStream as sinon.SinonStub).called).to.be.false()
  })

  it('emits address:verifying then address:reachable when an observed address reaches a verdict', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(verifying).to.have.lengthOf(4)
    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
    expect(reachable[0].detail.type).to.equal('observed')
    expect(reachable[0].detail.success).to.equal(4)
  })

  it('emits address:reachable on first verdict for a non-observed address (1 success)', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr)])

    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(1, addr, DialStatus.OK))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
  })

  it('emits address:unreachable on first verdict for an observed address (8 failures)', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const unreachable = captureEvent('address:unreachable')

    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR))

    await pRetry(() => {
      expect(unreachable).to.have.lengthOf(1)
    })

    expect(unreachable[0].detail.addr.toString()).to.equal(addr.toString())
    expect(unreachable[0].detail.failure).to.equal(8)
  })

  it('re-emits address:verifying and address:reachable when a reachable address is re-verified', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })
    const afterFirstCycle = verifying.length

    // TTL lapses; the address becomes eligible for re-verification.
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { verified: true, expires: Date.now() - 1000 })])
    await driveConnections(await stubResponses(4, addr, DialStatus.OK, 200))

    // The new cycle re-emits verifying and produces a fresh reachable verdict.
    await pRetry(() => {
      expect(reachable).to.have.lengthOf(2)
    })
    expect(verifying.length).to.be.greaterThan(afterFirstCycle)
  })

  it('flips reachable to unreachable, re-emitting address:verifying for the new cycle', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })
    const afterFirstCycle = verifying.length

    // TTL lapses; re-probe fails 8 times.
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { verified: true, expires: Date.now() - 1000 })])
    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR, 200))

    await pRetry(() => {
      expect(unreachable).to.have.lengthOf(1)
    })

    expect(verifying.length).to.be.greaterThan(afterFirstCycle)
    expect(reachable).to.have.lengthOf(1)
    expect(unreachable[0].detail.addr.toString()).to.equal(addr.toString())
  })

  it('flips unreachable to reachable for a non-observed address, re-emitting address:verifying', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    // 8 failures -> unreachable
    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR))
    await pRetry(() => { expect(unreachable).to.have.lengthOf(1) })
    const afterFirstCycle = verifying.length

    // retry TTL lapses; re-probe succeeds (1 success for non-observed)
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr, { expires: Date.now() - 1000 })])
    await driveConnections(await stubResponses(1, addr, DialStatus.OK, 200))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(verifying.length).to.be.greaterThan(afterFirstCycle)
    expect(unreachable).to.have.lengthOf(1)
    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
  })

  it('does not emit any event when an address disappears before being probed', async () => {
    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    // No addresses are tracked when the probe runs.
    addressManager.getAddressesWithMetadata.returns([])

    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(200)

    expect(verifying).to.have.lengthOf(0)
    expect(reachable).to.have.lengthOf(0)
    expect(unreachable).to.have.lengthOf(0)
  })

  it('does not emit when a reachable address disappears', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })

    const verifyingCount = verifying.length

    // The address is removed for an unrelated reason (relay drop, transport
    // shutdown, etc.). There is no removed event, so the disappearance is
    // silent; in particular it must not surface as a spurious unreachable.
    addressManager.getAddressesWithMetadata.returns([])

    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(100)

    // Nothing new is emitted for the disappearance.
    expect(reachable).to.have.lengthOf(1)
    expect(unreachable).to.have.lengthOf(0)
    expect(verifying).to.have.lengthOf(verifyingCount)
  })

  it('does not emit events once stopped', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    await stop(service)

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    // verifyExternalAddresses is a no-op once stopped, so driving probes emits
    // nothing
    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await delay(100)

    expect(verifying).to.have.lengthOf(0)
    expect(reachable).to.have.lengthOf(0)
    expect(unreachable).to.have.lengthOf(0)
  })
})
