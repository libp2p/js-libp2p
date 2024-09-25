/* eslint-disable complexity */

import { publicKeyFromProtobuf, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidMessageError, UnsupportedProtocolError, serviceCapabilities, setMaxListeners } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { isPrivateIp } from '@libp2p/utils/private-ip'
import { protocols } from '@multiformats/multiaddr'
import { IP_OR_DOMAIN } from '@multiformats/multiaddr-matcher'
import { pbStream } from 'it-protobuf-stream'
import {
  MULTICODEC_IDENTIFY_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PROTOCOL_VERSION
} from './consts.js'
import { Identify as IdentifyMessage } from './pb/message.js'
import { AbstractIdentify, consumeIdentifyMessage, defaultValues, getCleanMultiaddr } from './utils.js'
import type { Identify as IdentifyInterface, IdentifyComponents, IdentifyInit } from './index.js'
import type { IdentifyResult, AbortOptions, Connection, Stream, Startable } from '@libp2p/interface'
import type { IncomingStreamData } from '@libp2p/interface-internal'

export class Identify extends AbstractIdentify implements Startable, IdentifyInterface {
  constructor (components: IdentifyComponents, init: IdentifyInit = {}) {
    super(components, {
      ...init,
      protocol: `/${init.protocolPrefix ?? defaultValues.protocolPrefix}/${MULTICODEC_IDENTIFY_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PROTOCOL_VERSION}`,
      log: components.logger.forComponent('libp2p:identify')
    })

    if (init.runOnConnectionOpen ?? defaultValues.runOnConnectionOpen) {
      // When a new connection happens, trigger identify
      components.events.addEventListener('connection:open', (evt) => {
        const connection = evt.detail
        this.identify(connection)
          .catch(err => {
            if (err.name === UnsupportedProtocolError.name) {
              // the remote did not support identify, ignore the error
              return
            }

            this.log.error('error during identify trigged by connection:open', err)
          })
      })
    }
  }

  [serviceCapabilities]: string[] = [
    '@libp2p/identify'
  ]

  async _identify (connection: Connection, options: AbortOptions = {}): Promise<IdentifyMessage> {
    let stream: Stream | undefined

    if (options.signal == null) {
      const signal = AbortSignal.timeout(this.timeout)
      setMaxListeners(Infinity, signal)

      options = {
        ...options,
        signal
      }
    }

    try {
      stream = await connection.newStream(this.protocol, {
        ...options,
        runOnLimitedConnection: this.runOnLimitedConnection
      })

      const pb = pbStream(stream, {
        maxDataLength: this.maxMessageSize
      }).pb(IdentifyMessage)

      const message = await pb.read(options)

      await stream.close(options)

      return message
    } catch (err: any) {
      stream?.abort(err)
      throw err
    }
  }

  async identify (connection: Connection, options: AbortOptions = {}): Promise<IdentifyResult> {
    const message = await this._identify(connection, options)
    const {
      publicKey,
      protocols,
      observedAddr
    } = message

    if (publicKey == null) {
      throw new InvalidMessageError('public key was missing from identify message')
    }

    const key = publicKeyFromProtobuf(publicKey)
    const id = peerIdFromCID(key.toCID())

    if (!connection.remotePeer.equals(id)) {
      throw new InvalidMessageError('identified peer does not match the expected peer')
    }

    if (this.peerId.equals(id)) {
      throw new InvalidMessageError('identified peer is our own peer id?')
    }

    // Get the observedAddr if there is one
    const cleanObservedAddr = getCleanMultiaddr(observedAddr)

    this.log('identify completed for peer %p and protocols %o', id, protocols)

    if (cleanObservedAddr != null) {
      this.log('our observed address was %a', cleanObservedAddr)

      if (isPrivateIp(cleanObservedAddr?.nodeAddress().address) === true) {
        this.log('our observed address was private')
      } else if (this.addressManager.getObservedAddrs().length < (this.maxObservedAddresses ?? Infinity)) {
        this.log('storing our observed address')
        this.addressManager.addObservedAddr(cleanObservedAddr)
      }
    }

    return consumeIdentifyMessage(this.peerStore, this.events, this.log, connection, message)
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   */
  async handleProtocol (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data

    const signal = AbortSignal.timeout(this.timeout)

    setMaxListeners(Infinity, signal)

    try {
      const peerData = await this.peerStore.get(this.peerId)
      const multiaddrs = this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      let signedPeerRecord = peerData.peerRecordEnvelope

      if (multiaddrs.length > 0 && signedPeerRecord == null) {
        const peerRecord = new PeerRecord({
          peerId: this.peerId,
          multiaddrs
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.privateKey)
        signedPeerRecord = envelope.marshal().subarray()
      }

      let observedAddr: Uint8Array | undefined = connection.remoteAddr.bytes

      if (!IP_OR_DOMAIN.matches(connection.remoteAddr)) {
        observedAddr = undefined
      }

      const pb = pbStream(stream).pb(IdentifyMessage)

      await pb.write({
        protocolVersion: this.host.protocolVersion,
        agentVersion: this.host.agentVersion,
        publicKey: publicKeyToProtobuf(this.privateKey.publicKey),
        listenAddrs: multiaddrs.map(addr => addr.bytes),
        signedPeerRecord,
        observedAddr,
        protocols: peerData.protocols
      }, {
        signal
      })

      await stream.close({
        signal
      })
    } catch (err: any) {
      this.log.error('could not respond to identify request', err)
      stream.abort(err)
    }
  }
}
