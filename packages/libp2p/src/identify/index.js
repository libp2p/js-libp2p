'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:identify'), {
  error: debug('libp2p:identify:err')
})
const errCode = require('err-code')
const lp = require('it-length-prefixed')
const { pipe } = require('it-pipe')
const { collect, take, consume } = require('streaming-iterables')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const PeerId = require('peer-id')
const { Multiaddr } = require('multiaddr')
// @ts-ignore it-buffer does not have types
const { toBuffer } = require('it-buffer')

const Message = require('./message')

const Envelope = require('../record/envelope')
const PeerRecord = require('../record/peer-record')

const {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION
} = require('./consts')

const { codes } = require('../errors')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 */

/**
 * @typedef {Object} HostProperties
 * @property {string} agentVersion
 */

class IdentifyService {
  /**
   * @param {import('../')} libp2p
   */
  static getProtocolStr (libp2p) {
    return {
      identifyProtocolStr: `/${libp2p._config.protocolPrefix}/${MULTICODEC_IDENTIFY_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PROTOCOL_VERSION}`,
      identifyPushProtocolStr: `/${libp2p._config.protocolPrefix}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION}`
    }
  }

  /**
   * @class
   * @param {Object} options
   * @param {import('../')} options.libp2p
   */
  constructor ({ libp2p }) {
    this._libp2p = libp2p
    this.peerStore = libp2p.peerStore
    this.addressManager = libp2p.addressManager
    this.connectionManager = libp2p.connectionManager
    this.peerId = libp2p.peerId

    this.handleMessage = this.handleMessage.bind(this)

    const protocolStr = IdentifyService.getProtocolStr(libp2p)
    this.identifyProtocolStr = protocolStr.identifyProtocolStr
    this.identifyPushProtocolStr = protocolStr.identifyPushProtocolStr

    // Store self host metadata
    this._host = {
      protocolVersion: `${libp2p._config.protocolPrefix}/${IDENTIFY_PROTOCOL_VERSION}`,
      ...libp2p._options.host
    }

    this.peerStore.metadataBook.set(this.peerId, 'AgentVersion', uint8ArrayFromString(this._host.agentVersion))
    this.peerStore.metadataBook.set(this.peerId, 'ProtocolVersion', uint8ArrayFromString(this._host.protocolVersion))
    // When a new connection happens, trigger identify
    this.connectionManager.on('peer:connect', (connection) => {
      this.identify(connection).catch(log.error)
    })

    // When self multiaddrs change, trigger identify-push
    this.peerStore.on('change:multiaddrs', ({ peerId }) => {
      if (peerId.toString() === this.peerId.toString()) {
        this.pushToPeerStore()
      }
    })

    // When self protocols change, trigger identify-push
    this.peerStore.on('change:protocols', ({ peerId }) => {
      if (peerId.toString() === this.peerId.toString()) {
        this.pushToPeerStore()
      }
    })
  }

  /**
   * Send an Identify Push update to the list of connections
   *
   * @param {Connection[]} connections
   * @returns {Promise<void[]>}
   */
  async push (connections) {
    const signedPeerRecord = await this.peerStore.addressBook.getRawEnvelope(this.peerId)
    const listenAddrs = this._libp2p.multiaddrs.map((ma) => ma.bytes)
    const protocols = this.peerStore.protoBook.get(this.peerId) || []

    const pushes = connections.map(async connection => {
      try {
        const { stream } = await connection.newStream(this.identifyPushProtocolStr)

        await pipe(
          [Message.Identify.encode({
            listenAddrs,
            signedPeerRecord,
            protocols
          }).finish()],
          lp.encode(),
          stream,
          consume
        )
      } catch (err) {
        // Just log errors
        log.error('could not push identify update to peer', err)
      }
    })

    return Promise.all(pushes)
  }

  /**
   * Calls `push` for all peers in the `peerStore` that are connected
   *
   * @returns {void}
   */
  pushToPeerStore () {
    // Do not try to push if libp2p node is not running
    if (!this._libp2p.isStarted()) {
      return
    }

    const connections = []
    let connection
    for (const peer of this.peerStore.peers.values()) {
      if (peer.protocols.includes(this.identifyPushProtocolStr) && (connection = this.connectionManager.get(peer.id))) {
        connections.push(connection)
      }
    }

    this.push(connections)
  }

