'use strict'

const { Buffer } = require('buffer')
const debug = require('debug')
const pb = require('it-protocol-buffers')
const lp = require('it-length-prefixed')
const pipe = require('it-pipe')
const { collect, take, consume } = require('streaming-iterables')

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const { toBuffer } = require('it-buffer')

const Message = require('./message')

const log = debug('libp2p:identify')
log.error = debug('libp2p:identify:error')

const {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  AGENT_VERSION,
  PROTOCOL_VERSION
} = require('./consts')

const errCode = require('err-code')
const { codes } = require('../errors')

class IdentifyService {
  /**
   * Replaces the multiaddrs on the given `peerInfo`,
   * with the provided `multiaddrs`
   * @param {PeerInfo} peerInfo
   * @param {Array<Multiaddr>|Array<Buffer>} multiaddrs
   */
  static updatePeerAddresses (peerInfo, multiaddrs) {
    if (multiaddrs && multiaddrs.length > 0) {
      peerInfo.multiaddrs.clear()
      multiaddrs.forEach(ma => {
        try {
          peerInfo.multiaddrs.add(ma)
        } catch (err) {
          log.error('could not add multiaddr', err)
        }
      })
    }
  }

  /**
   * Replaces the protocols on the given `peerInfo`,
   * with the provided `protocols`
   * @static
   * @param {PeerInfo} peerInfo
   * @param {Array<string>} protocols
   */
  static updatePeerProtocols (peerInfo, protocols) {
    if (protocols && protocols.length > 0) {
      peerInfo.protocols.clear()
      protocols.forEach(proto => peerInfo.protocols.add(proto))
    }
  }

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
   * @param {Registrar} options.registrar
   * @param {Map<string, handler>} options.protocols A reference to the protocols we support
   * @param {PeerInfo} options.peerInfo The peer running the identify service
   */
  constructor (options) {
    /**
     * @property {Registrar}
     */
    this.registrar = options.registrar
    /**
     * @property {PeerInfo}
     */
    this.peerInfo = options.peerInfo

    this._protocols = options.protocols

    this.handleMessage = this.handleMessage.bind(this)
  }

  /**
   * Send an Identify Push update to the list of connections
   * @param {Array<Connection>} connections
   * @returns {Promise<void>}
   */
  push (connections) {
    const pushes = connections.map(async connection => {
      try {
        const { stream } = await connection.newStream(MULTICODEC_IDENTIFY_PUSH)

        await pipe(
          [{
            listenAddrs: this.peerInfo.multiaddrs.toArray().map((ma) => ma.buffer),
            protocols: Array.from(this._protocols.keys())
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
      if (peer.protocols.has(MULTICODEC_IDENTIFY_PUSH) && (connection = this.registrar.getConnection(peer))) {
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
      observedAddr
    } = message

    const id = await PeerId.createFromPubKey(publicKey)
    const peerInfo = new PeerInfo(id)
    if (connection.remotePeer.toB58String() !== id.toB58String()) {
      throw errCode(new Error('identified peer does not match the expected peer'), codes.ERR_INVALID_PEER)
    }

    // Get the observedAddr if there is one
    observedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

    // Copy the listenAddrs and protocols
    IdentifyService.updatePeerAddresses(peerInfo, listenAddrs)
    IdentifyService.updatePeerProtocols(peerInfo, protocols)

    this.registrar.peerStore.replace(peerInfo)
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
   * Sends the `Identify` response to the requesting peer over the
   * given `connection`
   * @private
   * @param {object} options
   * @param {*} options.stream
   * @param {Connection} options.connection
   */
  async _handleIdentify ({ connection, stream }) {
    let publicKey = Buffer.alloc(0)
    if (this.peerInfo.id.pubKey) {
      publicKey = this.peerInfo.id.pubKey.bytes
    }

    const message = Message.encode({
      protocolVersion: PROTOCOL_VERSION,
      agentVersion: AGENT_VERSION,
      publicKey,
      listenAddrs: this.peerInfo.multiaddrs.toArray().map((ma) => ma.buffer),
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

    // Update the listen addresses
    const peerInfo = new PeerInfo(connection.remotePeer)

    try {
      IdentifyService.updatePeerAddresses(peerInfo, message.listenAddrs)
    } catch (err) {
      return log.error('received invalid listen addrs', err)
    }

    // Update the protocols
    IdentifyService.updatePeerProtocols(peerInfo, message.protocols)

    // Update the peer in the PeerStore
    this.registrar.peerStore.replace(peerInfo)
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
