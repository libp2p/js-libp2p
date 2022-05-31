import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import drain from 'it-drain'
import first from 'it-first'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Multiaddr, protocols } from '@multiformats/multiaddr'
import { Identify } from './pb/message.js'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION
} from './consts.js'
import { codes } from '../errors.js'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { Connection, Stream } from '@libp2p/interfaces/connection'
import type { Startable } from '@libp2p/interfaces/startable'
import { peerIdFromKeys } from '@libp2p/peer-id'
import type { Components } from '@libp2p/interfaces/components'
import { TimeoutController } from 'timeout-abort-controller'
import type { AbortOptions } from '@libp2p/interfaces'
import { abortableDuplex } from 'abortable-iterator'
import type { Duplex } from 'it-stream-types'

const log = logger('libp2p:identify')

// https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L48
const IDENTIFY_TIMEOUT = 60000

// https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L52
const MAX_IDENTIFY_MESSAGE_SIZE = 1024 * 8

export interface HostProperties {
  agentVersion: string
}

export interface IdentifyServiceInit {
  /**
   * The prefix to use for the protocol (default: 'ipfs')
   */
  protocolPrefix: string

  /**
   * What details we should send as part of an identify message
   */
  host: HostProperties

  /**
   * How long we should wait for a remote peer to send their identify response
   */
  timeout?: number

  /**
   * Identify responses larger than this in bytes will be rejected (default: 8192)
   */
  maxIdentifyMessageSize?: number
}

export class IdentifyService implements Startable {
  private readonly components: Components
  private readonly identifyProtocolStr: string
  private readonly identifyPushProtocolStr: string
  private readonly host: {
    protocolVersion: string
    agentVersion: string
  }

  private readonly init: IdentifyServiceInit
  private started: boolean

  constructor (components: Components, init: IdentifyServiceInit) {
    this.components = components
    this.started = false
    this.init = init

    this.handleMessage = this.handleMessage.bind(this)

    this.identifyProtocolStr = `/${init.protocolPrefix}/${MULTICODEC_IDENTIFY_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PROTOCOL_VERSION}`
    this.identifyPushProtocolStr = `/${init.protocolPrefix}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION}`

    // Store self host metadata
    this.host = {
      protocolVersion: `${init.protocolPrefix}/${IDENTIFY_PROTOCOL_VERSION}`,
      ...init.host
    }

    // When a new connection happens, trigger identify
    this.components.getConnectionManager().addEventListener('peer:connect', (evt) => {
      const connection = evt.detail
      this.identify(connection).catch(log.error)
    })

    // When self multiaddrs change, trigger identify-push
    this.components.getPeerStore().addEventListener('change:multiaddrs', (evt) => {
      const { peerId } = evt.detail

      if (this.components.getPeerId().equals(peerId)) {
        void this.pushToPeerStore().catch(err => log.error(err))
      }
    })

    // When self protocols change, trigger identify-push
    this.components.getPeerStore().addEventListener('change:protocols', (evt) => {
      const { peerId } = evt.detail

      if (this.components.getPeerId().equals(peerId)) {
        void this.pushToPeerStore().catch(err => log.error(err))
      }
    })
  }

  isStarted () {
    return this.started
  }

  async start () {
    if (this.started) {
      return
    }

    await this.components.getPeerStore().metadataBook.setValue(this.components.getPeerId(), 'AgentVersion', uint8ArrayFromString(this.host.agentVersion))
    await this.components.getPeerStore().metadataBook.setValue(this.components.getPeerId(), 'ProtocolVersion', uint8ArrayFromString(this.host.protocolVersion))

    await this.components.getRegistrar().handle([
      this.identifyProtocolStr,
      this.identifyPushProtocolStr
    ], (data) => {
      void this.handleMessage(data)?.catch(err => {
        log.error(err)
      })
    })

    this.started = true
  }

  async stop () {
    await this.components.getRegistrar().unhandle(this.identifyProtocolStr)
    await this.components.getRegistrar().unhandle(this.identifyPushProtocolStr)

    this.started = false
  }

  /**
   * Send an Identify Push update to the list of connections
   */
  async push (connections: Connection[]): Promise<void> {
    const signedPeerRecord = await this.components.getPeerStore().addressBook.getRawEnvelope(this.components.getPeerId())
    const listenAddrs = this.components.getAddressManager().getAddresses().map((ma) => ma.bytes)
    const protocols = await this.components.getPeerStore().protoBook.get(this.components.getPeerId())

    const pushes = connections.map(async connection => {
      const timeoutController = new TimeoutController(this.init.timeout ?? IDENTIFY_TIMEOUT)
      let stream: Stream | undefined

      try {
        const data = await connection.newStream([this.identifyPushProtocolStr], {
          signal: timeoutController.signal
        })
        stream = data.stream

        // make stream abortable
        const source: Duplex<Uint8Array> = abortableDuplex(stream, timeoutController.signal)

        await pipe(
          [Identify.encode({
            listenAddrs,
            signedPeerRecord,
            protocols
          })],
          lp.encode(),
          source,
          drain
        )
      } catch (err: any) {
        // Just log errors
        log.error('could not push identify update to peer', err)
      } finally {
        if (stream != null) {
          stream.close()
        }

        timeoutController.clear()
      }
    })

    await Promise.all(pushes)
  }

