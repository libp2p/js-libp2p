'use strict'

const debug = require('debug')
const pull = require('pull-stream/pull')
const Pushable = require('pull-pushable')
const pb = require('pull-protocol-buffers')
const take = pull.take
const collect = pull.collect
const values = require('pull-stream/sources/values')
const lp = require('pull-length-prefixed')

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')

const Message = require('./message')

const log = debug('libp2p:identify')
log.error = debug('libp2p:identify:error')

const {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  AGENT_VERSION,
  PROTOCOL_VERSION
} = require('./consts')

const {
  ERR_CONNECTION_ENDED,
  ERR_INVALID_MESSAGE,
  ERR_INVALID_PEER
} = require('./errors')

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
   * @param {Switch} options.switch
   */
  constructor (options) {
    /**
     * @property {Switch}
     */
    this.switch = options.switch
    /**
     * @property {PeerInfo}
     */
    this.peerInfo = this.switch._peerInfo

    this.handleMessage = this.handleMessage.bind(this)
  }

  /**
   * Send an Identify Push update to the list of peers
   * @param {Array<PeerInfo>} peers
   * @param {function(Error)} callback
   */
  push (peers, callback) {
    const promises = peers.map(peer => {
      // Don't push to peers who dont support it
      if (!peer.protocols.has(MULTICODEC_IDENTIFY_PUSH)) {
        return Promise.resolve()
      }

      return new Promise(resolve => {
        this.switch.dialer.newStream(peer, MULTICODEC_IDENTIFY_PUSH, (err, stream) => {
          if (err) {
            // Just log errors creating new streams
            log.error('could not create a stream to the peer', err)
            return resolve()
          }

          const pusher = {
            source: Pushable(),
            sink: pull.onEnd((err) => {
              if (err) log.error('could not push identify update to peer', err)
              resolve()
            })
          }

          pull(
            stream,
            pusher,
            pb.encode(Message),
            stream
          )

          // TODO: send only the things that changed
          // We should keep a record of the previous state we sent, so we know what changed
          pusher.source.push({
            listenAddrs: this.peerInfo.multiaddrs.toArray().map((ma) => ma.buffer),
            protocols: Array.from(this.peerInfo.protocols)
          })
          pusher.source.end()
        })
      })
    })

    Promise.all(promises)
      .then(() => callback())
      .catch(callback)
  }

  /**
   * Requests the `Identify` message from peer associated with the given `connection`.
   * If the identified peer does not match the `PeerId` associated with the connection,
   * an error will be passed to the `callback`.
   *
   * @param {Connection} connection
   * @param {PeerInfo} expectedPeerInfo The PeerInfo the identify response should match
   * @param {function(Error, PeerInfo, Multiaddr)} callback
   * @returns {void}
   */
  identify (connection, expectedPeerInfo, callback) {
    pull(
      connection,
      lp.decode(),
      take(1),
      collect((err, data) => {
        if (err) {
          return callback(err)
        }

        // connection got closed graciously
        if (data.length === 0) {
          return callback(ERR_CONNECTION_ENDED())
        }

        let message
        try {
          message = Message.decode(data[0])
        } catch (err) {
          return callback(ERR_INVALID_MESSAGE(err))
        }

        let {
          publicKey,
          listenAddrs,
          protocols,
          observedAddr
        } = message

        PeerId.createFromPubKey(publicKey, (err, id) => {
          if (err) {
            return callback(err)
          }

          const peerInfo = new PeerInfo(id)
          if (expectedPeerInfo && expectedPeerInfo.id.toB58String() !== id.toB58String()) {
            return callback(ERR_INVALID_PEER())
          }

          // Get the observedAddr if there is one
          observedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

          // Copy the listenAddrs and protocols
          IdentifyService.updatePeerAddresses(peerInfo, listenAddrs)
          IdentifyService.updatePeerProtocols(peerInfo, protocols)

          callback(null, peerInfo, observedAddr)
        })
      })
    )
  }

  /**
   * A handler to register with Libp2p to process identify messages.
   *
   * @param {String} protocol
   * @param {Connection} connection
   */
  handleMessage (protocol, connection) {
    switch (protocol) {
      case MULTICODEC_IDENTIFY:
        this._handleIdentify(connection)
        break
      case MULTICODEC_IDENTIFY_PUSH:
        this._handlePush(connection)
        break
      default:
        log.error('cannot handle unknown protocol %s', protocol)
    }
  }

  /**
   * Sends the `Identify` response to the requesting peer over the
   * given `connection`
   * @private
   * @param {Connection} connection
   */
  _handleIdentify (connection) {
    connection.getObservedAddrs((err, observedAddrs) => {
      if (err) { return }
      observedAddrs = observedAddrs[0]

      let publicKey = Buffer.alloc(0)
      if (this.peerInfo.id.pubKey) {
        publicKey = this.peerInfo.id.pubKey.bytes
      }

      const message = Message.encode({
        protocolVersion: PROTOCOL_VERSION,
        agentVersion: AGENT_VERSION,
        publicKey: publicKey,
        listenAddrs: this.peerInfo.multiaddrs.toArray().map((ma) => ma.buffer),
        observedAddr: observedAddrs ? observedAddrs.buffer : Buffer.alloc(0),
        protocols: Array.from(this.peerInfo.protocols)
      })

      pull(
        values([message]),
        lp.encode(),
        connection
      )
    })
  }

  /**
   * Reads the Identify Push message from the given `connection`
   * @private
   * @param {Connection} connection
   * @returns {void}
   */
  _handlePush (connection) {
    connection.getPeerInfo((err, peerInfo) => {
      if (err) {
        return log.error('could not get the PeerInfo associated with the connection')
      }

      pull(
        connection,
        lp.decode(),
        take(1),
        collect((err, data) => {
          if (err) {
            return log.error(err)
          }

          let message
          try {
            message = Message.decode(data[0])
          } catch (err) {
            return log.error('received invalid message', err)
          }

          // Update the listen addresses
          try {
            IdentifyService.updatePeerAddresses(peerInfo, message.listenAddrs)
          } catch (err) {
            return log.error('received invalid listen addrs', err)
          }

          // Update the protocols
          IdentifyService.updatePeerProtocols(peerInfo, message.protocols)
        })
      )
    })
  }
}

module.exports = IdentifyService
/**
 * The protocols the IdentifyService supports
 * @property multicodecs
 */
module.exports.multicodecs = {
  identify: MULTICODEC_IDENTIFY,
  push: MULTICODEC_IDENTIFY_PUSH
}
module.exports.Message = Message