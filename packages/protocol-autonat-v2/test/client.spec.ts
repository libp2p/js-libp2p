/* eslint max-depth: ["error", 5] */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair } from '@libp2p/test-utils'
import { pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pRetry from 'p-retry'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { AutoNATv2Service } from '../src/autonat.ts'
import { PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION } from '../src/constants.ts'
import { DialResponse, DialStatus, Message } from '../src/pb/index.ts'
import type { AutoNATv2Components, AutoNATv2ServiceInit } from '../src/index.ts'
import type { Connection, PeerId, PeerStore, Peer } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar } from '@libp2p/interface-internal'
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

describe('autonat v2 - client', () => {
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
    // stub random peer lookup
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

    // stub connection to remote peer
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

          if (response.dialDataRequest != null) {
            // read data requests
            for (let read = 0; read < response.dialDataRequest.numBytes;) {
              const message = await messages.read()

              if (message.dialDataResponse == null) {
                throw new Error('Incorrect message type')
              }

              read += message.dialDataResponse.data.byteLength
            }
          }
        }
      }

      await incomingStream.closeWrite()
    })

    return connection
  }

  it('should request peers verify our observed address', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    // The network says OK
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.confirmObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.confirmObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not confirm observed multiaddr')
  })

  it('should request peers re-verify our observed address', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: true,
      type: 'observed',
      expires: Date.now() - 1000
    }])

    // The network says OK
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.confirmObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.confirmObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not confirm observed multiaddr')
  })

  it('should mark observed address as low confidence when dialing fails', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    // The network says ERROR
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '128.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '129.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '130.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '131.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.removeObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.removeObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not verify external multiaddr')
  })

  it('should ignore non error or success statuses', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    // Mix of responses, mostly OK
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '128.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_BACK_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '129.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.E_INTERNAL_ERROR,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '130.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.E_REQUEST_REJECTED,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '131.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.confirmObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.confirmObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not confirm external multiaddr')
  })

  it('should require confirmation from diverse networks', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    // an attacker says OK, the rest of the network says ERROR
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '124.124.124.125',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '124.124.124.126',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '124.124.124.126',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '128.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '129.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.E_INTERNAL_ERROR,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '130.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.E_REQUEST_REJECTED,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '131.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '132.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '133.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '134.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.removeObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.removeObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not verify external multiaddr')
  })

  it('should require confirmation from diverse peers', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // an attacker says OK, the rest of the network says ERROR
    const connections = [
      await stubPeerResponse({
        peerId,
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        peerId,
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        peerId,
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        peerId,
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '128.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '129.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '130.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '131.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '132.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '133.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '134.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '135.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.E_DIAL_ERROR
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    await pRetry(() => {
      expect(addressManager.removeObservedAddr).to.have.property('called', true)
    })

    expect(addressManager.removeObservedAddr.calledWith(observedAddress))
      .to.be.true('Did not verify external multiaddr')
  })

  it('should time out when verifying an observed address', async () => {
    const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
    addressManager.getAddressesWithMetadata.returns([{
      multiaddr: observedAddress,
      verified: false,
      type: 'observed',
      expires: 0
    }])

    // The network says OK
    const connections = [
      await stubPeerResponse({
        host: '124.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '125.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '126.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      }),
      await stubPeerResponse({
        host: '127.124.124.124',
        messages: {
          [observedAddress.toString()]: {
            dialResponse: {
              addrIdx: 0,
              status: DialResponse.ResponseStatus.OK,
              dialStatus: DialStatus.OK
            }
          }
        }
      })
    ]

    for (const conn of connections) {
      await service.client.verifyExternalAddresses(conn)
      await delay(100)
    }

    expect(addressManager.addObservedAddr.called)
      .to.be.false('Verify external multiaddr when we should have timed out')
  })
})
