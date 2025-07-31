/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair } from '@libp2p/test-utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { TypedEventEmitter } from 'main-event'
import pRetry from 'p-retry'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { AutoNATService } from '../src/autonat.js'
import { PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION } from '../src/constants.js'
import { Message } from '../src/pb/index.js'
import type { AutoNATComponents, AutoNATServiceInit } from '../src/index.js'
import type { Connection, PeerId, Transport, Libp2pEvents, PeerStore, Peer } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { StubbedInstance } from 'sinon-ts'

const defaultInit: AutoNATServiceInit = {
  protocolPrefix: 'libp2p',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  timeout: 100,
  startupDelay: 120000,
  refreshInterval: 120000
}

describe('autonat', () => {
  let service: any
  let components: AutoNATComponents
  let randomWalk: StubbedInstance<RandomWalk>
  let registrar: StubbedInstance<Registrar>
  let addressManager: StubbedInstance<AddressManager>
  let connectionManager: StubbedInstance<ConnectionManager>
  let transportManager: StubbedInstance<TransportManager>
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
    transportManager = stubInterface<TransportManager>()
    peerStore = stubInterface<PeerStore>()

    components = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      logger: defaultLogger(),
      randomWalk,
      registrar,
      addressManager,
      connectionManager,
      transportManager,
      events: new TypedEventEmitter<Libp2pEvents>(),
      peerStore
    }

    service = new AutoNATService(components, defaultInit)

    await start(components)
    await start(service)
  })

  afterEach(async () => {
    sinon.restore()

    await stop(service)
    await stop(components)
  })

  describe('verify our observed addresses', () => {
    async function stubPeerResponse (host: string, dialResponse: Message.DialResponse, peerId?: PeerId): Promise<Connection> {
      // stub random peer lookup
      const peer: Peer = {
        id: peerId ?? peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        addresses: [{
          multiaddr: multiaddr(`/ip4/${host}/tcp/28319`),
          isCertified: true
        }],
        protocols: [],
        metadata: new Map(),
        tags: new Map()
      }

      peerStore.get.withArgs(peer.id).resolves(peer)

      // stub connection to remote peer
      const connection = stubInterface<Connection>()
      connection.remoteAddr = multiaddr(`/ip4/${host}/tcp/28319/p2p/${peer.id.toString()}`)
      connection.remotePeer = peer.id
      connectionManager.openConnection.withArgs(peer.id).resolves(connection)

      const [outgoingStream, incomingStream] = await streamPair()

      // stub autonat protocol stream
      connection.newStream.withArgs(`/${PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`).resolves(outgoingStream)

      // stub autonat response
      const response = Message.encode({
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse
      })

      incomingStream.addEventListener('message', async (evt) => {
        incomingStream.send(lp.encode.single(response))
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('125.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('126.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.OK
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('125.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('126.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.OK
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('125.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('126.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('128.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('129.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('130.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('131.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('125.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('126.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('128.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_REFUSED
        }),
        await stubPeerResponse('129.124.124.124', {
          status: Message.ResponseStatus.E_INTERNAL_ERROR
        }),
        await stubPeerResponse('139.124.124.124', {
          status: Message.ResponseStatus.OK
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('124.124.124.125', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('124.124.124.126', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('124.124.124.127', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('128.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('129.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('130.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('131.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('132.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('133.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('134.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }, peerId),
        await stubPeerResponse('125.124.124.125', {
          status: Message.ResponseStatus.OK
        }, peerId),
        await stubPeerResponse('126.124.124.126', {
          status: Message.ResponseStatus.OK
        }, peerId),
        await stubPeerResponse('127.124.124.127', {
          status: Message.ResponseStatus.OK
        }, peerId),
        await stubPeerResponse('128.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('129.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('130.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('131.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('132.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('133.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('134.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        }),
        await stubPeerResponse('135.124.124.124', {
          status: Message.ResponseStatus.E_DIAL_ERROR
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
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
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('125.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('126.124.124.124', {
          status: Message.ResponseStatus.OK
        }),
        await stubPeerResponse('127.124.124.124', {
          status: Message.ResponseStatus.OK
        })
      ]

      for (const conn of connections) {
        await service.verifyExternalAddresses(conn)
        await delay(100)
      }

      expect(addressManager.addObservedAddr.called)
        .to.be.false('Verify external multiaddr when we should have timed out')
    })
  })

  describe('verify others observed addresses', () => {
    async function stubIncomingStream (opts: {
      requestingPeer?: PeerId
      remotePeer?: PeerId
      observedAddress?: Multiaddr
      remoteAddr?: Multiaddr
      message?: Message | Uint8Array | boolean
      transportSupported?: boolean
      canDial?: boolean
    } = {}): Promise<Message> {
      const requestingPeer = opts.requestingPeer ?? peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const remotePeer = opts.remotePeer ?? requestingPeer
      const observedAddress = opts.observedAddress ?? multiaddr('/ip4/124.124.124.124/tcp/28319')
      const remoteAddr = opts.remoteAddr ?? observedAddress.encapsulate(`/p2p/${remotePeer.toString()}`)
      const connection = stubInterface<Connection>({
        remotePeer,
        remoteAddr
      })
      const [outgoingStream, incomingStream] = await streamPair()

      // we might support this transport
      transportManager.dialTransportForMultiaddr.withArgs(observedAddress)
        .returns(opts.transportSupported === false ? undefined : stubInterface<Transport>())

      // we might open a new connection
      const newConnection = stubInterface<Connection>()
      newConnection.remotePeer = remotePeer
      newConnection.remoteAddr = remoteAddr

      if (opts.canDial === false) {
        connectionManager.openConnection.rejects(new Error('Could not dial'))
      } else if (opts.canDial === true) {
        connectionManager.openConnection.resolves(newConnection)
      }

      let buf: Uint8Array | Uint8ArrayList | undefined

      if (opts.message instanceof Uint8Array) {
        buf = opts.message
      } else if (opts.message == null) {
        buf = Message.encode({
          type: Message.MessageType.DIAL,
          dial: {
            peer: {
              id: requestingPeer.toMultihash().bytes,
              addrs: [
                observedAddress.bytes
              ]
            }
          }
        })
      } else if (opts.message !== false && opts.message !== true) {
        buf = Message.encode(opts.message)
      }

      if (buf != null) {
        outgoingStream.send(lp.encode.single(buf))
      }

      outgoingStream.closeWrite()

      const messagesPromise = pipe(
        outgoingStream,
        (source) => lp.decode(source),
        async source => all(source)
      )

      await service.handleIncomingAutonatStream(incomingStream, connection)

      const slice = await messagesPromise

      if (slice.length !== 1) {
        throw new Error('Response was not length encoded')
      }

      const message = Message.decode(slice[0])

      if (message.dialResponse?.status === Message.ResponseStatus.OK) {
        expect(newConnection.close.called).to.be.true('Did not close connection after dial')
      }

      return message
    }

    it('should dial a requested address', async () => {
      const message = await stubIncomingStream({
        canDial: true
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.OK)
    })

    it('should expect a dial message', async () => {
      const message = await stubIncomingStream({
        message: {}
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'No Dial message found in message')
    })

    it('should expect a message with a peer id', async () => {
      const observedAddress = multiaddr('/ip4/124.124.124.124/tcp/28319')
      const message = await stubIncomingStream({
        observedAddress,
        message: {
          type: Message.MessageType.DIAL,
          dial: {
            peer: {
              addrs: [
                observedAddress.bytes
              ]
            }
          }
        }
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'missing peer info')
    })

    it('should expect a message with a valid peer id', async () => {
      const observedAddress = multiaddr('/ip4/124.124.124.124/tcp/28319')
      const message = await stubIncomingStream({
        observedAddress,
        message: {
          type: Message.MessageType.DIAL,
          dial: {
            peer: {
              id: Uint8Array.from([0, 1, 2, 3]),
              addrs: [
                observedAddress.bytes
              ]
            }
          }
        }
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'bad peer id')
    })

    it('should fail to dial a requested address when it arrives via a relay', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const requestingPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      const message = await stubIncomingStream({
        remotePeer,
        remoteAddr: multiaddr(`/ip4/223.223.223.223/tcp/27132/p2p/${remotePeer.toString()}/p2p-circuit/p2p/${requestingPeer.toString()}`),
        requestingPeer
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'peer id mismatch')
    })

    it('should refuse to dial a requested address when it is from a different host', async () => {
      const requestingPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const observedAddress = multiaddr('/ip4/10.10.10.10/tcp/27132')
      const remoteAddr = multiaddr(`/ip4/129.129.129.129/tcp/27132/p2p/${requestingPeer.toString()}`)

      const message = await stubIncomingStream({
        requestingPeer,
        remoteAddr,
        observedAddress
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_DIAL_REFUSED)
      expect(message).to.have.nested.property('dialResponse.statusText', 'no dialable addresses')
    })

    it('should refuse to dial a requested address when it is on an unsupported transport', async () => {
      const message = await stubIncomingStream({
        transportSupported: false
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_DIAL_REFUSED)
      expect(message).to.have.nested.property('dialResponse.statusText', 'no dialable addresses')
    })

    it('should error when to dialing a requested address', async () => {
      const message = await stubIncomingStream({
        canDial: false
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_DIAL_ERROR)
      expect(message).to.have.nested.property('dialResponse.statusText', 'Could not dial')
    })
  })
})