  /**
   * Calls `push` on all peer connections
   */
  async pushToPeerStore () {
    // Do not try to push if we are not running
    if (!this.isStarted()) {
      return
    }

    const connections: Connection[] = []

    for (const conn of this.components.getConnectionManager().getConnections()) {
      const peerId = conn.remotePeer
      const peer = await this.components.getPeerStore().get(peerId)

      if (!peer.protocols.includes(this.identifyPushProtocolStr)) {
        continue
      }

      connections.push(conn)
    }

    await this.push(connections)
  }

  async _identify (connection: Connection, options: AbortOptions = {}): Promise<Identify> {
    const { stream } = await connection.newStream([this.identifyProtocolStr], options)
    let source: Duplex<Uint8Array> = stream
    let timeoutController
    let signal = options.signal

    // create a timeout if no abort signal passed
    if (signal == null) {
      timeoutController = new TimeoutController(this.init.timeout ?? IDENTIFY_TIMEOUT)
      signal = timeoutController.signal
    }

    // make stream abortable if AbortSignal passed
    source = abortableDuplex(stream, signal)

    try {
      const data = await pipe(
        [],
        source,
        lp.decode({
          maxDataLength: this.init.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
        }),
        async (source) => await first(source)
      )

      if (data == null) {
        throw errCode(new Error('No data could be retrieved'), codes.ERR_CONNECTION_ENDED)
      }

      try {
        return Identify.decode(data)
      } catch (err: any) {
        throw errCode(err, codes.ERR_INVALID_MESSAGE)
      }
    } finally {
      if (timeoutController != null) {
        timeoutController.clear()
      }

      stream.close()
    }
  }

  /**
   * Requests the `Identify` message from peer associated with the given `connection`.
   * If the identified peer does not match the `PeerId` associated with the connection,
   * an error will be thrown.
   */
  async identify (connection: Connection, options: AbortOptions = {}): Promise<void> {
    const message = await this._identify(connection, options)

    const {
      publicKey,
      listenAddrs,
      protocols,
      observedAddr,
      signedPeerRecord,
      agentVersion,
      protocolVersion
    } = message

    if (publicKey == null) {
      throw errCode(new Error('public key was missing from identify message'), codes.ERR_MISSING_PUBLIC_KEY)
    }

    const id = await peerIdFromKeys(publicKey)

    if (!connection.remotePeer.equals(id)) {
      throw errCode(new Error('identified peer does not match the expected peer'), codes.ERR_INVALID_PEER)
    }

    if (this.components.getPeerId().equals(id)) {
      throw errCode(new Error('identified peer is our own peer id?'), codes.ERR_INVALID_PEER)
    }

    // Get the observedAddr if there is one
    const cleanObservedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

    if (signedPeerRecord != null) {
      log('received signed peer record from %p', id)

      try {
        const envelope = await RecordEnvelope.openAndCertify(signedPeerRecord, PeerRecord.DOMAIN)

        if (!envelope.peerId.equals(id)) {
          throw errCode(new Error('identified peer does not match the expected peer'), codes.ERR_INVALID_PEER)
        }

        if (await this.components.getPeerStore().addressBook.consumePeerRecord(envelope)) {
          await this.components.getPeerStore().protoBook.set(id, protocols)

          if (agentVersion != null) {
            await this.components.getPeerStore().metadataBook.setValue(id, 'AgentVersion', uint8ArrayFromString(agentVersion))
          }

          if (protocolVersion != null) {
            await this.components.getPeerStore().metadataBook.setValue(id, 'ProtocolVersion', uint8ArrayFromString(protocolVersion))
          }

          log('identify completed for peer %p and protocols %o', id, protocols)

          return
        }
      } catch (err: any) {
        log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
      }
    } else {
      log('no signed peer record received from %p', id)
    }

    log('falling back to legacy addresses from %p', id)

    // LEGACY: Update peers data in PeerStore
    try {
      await this.components.getPeerStore().addressBook.set(id, listenAddrs.map((addr) => new Multiaddr(addr)))
    } catch (err: any) {
      log.error('received invalid addrs', err)
    }

    await this.components.getPeerStore().protoBook.set(id, protocols)

    if (agentVersion != null) {
      await this.components.getPeerStore().metadataBook.setValue(id, 'AgentVersion', uint8ArrayFromString(agentVersion))
    }

    if (protocolVersion != null) {
      await this.components.getPeerStore().metadataBook.setValue(id, 'ProtocolVersion', uint8ArrayFromString(protocolVersion))
    }

    log('identify completed for peer %p and protocols %o', id, protocols)

    // TODO: Add and score our observed addr
    log('received observed address of %s', cleanObservedAddr?.toString())
    // this.components.getAddressManager().addObservedAddr(observedAddr)
  }