  /**
   * Requests the `Identify` message from peer associated with the given `connection`.
   * If the identified peer does not match the `PeerId` associated with the connection,
   * an error will be thrown.
   *
   * @async
   * @param {Connection} connection
   * @returns {Promise<void>}
   */
  async identify (connection) {
    const { stream } = await connection.newStream(this.identifyProtocolStr)
    const [data] = await pipe(
      [],
      stream,
      lp.decode(),
      take(1),
      toBuffer,
      collect
    )

    if (!data) {
      throw errCode(new Error('No data could be retrieved'), codes.ERR_CONNECTION_ENDED)
    }

    let message
    try {
      message = Message.Identify.decode(data)
    } catch (err) {
      throw errCode(err, codes.ERR_INVALID_MESSAGE)
    }

    const {
      publicKey,
      listenAddrs,
      protocols,
      observedAddr,
      signedPeerRecord
    } = message

    const id = await PeerId.createFromPubKey(publicKey)

    if (connection.remotePeer.toB58String() !== id.toB58String()) {
      throw errCode(new Error('identified peer does not match the expected peer'), codes.ERR_INVALID_PEER)
    }

    // Get the observedAddr if there is one
    const cleanObservedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

    try {
      const envelope = await Envelope.openAndCertify(signedPeerRecord, PeerRecord.DOMAIN)
      if (this.peerStore.addressBook.consumePeerRecord(envelope)) {
        this.peerStore.protoBook.set(id, protocols)
        this.peerStore.metadataBook.set(id, 'AgentVersion', uint8ArrayFromString(message.agentVersion))
        this.peerStore.metadataBook.set(id, 'ProtocolVersion', uint8ArrayFromString(message.protocolVersion))
        return
      }
    } catch (err) {
      log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
    }

    // LEGACY: Update peers data in PeerStore
    try {
      this.peerStore.addressBook.set(id, listenAddrs.map((addr) => new Multiaddr(addr)))
    } catch (err) {
      log.error('received invalid addrs', err)
    }

    this.peerStore.protoBook.set(id, protocols)
    this.peerStore.metadataBook.set(id, 'AgentVersion', uint8ArrayFromString(message.agentVersion))
    this.peerStore.metadataBook.set(id, 'ProtocolVersion', uint8ArrayFromString(message.protocolVersion))

    // TODO: Add and score our observed addr
    log('received observed address of %s', cleanObservedAddr)
    // this.addressManager.addObservedAddr(observedAddr)
  }

  /**
   * A handler to register with Libp2p to process identify messages.
   *
   * @param {Object} options
   * @param {Connection} options.connection
   * @param {MuxedStream} options.stream
   * @param {string} options.protocol
   * @returns {Promise<void>|undefined}
   */
  handleMessage ({ connection, stream, protocol }) {
    switch (protocol) {
      case this.identifyProtocolStr:
        return this._handleIdentify({ connection, stream })
      case this.identifyPushProtocolStr:
        return this._handlePush({ connection, stream })
      default:
        log.error('cannot handle unknown protocol %s', protocol)
    }
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   *
   * @private
   * @param {Object} options
   * @param {MuxedStream} options.stream
   * @param {Connection} options.connection
   * @returns {Promise<void>}
   */
  async _handleIdentify ({ connection, stream }) {
    let publicKey = new Uint8Array(0)
    if (this.peerId.pubKey) {
      publicKey = this.peerId.pubKey.bytes
    }

    const signedPeerRecord = await this.peerStore.addressBook.getRawEnvelope(this.peerId)
    const protocols = this.peerStore.protoBook.get(this.peerId) || []

    const message = Message.Identify.encode({
      protocolVersion: this._host.protocolVersion,
      agentVersion: this._host.agentVersion,
      publicKey,
      listenAddrs: this._libp2p.multiaddrs.map((ma) => ma.bytes),
      signedPeerRecord,
      observedAddr: connection.remoteAddr.bytes,
      protocols
    }).finish()

    try {
      await pipe(
        [message],
        lp.encode(),
        stream,
        consume
      )
    } catch (err) {
      log.error('could not respond to identify request', err)
    }
  }

  /**
   * Reads the Identify Push message from the given `connection`
   *
   * @private
   * @param {object} options
   * @param {MuxedStream} options.stream
   * @param {Connection} options.connection
   * @returns {Promise<void>}
   */
  async _handlePush ({ connection, stream }) {
    let message
    try {
      const [data] = await pipe(
        [],
        stream,
        lp.decode(),
        take(1),
        toBuffer,
        collect
      )
      message = Message.Identify.decode(data)
    } catch (err) {
      return log.error('received invalid message', err)
    }

    const id = connection.remotePeer

    try {
      const envelope = await Envelope.openAndCertify(message.signedPeerRecord, PeerRecord.DOMAIN)
      if (this.peerStore.addressBook.consumePeerRecord(envelope)) {
        this.peerStore.protoBook.set(id, message.protocols)
        return
      }
    } catch (err) {
      log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
    }

    // LEGACY: Update peers data in PeerStore
    try {
      this.peerStore.addressBook.set(id,
        message.listenAddrs.map((addr) => new Multiaddr(addr)))
    } catch (err) {
      log.error('received invalid addrs', err)
    }

    // Update the protocols
    this.peerStore.protoBook.set(id, message.protocols)
  }

  /**
   * Takes the `addr` and converts it to a Multiaddr if possible
   *
   * @param {Uint8Array | string} addr
   * @returns {Multiaddr|null}
   */
  static getCleanMultiaddr (addr) {
    if (addr && addr.length > 0) {
      try {
        return new Multiaddr(addr)
      } catch (_) {
        return null
      }
    }
    return null
  }
}

/**
 * The protocols the IdentifyService supports
 *
 * @property multicodecs
 */
const multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}

IdentifyService.multicodecs = multicodecs
IdentifyService.Messsage = Message

module.exports = IdentifyService
