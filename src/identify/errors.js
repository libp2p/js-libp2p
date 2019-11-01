'use strict'

const errCode = require('err-code')

module.exports = {
  ERR_CONNECTION_ENDED: () => errCode('conn was closed, did not receive data', 'ERR_CONNECTION_ENDED'),
  ERR_INVALID_MESSAGE: (err) => errCode(err, 'ERR_INVALID_MESSAGE'),
  ERR_INVALID_PEER: () => errCode('the identify peer does not match the peer associated with the connection', 'ERR_INVALID_PEER')
}
