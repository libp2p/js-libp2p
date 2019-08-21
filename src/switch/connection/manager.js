'use strict'

const identify = require('../../identify')
const multistream = require('multistream-select')
const debug = require('debug')
const log = debug('libp2p:switch:conn-manager')
const once = require('once')
const ConnectionFSM = require('../connection')
const { msHandle, msSelect, identifyDialer } = require('../utils')

const Circuit = require('../../circuit')

const plaintext = require('../plaintext')

/**
 * Contains methods for binding handlers to the Switch
 * in order to better manage its connections.
 */
class ConnectionManager {
  constructor (_switch) {
    this.switch = _switch
    this.connections = {}
  }

  /**
   * Adds the connection for tracking if it's not already added
   * @private
   * @param {ConnectionFSM} connection
   * @returns {void}
   */
  add (connection) {
    this.connections[connection.theirB58Id] = this.connections[connection.theirB58Id] || []
    // Only add it if it's not there
    if (!this.get(connection)) {
      this.connections[connection.theirB58Id].push(connection)
      this.switch.emit('connection:start', connection.theirPeerInfo)
      if (connection.getState() === 'MUXED') {
        this.switch.emit('peer-mux-established', connection.theirPeerInfo)
        // Clear the denylist of the peer
        this.switch.dialer.clearDenylist(connection.theirPeerInfo)
      } else {
        connection.once('muxed', () => {
          this.switch.emit('peer-mux-established', connection.theirPeerInfo)
          // Clear the denylist of the peer
          this.switch.dialer.clearDenylist(connection.theirPeerInfo)
        })
      }
    }
  }

  /**
   * Gets the connection from the list if it exists
   * @private
   * @param {ConnectionFSM} connection
   * @returns {ConnectionFSM|null} The found connection or null
   */
  get (connection) {
    if (!this.connections[connection.theirB58Id]) return null

    for (let i = 0; i < this.connections[connection.theirB58Id].length; i++) {
      if (this.connections[connection.theirB58Id][i] === connection) {
        return this.connections[connection.theirB58Id][i]
      }
    }
    return null
  }

  /**
   * Gets a connection associated with the given peer
   * @private
   * @param {string} peerId The peers id
   * @returns {ConnectionFSM|null} The found connection or null
   */
  getOne (peerId) {
    if (this.connections[peerId]) {
      // Only return muxed connections
      for (var i = 0; i < this.connections[peerId].length; i++) {
        if (this.connections[peerId][i].getState() === 'MUXED') {
          return this.connections[peerId][i]
        }
      }
    }
    return null
  }

  /**
   * Removes the connection from tracking
   * @private
   * @param {ConnectionFSM} connection The connection to remove
   * @returns {void}
   */
  remove (connection) {
    // No record of the peer, disconnect it
    if (!this.connections[connection.theirB58Id]) {
      if (connection.theirPeerInfo) {
        connection.theirPeerInfo.disconnect()
        this.switch.emit('peer-mux-closed', connection.theirPeerInfo)
      }
      return
    }

    for (let i = 0; i < this.connections[connection.theirB58Id].length; i++) {
      if (this.connections[connection.theirB58Id][i] === connection) {
        this.connections[connection.theirB58Id].splice(i, 1)
        break
      }
    }

    // The peer is fully disconnected
    if (this.connections[connection.theirB58Id].length === 0) {
      delete this.connections[connection.theirB58Id]
      connection.theirPeerInfo.disconnect()
      this.switch.emit('peer-mux-closed', connection.theirPeerInfo)
    }

    // A tracked connection was closed, let the world know
    this.switch.emit('connection:end', connection.theirPeerInfo)
  }

  /**
   * Returns all connections being tracked
   * @private
   * @returns {ConnectionFSM[]}
   */
  getAll () {
    let connections = []
    for (const conns of Object.values(this.connections)) {
      connections = [...connections, ...conns]
    }
    return connections
  }

  /**
   * Returns all connections being tracked for a given peer id
   * @private
   * @param {string} peerId Stringified peer id
   * @returns {ConnectionFSM[]}
   */
  getAllById (peerId) {
    return this.connections[peerId] || []
  }