  /**
   * A handler to register with Libp2p to process identify messages
   */
  handleMessage (data: IncomingStreamData) {
    const { protocol } = data

    switch (protocol) {
      case this.identifyProtocolStr:
        return this._handleIdentify(data)
      case this.identifyPushProtocolStr:
        return this._handlePush(data)
      default:
        log.error('cannot handle unknown protocol %s', protocol)
    }
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   */
  async _handleIdentify (data: IncomingStreamData) {
    const { connection, stream } = data
    const timeoutController = new TimeoutController(this.init.timeout ?? IDENTIFY_TIMEOUT)

    try {
      const publicKey = this.components.getPeerId().publicKey ?? new Uint8Array(0)
      const peerData = await this.components.getPeerStore().get(this.components.getPeerId())
      const multiaddrs = this.components.getAddressManager().getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      let signedPeerRecord = peerData.peerRecordEnvelope

      if (multiaddrs.length > 0 && signedPeerRecord == null) {
        const peerRecord = new PeerRecord({
          peerId: this.components.getPeerId(),
          multiaddrs
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.components.getPeerId())
        await this.components.getPeerStore().addressBook.consumePeerRecord(envelope)
        signedPeerRecord = envelope.marshal()
      }

      const message = Identify.encode({
        protocolVersion: this.host.protocolVersion,
        agentVersion: this.host.agentVersion,
        publicKey,
        listenAddrs: multiaddrs.map(addr => addr.bytes),
        signedPeerRecord,
        observedAddr: connection.remoteAddr.bytes,
        protocols: peerData.protocols
      })

      // make stream abortable
      const source: Duplex<Uint8Array> = abortableDuplex(stream, timeoutController.signal)

      await pipe(
        [message],
        lp.encode(),
        source,
        drain
      )
    } catch (err: any) {
      log.error('could not respond to identify request', err)
    } finally {
      stream.close()
      timeoutController.clear()
    }
  }

  /**
   * Reads the Identify Push message from the given `connection`
   */
  async _handlePush (data: IncomingStreamData) {
    const { connection, stream } = data
    const timeoutController = new TimeoutController(this.init.timeout ?? IDENTIFY_TIMEOUT)

    let message: Identify | undefined
    try {
      // make stream abortable
      const source: Duplex<Uint8Array> = abortableDuplex(stream, timeoutController.signal)

      const data = await pipe(
        [],
        source,
        lp.decode({
          maxDataLength: this.init.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
        }),
        async (source) => await first(source)
      )

      if (data != null) {
        message = Identify.decode(data)
      }
    } catch (err: any) {
      return log.error('received invalid message', err)
    } finally {
      stream.close()
      timeoutController.clear()
    }

    if (message == null) {
      return log.error('received invalid message')
    }

    const id = connection.remotePeer

    if (this.components.getPeerId().equals(id)) {
      log('received push from ourselves?')
      return
    }

    log('received push from %p', id)

    if (message.signedPeerRecord != null) {
      log('received signedPeerRecord in push')

      try {
        const envelope = await RecordEnvelope.openAndCertify(message.signedPeerRecord, PeerRecord.DOMAIN)

        if (await this.components.getPeerStore().addressBook.consumePeerRecord(envelope)) {
          log('consumed signedPeerRecord sent in push')

          await this.components.getPeerStore().protoBook.set(id, message.protocols)
          return
        } else {
          log('failed to consume signedPeerRecord sent in push')
        }
      } catch (err: any) {
        log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
      }
    } else {
      log('did not receive signedPeerRecord in push')
    }

    // LEGACY: Update peers data in PeerStore
    try {
      await this.components.getPeerStore().addressBook.set(id,
        message.listenAddrs.map((addr) => new Multiaddr(addr)))
    } catch (err: any) {
      log.error('received invalid addrs', err)
    }

    // Update the protocols
    try {
      await this.components.getPeerStore().protoBook.set(id, message.protocols)
    } catch (err: any) {
      log.error('received invalid protocols', err)
    }

    log('handled push from %p', id)
  }

  /**
   * Takes the `addr` and converts it to a Multiaddr if possible
   */
  static getCleanMultiaddr (addr: Uint8Array | string | null | undefined) {
    if (addr != null && addr.length > 0) {
      try {
        return new Multiaddr(addr)
      } catch {

      }
    }
  }
}

/**
 * The protocols the IdentifyService supports
 */
export const multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}

export const Message = { Identify }
