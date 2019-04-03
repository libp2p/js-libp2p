'use strict'

const FSM = require('fsm-event')
const multistream = require('multistream-select')
const withIs = require('class-is')

const BaseConnection = require('./base')

class IncomingConnectionFSM extends BaseConnection {
  constructor ({ connection, _switch, transportKey, peerInfo }) {
    super({
      _switch,
      name: `inc:${_switch._peerInfo.id.toB58String().slice(0, 8)}`
    })
    this.conn = connection
    this.theirPeerInfo = peerInfo || null
    this.theirB58Id = this.theirPeerInfo ? this.theirPeerInfo.id.toB58String() : null
    this.ourPeerInfo = this.switch._peerInfo
    this.transportKey = transportKey
    this.protocolMuxer = this.switch.protocolMuxer(this.transportKey)
    this.msListener = new multistream.Listener()

    this._state = FSM('DIALED', {
      DISCONNECTED: {
        disconnect: 'DISCONNECTED'
      },
      DIALED: { // Base connection to peer established
        privatize: 'PRIVATIZING',
        encrypt: 'ENCRYPTING'
      },
      PRIVATIZING: { // Protecting the base connection
        done: 'PRIVATIZED',
        disconnect: 'DISCONNECTING'
      },
      PRIVATIZED: { // Base connection is protected
        encrypt: 'ENCRYPTING'
      },
      ENCRYPTING: { // Encrypting the base connection
        done: 'ENCRYPTED',
        disconnect: 'DISCONNECTING'
      },
      ENCRYPTED: { // Upgrading could not happen, the connection is encrypted and waiting
        upgrade: 'UPGRADING',
        disconnect: 'DISCONNECTING'
      },
      UPGRADING: { // Attempting to upgrade the connection with muxers
        done: 'MUXED'
      },
      MUXED: {
        disconnect: 'DISCONNECTING'
      },
      DISCONNECTING: { // Shutting down the connection
        done: 'DISCONNECTED'
      }
    })

    this._state.on('DISCONNECTED', () => this._onDisconnected())
    this._state.on('PRIVATIZING', () => this._onPrivatizing())
    this._state.on('PRIVATIZED', () => this._onPrivatized())
    this._state.on('ENCRYPTING', () => this._onEncrypting())
    this._state.on('ENCRYPTED', () => {
      this.log('successfully encrypted connection to %s', this.theirB58Id || 'unknown peer')
      this.emit('encrypted', this.conn)
    })
    this._state.on('UPGRADING', () => this._onUpgrading())
    this._state.on('MUXED', () => {
      this.log('successfully muxed connection to %s', this.theirB58Id || 'unknown peer')
      this.emit('muxed', this.conn)
    })
    this._state.on('DISCONNECTING', () => {
      this._state('done')
    })
  }

  /**
   * Attempts to encrypt `this.conn` with the Switch's crypto.
   *
   * @private
   * @fires IncomingConnectionFSM#error
   * @returns {void}
   */
  _onEncrypting () {
    this.log('encrypting connection via %s', this.switch.crypto.tag)

    this.msListener.addHandler(this.switch.crypto.tag, (protocol, _conn) => {
      this.conn = this.switch.crypto.encrypt(this.ourPeerInfo.id, _conn, undefined, (err) => {
        if (err) {
          return this.close(err)
        }
        this.conn.getPeerInfo((_, peerInfo) => {
          this.theirPeerInfo = peerInfo
          this._state('done')
        })
      })
    }, null)

    // Start handling the connection
    this.msListener.handle(this.conn, (err) => {
      if (err) {
        this.emit('crypto handshaking failed', err)
      }
    })
  }

  _onUpgrading () {
    this.log('adding the protocol muxer to the connection')
    this.protocolMuxer(this.conn, this.msListener)
    this._state('done')
  }
}

module.exports = withIs(IncomingConnectionFSM, {
  className: 'IncomingConnectionFSM',
  symbolName: 'libp2p-switch/IncomingConnectionFSM'
})
