import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { AutoNATv2Service } from '../src/autonat.ts'
import { PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION } from '../src/constants.ts'
import { DialBack, DialBackResponse, DialResponse, DialStatus, Message } from '../src/pb/index.ts'
import type { AutoNATv2Components, AutoNATv2ServiceInit } from '../src/index.ts'
import type { Connection, Stream, PeerId, PeerStore } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar } from '@libp2p/interface-internal'
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

describe('autonat v2 - server', () => {
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
        },
        abort: (err) => {
          void sink.throw(err)
        },
        close: async () => {
          sink.end()
        }
      }
      const connection = {
        ...stubInterface<Connection>(),
        remotePeer,
        remoteAddr
      }

      const nonce = 12345n

      // we might open a new connection
      const newConnection = stubInterface<Connection>()
      newConnection.remotePeer = remotePeer
      newConnection.remoteAddr = remoteAddr
      newConnection.newStream.withArgs(`/${PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}/dial-back`).callsFake(async () => {
        const dialBackMessage = Promise.withResolvers<DialBack>()

        // stub autonat protocol stream
        const stream = stubInterface<Stream>({
          source: (async function * () {
            const message = await dialBackMessage.promise

            expect(message.nonce).to.equal(nonce)

            yield lp.encode.single(DialBackResponse.encode({
              status: DialBackResponse.DialBackStatus.OK
            }))
          }()),
          sink: async (source) => {
            for await (const buf of lp.decode(source)) {
              dialBackMessage.resolve(DialBack.decode(buf))
            }
          }
        })

        return stream
      })

      if (opts.canDial === false) {
        connectionManager.isDialable.resolves(false)
      } else if (opts.canDial === true) {
        connectionManager.isDialable.resolves(true)
        connectionManager.openConnection.resolves(newConnection)
      }

      let buf: Uint8Array | undefined

      if (opts.message instanceof Uint8Array) {
        buf = opts.message
      } else if (opts.message == null) {
        buf = Message.encode({
          dialRequest: {
            nonce,
            addrs: [
              observedAddress.bytes
            ]
          }
        })
      } else if (opts.message !== false && opts.message !== true) {
        buf = Message.encode(opts.message)
      }

      if (buf != null) {
        source.push(lp.encode.single(buf))
      }

      source.end()

      await service.server.handleDialRequestStream({
        stream,
        connection
      })

      const slice = await pipe(
        sink,
        (source) => lp.decode(source),
        async source => all(source)
      )

      if (slice.length !== 1) {
        throw new Error('Response was not length encoded')
      }

      const message = Message.decode(slice[0])

      if (message.dialResponse?.status === DialResponse.ResponseStatus.OK) {
        expect(newConnection.close.called).to.be.true('Did not close connection after dial')
      }

      return message
    }

    it('should dial a requested address', async () => {
      const message = await stubIncomingStream({
        canDial: true
      })

      expect(message).to.have.nested.property('dialResponse.status', DialResponse.ResponseStatus.OK)
      expect(message).to.have.nested.property('dialResponse.dialStatus', DialStatus.OK)
    })

    it('should expect a dial message', async () => {
      await expect(stubIncomingStream({
        message: {}
      })).to.eventually.be.rejected
        .with.property('name', 'ProtocolError')
    })

    it('should reject a message with a dial response', async () => {
      const observedAddress = multiaddr('/ip4/124.124.124.124/tcp/28319')
      await expect(stubIncomingStream({
        observedAddress,
        message: {
          dialResponse: {
            status: DialResponse.ResponseStatus.OK,
            addrIdx: 0,
            dialStatus: DialStatus.OK
          }
        }
      })).to.eventually.be.rejected
        .with.property('name', 'ProtocolError')
    })

    it('should reject a message with a dial data request', async () => {
      const observedAddress = multiaddr('/ip4/124.124.124.124/tcp/28319')
      await expect(stubIncomingStream({
        observedAddress,
        message: {
          dialDataRequest: {
            addrIdx: 0,
            numBytes: 100n
          }
        }
      })).to.eventually.be.rejected
        .with.property('name', 'ProtocolError')
    })

    it('should reject a message with a dial data response', async () => {
      const observedAddress = multiaddr('/ip4/124.124.124.124/tcp/28319')
      await expect(stubIncomingStream({
        observedAddress,
        message: {
          dialDataResponse: {
            data: new Uint8Array(100)
          }
        }
      })).to.eventually.be.rejected
        .with.property('name', 'ProtocolError')
    })

    it('should fail to dial a requested address when it arrives via a relay', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const requestingPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      const message = await stubIncomingStream({
        remotePeer,
        remoteAddr: multiaddr(`/ip4/223.223.223.223/tcp/27132/p2p/${remotePeer.toString()}/p2p-circuit/p2p/${requestingPeer.toString()}`),
        requestingPeer
      })

      expect(message).to.have.nested.property('dialResponse.status', DialResponse.ResponseStatus.E_DIAL_REFUSED)
    })

    it('should request data when address is from a different host', async () => {
      const requestingPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const observedAddress = multiaddr('/ip4/20.20.20.10/tcp/27132')
      const remoteAddr = multiaddr(`/ip4/129.129.129.129/tcp/27132/p2p/${requestingPeer.toString()}`)

      const message = await stubIncomingStream({
        requestingPeer,
        remoteAddr,
        observedAddress,
        canDial: true
      })

      expect(message).to.have.nested.property('dialDataRequest.numBytes').that.is.a('BigInt')
    })

    it('should refuse to dial a requested address when it is on an unsupported transport', async () => {
      const message = await stubIncomingStream({
        transportSupported: false
      })

      expect(message).to.have.nested.property('dialResponse.status', DialResponse.ResponseStatus.E_DIAL_REFUSED)
    })

    it('should error when dialing a requested address', async () => {
      const message = await stubIncomingStream({
        canDial: false
      })

      expect(message).to.have.nested.property('dialResponse.status', DialResponse.ResponseStatus.E_DIAL_REFUSED)
      expect(message).to.have.nested.property('dialResponse.dialStatus', DialStatus.UNUSED)
    })
  })
})
