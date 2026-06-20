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
  timeout: 100,
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

  function captureEvent (name: 'address:verifying' | 'address:reachable' | 'address:unreachable' | 'address:removed'): Array<CustomEvent<AddressReachabilityChange>> {
    const fired: Array<CustomEvent<AddressReachabilityChange>> = []
    service.addEventListener(name, (evt: CustomEvent<AddressReachabilityChange>) => {
      fired.push(evt)
    })
    return fired
  }

  function observedEntry (addr: Multiaddr, opts: { verified?: boolean, expires?: number } = {}): NodeAddress {
    return {
      multiaddr: addr,
      verified: opts.verified ?? false,
      type: 'observed',
      expires: opts.expires ?? 0
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

  it('emits address:verifying when probe starts for a new address', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')

    // Drive a single connection to trigger getUnverifiedMultiaddrs without
    // pushing to a verdict (1 OK is below the 4-success threshold for observed).
    await driveConnections(await stubResponses(1, addr, DialStatus.OK))

    await pRetry(() => {
      expect(verifying).to.have.lengthOf(1)
    })

    expect(verifying[0].detail.addr.toString()).to.equal(addr.toString())
    expect(service.verifying.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
    expect(service.reachable).to.deep.equal([])
    expect(service.unreachable).to.deep.equal([])
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
    expect(service.verifying).to.deep.equal([])
    expect((connection.newStream as sinon.SinonStub).called).to.be.false()
  })

  it('moves address out of service.verifying once a verdict is reached', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(verifying).to.have.lengthOf(1)
    expect(service.verifying).to.deep.equal([])
    expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
  })

  it('does not re-emit address:verifying on re-probe of a reachable address', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const verifying = captureEvent('address:verifying')
    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })
    expect(verifying).to.have.lengthOf(1)

    // TTL lapses; re-probe runs.
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { verified: true, expires: Date.now() - 1000 })])
    await driveConnections(await stubResponses(4, addr, DialStatus.OK, 200))
    await delay(200)

    // verifying should still be 1 — no re-emission for a reachable address.
    expect(verifying).to.have.lengthOf(1)
    expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
  })

  it('emits address:reachable on first verdict for an observed address', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
    expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
    expect(service.unreachable).to.deep.equal([])
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
    expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
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
    expect(service.unreachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
    expect(service.reachable).to.deep.equal([])
  })

  it('does not re-emit address:reachable on re-confirmation', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const reachable = captureEvent('address:reachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })

    // Simulate the address being marked as needing re-verification (TTL lapsed)
    // and re-probe with another set of successful responses.
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { verified: true, expires: Date.now() - 1000 })])

    await driveConnections(await stubResponses(4, addr, DialStatus.OK, 200))
    await delay(200)

    expect(reachable).to.have.lengthOf(1)
  })

  it('flips REACHABLE → UNREACHABLE and emits address:unreachable', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })

    // TTL lapses; re-probe fails 8 times.
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr, { verified: true, expires: Date.now() - 1000 })])

    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR, 200))

    await pRetry(() => {
      expect(unreachable).to.have.lengthOf(1)
    })

    expect(unreachable[0].detail.addr.toString()).to.equal(addr.toString())
    expect(service.reachable).to.deep.equal([])
    expect(service.unreachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
  })

  it('flips UNREACHABLE → REACHABLE for non-observed and emits address:reachable', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr)])

    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')

    // 8 failures → unreachable
    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR))
    await pRetry(() => { expect(unreachable).to.have.lengthOf(1) })

    // retry TTL lapses; re-probe succeeds (1 success for non-observed)
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr, { expires: Date.now() - 1000 })])

    await driveConnections(await stubResponses(1, addr, DialStatus.OK, 200))

    await pRetry(() => {
      expect(reachable).to.have.lengthOf(1)
    })

    expect(reachable[0].detail.addr.toString()).to.equal(addr.toString())
    expect(service.unreachable).to.deep.equal([])
    expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
  })

  it('emits address:removed on the next reconcile after observed UNREACHABLE (dual-fire)', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const unreachable = captureEvent('address:unreachable')
    const removed = captureEvent('address:removed')

    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR))
    await pRetry(() => { expect(unreachable).to.have.lengthOf(1) })

    expect(removed).to.have.lengthOf(0)

    // The hard-delete from observed.remove would cause the address to disappear
    // from getAddressesWithMetadata. Simulate that.
    addressManager.getAddressesWithMetadata.returns([])

    // Trigger a reconcile pass via verifyExternalAddresses (cleanup runs at the
    // start of that method). Use a fresh peer connection.
    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(100)

    await pRetry(() => {
      expect(removed).to.have.lengthOf(1)
    })

    expect(removed[0].detail.addr.toString()).to.equal(addr.toString())
    expect(service.unreachable).to.deep.equal([])
  })

  it('does not emit address:removed for transport UNREACHABLE (entry stays in AddressManager)', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr)])

    const unreachable = captureEvent('address:unreachable')
    const removed = captureEvent('address:removed')

    await driveConnections(await stubResponses(8, addr, DialStatus.E_DIAL_ERROR))
    await pRetry(() => { expect(unreachable).to.have.lengthOf(1) })

    // Transport entry stays in AddressManager (verified: false, retry TTL).
    addressManager.getAddressesWithMetadata.returns([transportEntry(addr, { verified: false, expires: Date.now() + 60_000 })])

    // Trigger a reconcile pass.
    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(100)

    expect(removed).to.have.lengthOf(0)
    expect(service.unreachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
  })

  it('emits address:removed without a prior unreachable when a reachable address disappears', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')
    const removed = captureEvent('address:removed')

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => { expect(reachable).to.have.lengthOf(1) })

    // Address is removed for an unrelated reason (relay drop, transport
    // shutdown, etc.) - no AutoNAT v2 unreachable verdict involved.
    addressManager.getAddressesWithMetadata.returns([])

    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(100)

    await pRetry(() => {
      expect(removed).to.have.lengthOf(1)
    })

    expect(removed[0].detail.addr.toString()).to.equal(addr.toString())
    expect(unreachable).to.have.lengthOf(0)
    expect(service.reachable).to.deep.equal([])
  })

  it('does not emit any event when a new address disappears before being probed', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    const reachable = captureEvent('address:reachable')
    const unreachable = captureEvent('address:unreachable')
    const removed = captureEvent('address:removed')

    // The address is removed before any verdict is reached.
    addressManager.getAddressesWithMetadata.returns([])

    const triggerConn = await stubPeerResponse({
      host: '200.0.0.1',
      messages: {}
    })
    await service.client.verifyExternalAddresses(triggerConn)
    await delay(200)

    expect(reachable).to.have.lengthOf(0)
    expect(unreachable).to.have.lengthOf(0)
    expect(removed).to.have.lengthOf(0)
  })

  it('clears verdicts state on stop without emitting events', async () => {
    const addr = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([observedEntry(addr)])

    await driveConnections(await stubResponses(4, addr, DialStatus.OK))
    await pRetry(() => {
      expect(service.reachable.map((m: Multiaddr) => m.toString())).to.deep.equal([addr.toString()])
    })

    const removed = captureEvent('address:removed')

    await stop(service)

    expect(removed).to.have.lengthOf(0)
    expect(service.reachable).to.deep.equal([])
    expect(service.unreachable).to.deep.equal([])
  })
})
