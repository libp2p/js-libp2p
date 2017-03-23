'use strict'

const debug = require('debug')
const log = debug('libp2p:websockets:dialer')

function maToUrl (ma) {
  const maStrSplit = ma.toString().split('/')

  let proto
  try {
    proto = ma.protoNames().filter((proto) => {
      return proto === 'ws' || proto === 'wss'
    })[0]
  } catch (e) {
    log(e)
    throw new Error('Not a valid websocket address', e)
  }

  let port
  try {
    port = ma.stringTuples().filter((tuple) => {
      if (tuple[0] === ma.protos().filter((proto) => {
        return proto.name === 'tcp'
      })[0].code) {
        return true
      }
    })[0][1]
  } catch (e) {
    log('No port, skipping')
  }

  let url = `${proto}://${maStrSplit[2]}${(port && (port !== 80 || port !== 443) ? `:${port}` : '')}`

  return url
}

module.exports = maToUrl
