'use strict'

const errCode = require('err-code')

module.exports.PROTECTOR_REQUIRED = 'No protector provided with private network enforced'
module.exports.CONNECTION_FAILED = (err) => errCode(err, 'CONNECTION_FAILED')
module.exports.DIAL_SELF = () => errCode(new Error('A node cannot dial itself'), 'DIAL_SELF')
module.exports.NO_TRANSPORTS_REGISTERED = () => errCode(new Error('No transports registered, dial not possible'), 'NO_TRANSPORTS_REGISTERED')
module.exports.UNEXPECTED_END = () => errCode(new Error('Unexpected end of input from reader.'), 'UNEXPECTED_END')
module.exports.INVALID_STATE_TRANSITION = (err) => errCode(err, 'INVALID_STATE_TRANSITION')

module.exports.maybeUnexpectedEnd = (err) => {
  if (err === true) {
    return module.exports.UNEXPECTED_END()
  }
  return err
}
