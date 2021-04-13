'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:floodsub'), {
  error: debug('libp2p:floodsub:err')
})

module.exports = {
  log: log,
  multicodec: '/floodsub/1.0.0'
}
