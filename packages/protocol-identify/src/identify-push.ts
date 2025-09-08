import { serviceCapabilities } from '@libp2p/interface'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { debounce, pbStream } from '@libp2p/utils'
import { CODE_P2P } from '@multiformats/multiaddr'
import drain from 'it-drain'
import parallel from 'it-parallel'
import { setMaxListeners } from 'main-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import {
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION,
  PUSH_DEBOUNCE_MS
} from './consts.js'
import { Identify as IdentifyMessage } from './pb/message.js'
import { AbstractIdentify, consumeIdentifyMessage, defaultValues } from './utils.js'
import type { IdentifyPush as IdentifyPushInterface, IdentifyPushComponents, IdentifyPushInit } from './index.js'
import type { Stream, Startable, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

export class IdentifyPush extends AbstractIdentify implements Startable, IdentifyPushInterface {
  private readonly connectionManager: ConnectionManager
  private readonly concurrency: number
  private _push: () => void

  constructor (components: IdentifyPushComponents, init: IdentifyPushInit = {}) {
    super(components, {
      ...init,
      protocol: `/${init.protocolPrefix ?? defaultValues.protocolPrefix}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION}`,
      log: components.logger.forComponent('libp2p:identify-push')
    })

    this.connectionManager = components.connectionManager
    this.concurrency = init.concurrency ?? defaultValues.concurrency

    this._push = debounce(this.sendPushMessage.bind(this), init.debounce ?? PUSH_DEBOUNCE_MS)

    if ((init.runOnSelfUpdate ?? defaultValues.runOnSelfUpdate)) {
      // When self peer record changes, trigger identify-push
      components.events.addEventListener('self:peer:update', (evt) => {
        this.push().catch(err => {
          this.log.error('error pushing updates to peers - %e', err)
        })
      })
    }
  }

  [serviceCapabilities]: string[] = [
    '@libp2p/identify-push'
  ]

  /**
   * Calls `push` on all peer connections
   */
  async push (): Promise<void> {
    this._push()
  }

  private async sendPushMessage (): Promise<void> {
    // Do not try to push if we are not running
    if (!this.isStarted()) {
      return
    }

    try {
      const listenAddresses = this.components.addressManager.getAddresses().map(ma => ma.decapsulateCode(CODE_P2P))
      const peerRecord = new PeerRecord({
        peerId: this.components.peerId,
        multiaddrs: listenAddresses
      })
      const signedPeerRecord = await RecordEnvelope.seal(peerRecord, this.components.privateKey)
      const supportedProtocols = this.components.registrar.getProtocols()
      const peer = await this.components.peerStore.get(this.components.peerId)
      const agentVersion = uint8ArrayToString(peer.metadata.get('AgentVersion') ?? uint8ArrayFromString(this.host.agentVersion))
      const protocolVersion = uint8ArrayToString(peer.metadata.get('ProtocolVersion') ?? uint8ArrayFromString(this.host.protocolVersion))
      const self = this

      async function * pushToConnections (): AsyncGenerator<() => Promise<void>> {
        for (const connection of self.connectionManager.getConnections()) {
          const peer = await self.components.peerStore.get(connection.remotePeer)

          if (!peer.protocols.includes(self.protocol)) {
            continue
          }

          yield async () => {
            let stream: Stream | undefined
            const signal = AbortSignal.timeout(self.timeout)

            setMaxListeners(Infinity, signal)

            try {
              stream = await connection.newStream(self.protocol, {
                signal,
                runOnLimitedConnection: self.runOnLimitedConnection
              })

              const pb = pbStream(stream, {
                maxDataLength: self.maxMessageSize
              }).pb(IdentifyMessage)

              await pb.write({
                listenAddrs: listenAddresses.map(ma => ma.bytes),
                signedPeerRecord: signedPeerRecord.marshal(),
                protocols: supportedProtocols,
                agentVersion,
                protocolVersion
              }, {
                signal
              })

              await stream.close({
                signal
              })
            } catch (err: any) {
              // Just log errors if the stream was opened
              const log = stream?.log.newScope('identify-push')
              log?.error('could not push identify update to peer', err)
              stream?.abort(err)
            }
          }
        }
      }

      await drain(parallel(pushToConnections(), {
        concurrency: this.concurrency
      }))
    } catch (err: any) {
      this.log.error('error pushing updates to peers - %e', err)
    }
  }

  /**
   * Reads the Identify Push message from the given `connection`
   */
  async handleProtocol (stream: Stream, connection: Connection): Promise<void> {
    const log = stream.log.newScope('identify-push')

    if (this.components.peerId.equals(connection.remotePeer)) {
      throw new Error('received push from ourselves?')
    }

    const options = {
      signal: AbortSignal.timeout(this.timeout)
    }

    const pb = pbStream(stream, {
      maxDataLength: this.maxMessageSize
    }).pb(IdentifyMessage)

    const message = await pb.read(options)
    await stream.close(options)

    await consumeIdentifyMessage(this.components.peerStore, this.components.events, log, connection, message)

    log.trace('handled push from %p', connection.remotePeer)
  }
}
