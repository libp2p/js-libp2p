/* eslint-env mocha */

import type { AddressManager } from '@libp2p/interface-address-manager'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Connection } from '@libp2p/interface-connection'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import { mockStream } from '@libp2p/interface-mocks'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Registrar, StreamHandler } from '@libp2p/interface-registrar'
import type { Transport, TransportManager, Upgrader } from '@libp2p/interface-transport'
import { isStartable } from '@libp2p/interfaces/startable'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { pbStream, MessageStream } from 'it-pb-stream'
import { stubInterface } from 'sinon-ts'
import { circuitRelayTransport } from '../../src/circuit/index.js'
import { Status, StopMessage } from '../../src/circuit/pb/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { duplexPair } from 'it-pair/duplex'

describe('circuit-relay stop protocol', function () {
  let transport: Transport
  let handler: StreamHandler
  let pbstr: MessageStream<StopMessage>
  let sourcePeer: PeerId

  beforeEach(async () => {
    const components = {
      addressManager: stubInterface<AddressManager>(),
      connectionManager: stubInterface<ConnectionManager>(),
      contentRouting: stubInterface<ContentRouting>(),
      peerId: await createEd25519PeerId(),
      peerStore: stubInterface<PeerStore>(),
      registrar: stubInterface<Registrar>(),
      transportManager: stubInterface<TransportManager>(),
      upgrader: stubInterface<Upgrader>()
    }

    transport = circuitRelayTransport({})(components)

    if (isStartable(transport)) {
      await transport.start()
    }

    sourcePeer = await createEd25519PeerId()

    handler = components.registrar.handle.getCall(0).args[1]

    const [localStream, remoteStream] = duplexPair<any>()

    handler({
      stream: mockStream(remoteStream),
      connection: stubInterface<Connection>()
    })

    pbstr = pbStream(localStream).pb(StopMessage)
  })

  this.afterEach(async function () {
    if (isStartable(transport)) {
      await transport.stop()
    }
  })

  it('handle stop - success', async function () {
    pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    pbstr.write({
      type: StopMessage.Type.STATUS,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    pbstr.write({
      type: StopMessage.Type.CONNECT
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: [
          new Uint8Array(32)
        ]
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })
})
