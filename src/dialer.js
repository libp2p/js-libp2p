'use strict'

const Connection = require('interface-connection').Connection
const ConnectionFSM = require('./connection')
const getPeerInfo = require('./get-peer-info')
const once = require('once')
const nextTick = require('async/nextTick')

const debug = require('debug')
const log = debug('libp2p:switch:dial')

function maybePerformHandshake ({ protocol, proxyConnection, connection, callback }) {
  if (protocol) {
    return connection.shake(protocol, (err, conn) => {
      if (!conn) {
        return callback(err)
      }

      proxyConnection.setPeerInfo(connection.theirPeerInfo)
      proxyConnection.setInnerConn(conn)
      callback(null, proxyConnection)
    })
  }

  nextTick(callback)
}

/**
 * Returns a Dialer generator that when called, will immediately begin dialing
 * to the given `peer`.
 *
 * @param {Switch} _switch
 * @param {Boolean} returnFSM Whether or not to return an fsm instead of a Connection
 * @returns {function(PeerInfo, string, function(Error, Connection))}
 */
function dial (_switch, returnFSM) {
  /**
   * Creates a new dialer and immediately begins dialing to the given `peer`
   *
   * @param {PeerInfo} peer
   * @param {string} protocol
   * @param {function(Error, Connection)} callback
   * @returns {Connection}
   */
  return (peer, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = once(callback || function noop () {})

    const peerInfo = getPeerInfo(peer, _switch._peerBook)
    const b58Id = peerInfo.id.toB58String()

    log('dialing to %s with protocol %s', b58Id, protocol || 'unknown')

    let connection = _switch.connection.getOne(b58Id)

    if (!ConnectionFSM.isConnectionFSM(connection)) {
      connection = new ConnectionFSM({
        _switch,
        peerInfo,
        muxer: null,
        conn: null
      })
      connection.once('error', (err) => callback(err))
      connection.once('connected', () => connection.protect())
      connection.once('private', () => connection.encrypt())
      connection.once('encrypted', () => connection.upgrade())
      connection.once('muxed', () => {
        maybePerformHandshake({
          protocol,
          proxyConnection,
          connection,
          callback
        })
      })
      connection.once('unmuxed', () => {
        maybePerformHandshake({
          protocol,
          proxyConnection,
          connection,
          callback
        })
      })
    }

    const proxyConnection = new Connection()
    proxyConnection.setPeerInfo(peerInfo)

    nextTick(() => {
      // If we have a muxed connection, attempt the protocol handshake
      if (connection.getState() === 'MUXED') {
        maybePerformHandshake({
          protocol,
          proxyConnection,
          connection,
          callback
        })
      } else {
        connection.dial()
      }
    })

    return returnFSM ? connection : proxyConnection
  }
}

module.exports = dial