  /**
   * Adds a listener for the given `muxer` and creates a handler for it
   * leveraging the Switch.protocolMuxer handler factory
   *
   * @param {Muxer} muxer
   * @returns {void}
   */
  addStreamMuxer (muxer) {
    // for dialing
    this.switch.muxers[muxer.multicodec] = muxer

    // for listening
    this.switch.handle(muxer.multicodec, (protocol, conn) => {
      const muxedConn = muxer.listener(conn)

      muxedConn.on('stream', this.switch.protocolMuxer(null))

      // If identify is enabled
      //   1. overload getPeerInfo
      //   2. call getPeerInfo
      //   3. add this conn to the pool
      if (this.switch.identify) {
        // Get the peer info from the crypto exchange
        conn.getPeerInfo((err, cryptoPI) => {
          if (err || !cryptoPI) {
            log('crypto peerInfo wasnt found')
          }

          // overload peerInfo to use Identify instead
          conn.getPeerInfo = async (callback) => {
            const conn = muxedConn.newStream()
            const ms = new multistream.Dialer()
            callback = once(callback)

            let results
            try {
              await msHandle(ms, conn)
              const msConn = await msSelect(ms, identify.multicodec)
              results = await identifyDialer(msConn, cryptoPI)
            } catch (err) {
              return muxedConn.end(() => {
                callback(err, null)
              })
            }

            const { peerInfo } = results

            if (peerInfo) {
              conn.setPeerInfo(peerInfo)
            }
            callback(null, peerInfo)
          }

          conn.getPeerInfo((err, peerInfo) => {
            /* eslint no-warning-comments: off */
            if (err) {
              return log('identify not successful')
            }
            const b58Str = peerInfo.id.toB58String()
            peerInfo = this.switch._peerBook.put(peerInfo)

            const connection = new ConnectionFSM({
              _switch: this.switch,
              peerInfo,
              muxer: muxedConn,
              conn: conn,
              type: 'inc'
            })
            this.switch.connection.add(connection)

            // Only update if it's not already connected
            if (!peerInfo.isConnected()) {
              if (peerInfo.multiaddrs.size > 0) {
                // with incomming conn and through identify, going to pick one
                // of the available multiaddrs from the other peer as the one
                // I'm connected to as we really can't be sure at the moment
                // TODO add this consideration to the connection abstraction!
                peerInfo.connect(peerInfo.multiaddrs.toArray()[0])
              } else {
                // for the case of websockets in the browser, where peers have
                // no addr, use just their IPFS id
                peerInfo.connect(`/ipfs/${b58Str}`)
              }
            }

            muxedConn.once('close', () => {
              connection.close()
            })
          })
        })
      }

      return conn
    })
  }

  /**
   * Adds the `encrypt` handler for the given `tag` and also sets the
   * Switch's crypto to passed `encrypt` function
   *
   * @param {String} tag
   * @param {function(PeerID, Connection, PeerId, Callback)} encrypt
   * @returns {void}
   */
  crypto (tag, encrypt) {
    if (!tag && !encrypt) {
      tag = plaintext.tag
      encrypt = plaintext.encrypt
    }

    this.switch.crypto = { tag, encrypt }
  }

  /**
   * If config.enabled is true, a Circuit relay will be added to the
   * available Switch transports.
   *
   * @param {any} config
   * @returns {void}
   */
  enableCircuitRelay (config) {
    config = config || {}

    if (config.enabled) {
      if (!config.hop) {
        Object.assign(config, { hop: { enabled: false, active: false } })
      }

      this.switch.transport.add(Circuit.tag, new Circuit(this.switch, config))
    }
  }

  /**
   * Sets identify to true on the Switch and performs handshakes
   * for libp2p-identify leveraging the Switch's muxer.
   *
   * @returns {void}
   */
  reuse () {
    this.switch.identify = true
    this.switch.handle(identify.multicodec, (protocol, conn) => {
      identify.listener(conn, this.switch._peerInfo)
    })
  }
}

module.exports = ConnectionManager
