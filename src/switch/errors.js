'use strict'

const errCode = require('err-code')

module.exports = {
  CONNECTION_FAILED: (err) => errCode(err, 'CONNECTION_FAILED'),
  DIAL_ABORTED: () => errCode('Dial was aborted', 'DIAL_ABORTED'),
  ERR_DENIED: () => errCode('Dial is currently denied for this peer', 'ERR_DENIED'),
  DIAL_SELF: () => errCode('A node cannot dial itself', 'DIAL_SELF'),
  INVALID_STATE_TRANSITION: (err) => errCode(err, 'INVALID_STATE_TRANSITION'),
  NO_TRANSPORTS_REGISTERED: () => errCode('No transports registered, dial not possible', 'NO_TRANSPORTS_REGISTERED'),
  PROTECTOR_REQUIRED: () => errCode('No protector provided with private network enforced', 'PROTECTOR_REQUIRED'),
  UNEXPECTED_END: () => errCode('Unexpected end of input from reader.', 'UNEXPECTED_END'),
  maybeUnexpectedEnd: (err) => {
    if (err === true) {
      return module.exports.UNEXPECTED_END()
    }
    return err
  }
}
