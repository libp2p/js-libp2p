'use strict'

const map = require('pull-stream/throughs/map')
const EventEmitter = require('events')

/**
 * Takes a Switch and returns an Observer that can be used in conjunction with
 * observe-connection.js. The returned Observer comes with `incoming` and
 * `outgoing` properties that can be used in pull streams to emit all metadata
 * for messages that pass through a Connection.
 *
 * @param {Switch} swtch
 * @returns {EventEmitter}
 */
module.exports = (swtch) => {
  const observer = Object.assign(new EventEmitter(), {
    incoming: observe('in'),
    outgoing: observe('out')
  })

  swtch.on('peer-mux-established', (peerInfo) => {
    observer.emit('peer:connected', peerInfo.id.toB58String())
  })

  swtch.on('peer-mux-closed', (peerInfo) => {
    observer.emit('peer:closed', peerInfo.id.toB58String())
  })

  return observer

  function observe (direction) {
    return (transport, protocol, peerInfo) => {
      return map((buffer) => {
        willObserve(peerInfo, transport, protocol, direction, buffer.length)
        return buffer
      })
    }
  }

  function willObserve (peerInfo, transport, protocol, direction, bufferLength) {
    peerInfo.then((_peerInfo) => {
      if (_peerInfo) {
        const peerId = _peerInfo.id.toB58String()
        observer.emit('message', peerId, transport, protocol, direction, bufferLength)
      }
    })
  }
}
