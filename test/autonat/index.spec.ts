/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { start, stop } from '@libp2p/interfaces/startable'
import { AutonatService, AutonatServiceInit } from '../../src/autonat/index.js'
import { StubbedInstance, stubInterface } from 'sinon-ts'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import type { Registrar } from '@libp2p/interface-registrar'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { Connection, Stream } from '@libp2p/interface-connection'
import { PROTOCOL } from '../../src/autonat/constants.js'
import { Message } from '../../src/autonat/pb/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { pushable } from 'it-pushable'
import type { Transport, TransportManager } from '@libp2p/interface-transport'
import type { AddressBook, PeerStore } from '@libp2p/interface-peer-store'
import type { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import * as lp from 'it-length-prefixed'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { Components, DefaultComponents } from '../../src/components.js'
import { Uint8ArrayList } from 'uint8arraylist'
import type { PeerInfo } from '@libp2p/interface-peer-info'

const defaultInit: AutonatServiceInit = {
  protocolPrefix: 'libp2p',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  timeout: 100,
  startupDelay: 120000,
  refreshInterval: 120000
}

describe('autonat', () => {
  let service: AutonatService
  let components: Components
  let peerRouting: StubbedInstance<PeerRouting>
  let registrar: StubbedInstance<Registrar>
  let addressManager: StubbedInstance<AddressManager>
  let connectionManager: StubbedInstance<DefaultConnectionManager>
  let transportManager: StubbedInstance<TransportManager>
  let peerStore: StubbedInstance<PeerStore>

  beforeEach(async () => {
    peerRouting = stubInterface<PeerRouting>()
    registrar = stubInterface<Registrar>()
    addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([])

    connectionManager = stubInterface<DefaultConnectionManager>()
    transportManager = stubInterface<TransportManager>()
    peerStore = stubInterface<PeerStore>()
    peerStore.addressBook = stubInterface<AddressBook>()

    components = new DefaultComponents({
      peerId: await createEd25519PeerId(),
      peerRouting,
      registrar,
      addressManager,
      connectionManager,
      transportManager,
      peerStore
    })

    service = new AutonatService(components, defaultInit)

    await start(components)
    await start(service)
  })

  afterEach(async () => {
    sinon.restore()

    await stop(service)
    await stop(components)
  })

  describe('verify our observed addresses', () => {
    async function stubPeerResponse (host: string, dialResponse: Message.DialResponse, peerId?: PeerId): Promise<PeerInfo> {
      // stub random peer lookup
      const peer = {
        id: peerId ?? await createEd25519PeerId(),
        multiaddrs: [],
        protocols: []
      }

      // stub connection to remote peer
      const connection = stubInterface<Connection>()
      connection.remoteAddr = multiaddr(`/ip4/${host}/tcp/28319/p2p/${peer.id.toString()}`)
      connectionManager.openConnection.withArgs(peer.id).resolves(connection)

      // stub autonat protocol stream
      const stream = stubInterface<Stream>()
      connection.newStream.withArgs(PROTOCOL).resolves(stream)

      // stub autonat response
      const response = Message.encode({
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse
      })
      stream.source = (async function * () {
        yield lp.encode.single(response)
      }())
      stream.sink.returns(Promise.resolve())

      return peer
    }

    it('should request peers verify our observed address', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      // The network says OK
      const peers = [
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

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.confirmObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not confirm observed multiaddr')
    })

    it('should mark observed address as low confidence when dialing fails', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      // The network says ERROR
      const peers = [
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
        })
      ]

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.removeObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not verify external multiaddr')
    })

    it('should ignore non error or success statuses', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      // Mix of responses, mostly OK
      const peers = [
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

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.confirmObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not confirm external multiaddr')

      expect(connectionManager.openConnection.callCount)
        .to.equal(peers.length, 'Did not open connections to all peers')
    })

    it('should require confirmation from diverse networks', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      // an attacker says OK, the rest of the network says ERROR
      const peers = [
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
        })
      ]

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.removeObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not verify external multiaddr')

      expect(connectionManager.openConnection.callCount)
        .to.equal(peers.length, 'Did not open connections to all peers')
    })

    it('should require confirmation from diverse peers', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      const peerId = await createEd25519PeerId()

      // an attacker says OK, the rest of the network says ERROR
      const peers = [
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
        })
      ]

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.removeObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not verify external multiaddr')

      expect(connectionManager.openConnection.callCount)
        .to.equal(peers.length, 'Did not open connections to all peers')
    })

    it('should only accept observed addresses', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      const reportedAddress = multiaddr('/ip4/100.100.100.100/tcp/28319')

      // our observed addresses
      addressManager.getObservedAddrs.returns([observedAddress])

      // an attacker says OK, the rest of the network says ERROR
      const peers = [
        await stubPeerResponse('124.124.124.124', {
          status: Message.ResponseStatus.OK,
          addr: reportedAddress.bytes
        }),
        await stubPeerResponse('125.124.124.125', {
          status: Message.ResponseStatus.OK,
          addr: reportedAddress.bytes
        }),
        await stubPeerResponse('126.124.124.126', {
          status: Message.ResponseStatus.OK,
          addr: reportedAddress.bytes
        }),
        await stubPeerResponse('127.124.124.127', {
          status: Message.ResponseStatus.OK,
          addr: reportedAddress.bytes
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

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      await service.verifyExternalAddresses()

      expect(addressManager.removeObservedAddr.calledWith(observedAddress))
        .to.be.true('Did not verify external multiaddr')

      expect(connectionManager.openConnection.callCount)
        .to.equal(peers.length, 'Did not open connections to all peers')
    })

    it('should time out when verifying an observed address', async () => {
      const observedAddress = multiaddr('/ip4/123.123.123.123/tcp/28319')
      addressManager.getObservedAddrs.returns([observedAddress])

      // The network says OK
      const peers = [
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

      peerRouting.getClosestPeers.returns(async function * () {
        yield * peers
      }())

      connectionManager.openConnection.reset()
      connectionManager.openConnection.callsFake(async (peer, options = {}) => {
        return await Promise.race<Connection>([
          new Promise<Connection>((resolve, reject) => {
            options.signal?.addEventListener('abort', () => {
              reject(new Error('Dial aborted!'))
            })
          }),
          new Promise<Connection>((resolve, reject) => {
            // longer than the timeout
            setTimeout(() => {
              reject(new Error('Dial Timeout!'))
            }, 1000)
          })
        ])
      })

      await service.verifyExternalAddresses()

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
      const requestingPeer = opts.requestingPeer ?? await createEd25519PeerId()
      const remotePeer = opts.remotePeer ?? requestingPeer
      const observedAddress = opts.observedAddress ?? multiaddr('/ip4/124.124.124.124/tcp/28319')
      const remoteAddr = opts.remoteAddr ?? observedAddress.encapsulate(`/p2p/${remotePeer.toString()}`)
      const source = pushable<Uint8ArrayList>()
      const sink = pushable<Uint8ArrayList>()
      const stream: Stream = {
        ...stubInterface<Stream>(),
        source,
        sink: async (stream) => {
          for await (const buf of stream) {
            sink.push(new Uint8ArrayList(buf))
          }

          sink.end()
        }
      }
      const connection = {
        ...stubInterface<Connection>(),
        remotePeer,
        remoteAddr
      }

      // we might support this transport
      transportManager.transportForMultiaddr.withArgs(observedAddress)
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

      let buf: Uint8Array | undefined

      if (opts.message instanceof Uint8Array) {
        buf = opts.message
      } else if (opts.message == null) {
        buf = Message.encode({
          type: Message.MessageType.DIAL,
          dial: {
            peer: {
              id: requestingPeer.toBytes(),
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
        source.push(lp.encode.single(buf))
      }

      source.end()

      await service.handleIncomingAutonatStream({
        stream,
        connection
      })

      const slice = await pipe(
        sink,
        (source) => lp.decode(source),
        async source => await all(source)
      )

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

    it('should expect a message', async () => {
      const message = await stubIncomingStream({
        message: false
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'No message was sent')
    })

    it('should expect a valid message', async () => {
      const message = await stubIncomingStream({
        message: Uint8Array.from([3, 2, 1, 0])
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_BAD_REQUEST)
      expect(message).to.have.nested.property('dialResponse.statusText', 'Could not decode message')
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
      const remotePeer = await createEd25519PeerId()
      const requestingPeer = await createEd25519PeerId()

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
      const requestingPeer = await createEd25519PeerId()
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

    it('should time out when dialing a requested address', async () => {
      connectionManager.openConnection.callsFake(async function (ma, options = {}) {
        return await Promise.race<Connection>([
          new Promise<Connection>((resolve, reject) => {
            options.signal?.addEventListener('abort', () => {
              reject(new Error('Dial aborted!'))
            })
          }),
          new Promise<Connection>((resolve, reject) => {
            // longer than the timeout
            setTimeout(() => {
              reject(new Error('Dial Timeout!'))
            }, 1000)
          })
        ])
      })

      const message = await stubIncomingStream({
        canDial: undefined
      })

      expect(message).to.have.property('type', Message.MessageType.DIAL_RESPONSE)
      expect(message).to.have.nested.property('dialResponse.status', Message.ResponseStatus.E_DIAL_ERROR)
      expect(message).to.have.nested.property('dialResponse.statusText', 'Dial aborted!')
    })
  })
})
