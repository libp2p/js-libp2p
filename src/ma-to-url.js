'use strict'

const multiaddr = require('multiaddr')

function maToUrl (ma) {
  const maStrSplit = ma.toString().split('/')
  const proto = ma.protos()[2].name

  if (!(proto === 'ws' || proto === 'wss')) {
    throw new Error('invalid multiaddr' + ma.toString())
  }

  let url = ma.protos()[2].name + '://' + maStrSplit[2]

  if (!multiaddr.isName(ma)) {
    url += ':' + maStrSplit[4]
  }

  return url
}

module.exports = maToUrl
