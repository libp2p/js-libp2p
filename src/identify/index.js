'use strict'

const debug = require('debug')
const log = debug('libp2p:identify')
log.error = debug('libp2p:identify:error')

const errCode = require('err-code')
const { Buffer } = require('buffer')
const pb = require('it-protocol-buffers')
const lp = require('it-length-prefixed')
const pipe = require('it-pipe')
const { collect, take, consume } = require('streaming-iterables')

const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const { toBuffer } = require('it-buffer')

const Message = require('./message')

const Envelope = require('../record/envelope')
const PeerRecord = require('../record/peer-record')

const {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  AGENT_VERSION,
  PROTOCOL_VERSION
} = require('./consts')

const { codes } = require('../errors')

class IdentifyService {
  /**
   * Takes the `addr` and converts it to a Multiaddr if possible
   * @param {Buffer|String} addr
   * @returns {Multiaddr|null}
   */
  static getCleanMultiaddr (addr) {
    if (addr && addr.length > 0) {
      try {
        return multiaddr(addr)
      } catch (_) {
        return null
      }
    }
    return null
  }

  /**
   * @constructor
   * @param {object} options
   * @param {Libp2p} options.libp2p
   * @param {Map<string, handler>} options.protocols A reference to the protocols we support
   */
  constructor ({ libp2p, protocols }) {
    /**
     * @property {PeerStore}
     */
    this.peerStore = libp2p.peerStore

    /**
     * @property {ConnectionManager}
     */
    this.connectionManager = libp2p.connectionManager

    this.connectionManager.on('peer:connect', (connection) => {
      const peerId = connection.remotePeer

      this.identify(connection, peerId).catch(log.error)
    })

    /**
     * @property {PeerId}
     */
    this.peerId = libp2p.peerId

    /**
     * @property {AddressManager}
     */
    this._libp2p = libp2p

    this._protocols = protocols

    this.handleMessage = this.handleMessage.bind(this)

    // TODO: this should be stored in the certified AddressBook in follow up PR
    this._selfRecord = undefined
  }

  /**
   * Send an Identify Push update to the list of connections
   * @param {Array<Connection>} connections
   * @returns {Promise<void>}
   */
  async push (connections) {
    const signedPeerRecord = await this._getSelfPeerRecord()
    const listenAddrs = this._libp2p.multiaddrs.map((ma) => ma.buffer)
    const protocols = Array.from(this._protocols.keys())

    const pushes = connections.map(async connection => {
      try {
        const { stream } = await connection.newStream(MULTICODEC_IDENTIFY_PUSH)

        await pipe(
          [{
            listenAddrs,
            signedPeerRecord,
            protocols
          }],
          pb.encode(Message),
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
   * @param {PeerStore} peerStore
   */
  pushToPeerStore (peerStore) {
    const connections = []
    let connection
    for (const peer of peerStore.peers.values()) {
      if (peer.protocols.includes(MULTICODEC_IDENTIFY_PUSH) && (connection = this.connectionManager.get(peer.id))) {
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
    const { stream } = await connection.newStream(MULTICODEC_IDENTIFY)
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
      message = Message.decode(data)
    } catch (err) {
      throw errCode(err, codes.ERR_INVALID_MESSAGE)
    }

    let {
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
    observedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

    let addresses

    try {
      const envelope = await Envelope.openAndCertify(signedPeerRecord, PeerRecord.DOMAIN)
      const peerRecord = await PeerRecord.createFromProtobuf(envelope.payload)

      addresses = peerRecord.multiaddrs
    } catch (err) {
      log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
      // Try Legacy
      addresses = listenAddrs
    }

    // Update peers data in PeerStore
    try {
      this.peerStore.addressBook.set(id, addresses.map((addr) => multiaddr(addr)))
    } catch (err) {
      log.error('received invalid addrs', err)
    }

    this.peerStore.protoBook.set(id, protocols)
    this.peerStore.metadataBook.set(id, 'AgentVersion', Buffer.from(message.agentVersion))

    // TODO: Track our observed address so that we can score it
    log('received observed address of %s', observedAddr)
  }

  /**
   * A handler to register with Libp2p to process identify messages.
   *
   * @param {object} options
   * @param {String} options.protocol
   * @param {*} options.stream
   * @param {Connection} options.connection
   * @returns {Promise<void>}
   */
  handleMessage ({ connection, stream, protocol }) {
    switch (protocol) {
      case MULTICODEC_IDENTIFY:
        return this._handleIdentify({ connection, stream })
      case MULTICODEC_IDENTIFY_PUSH:
        return this._handlePush({ connection, stream })
      default:
        log.error('cannot handle unknown protocol %s', protocol)
    }
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   * @private
   * @param {object} options
   * @param {*} options.stream
   * @param {Connection} options.connection
   */
  async _handleIdentify ({ connection, stream }) {
    let publicKey = Buffer.alloc(0)
    if (this.peerId.pubKey) {
      publicKey = this.peerId.pubKey.bytes
    }

    const signedPeerRecord = await this._getSelfPeerRecord()

    const message = Message.encode({
      protocolVersion: PROTOCOL_VERSION,
      agentVersion: AGENT_VERSION,
      publicKey,
      listenAddrs: this._libp2p.multiaddrs.map((ma) => ma.buffer),
      signedPeerRecord,
      observedAddr: connection.remoteAddr.buffer,
      protocols: Array.from(this._protocols.keys())
    })

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
   * @private
   * @param {object} options
   * @param {*} options.stream
   * @param {Connection} options.connection
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
      message = Message.decode(data)
    } catch (err) {
      return log.error('received invalid message', err)
    }

    const id = connection.remotePeer

    let addresses

    try {
      const envelope = await Envelope.openAndCertify(message.signedPeerRecord, PeerRecord.DOMAIN)
      const peerRecord = await PeerRecord.createFromProtobuf(envelope.payload)

      addresses = peerRecord.multiaddrs
    } catch (err) {
      log('received invalid envelope, discard it and fallback to listenAddrs is available', err)
      // Try Legacy
      addresses = message.listenAddrs
    }

    try {
      this.peerStore.addressBook.set(id, addresses.map((addr) => multiaddr(addr)))
    } catch (err) {
      log.error('received invalid addrs', err)
    }

    // Update the protocols
    this.peerStore.protoBook.set(id, message.protocols)
  }

  /**
   * Get self signed peer record raw envelope.
   * @return {Buffer}
   */
  async _getSelfPeerRecord () {
    // TODO: support invalidation when dynamic multiaddrs are supported
    if (this._selfRecord) {
      return this._selfRecord
    }

    try {
      const peerRecord = new PeerRecord({
        peerId: this.peerId,
        multiaddrs: this._libp2p.multiaddrs
      })
      const envelope = await Envelope.seal(peerRecord, this.peerId)

      this._selfRecord = envelope.marshal()

      return this._selfRecord
    } catch (err) {
      log.error('failed to get self peer record')
    }
    return null
  }
}

module.exports.IdentifyService = IdentifyService
/**
 * The protocols the IdentifyService supports
 * @property multicodecs
 */
module.exports.multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}
module.exports.Message = Message
