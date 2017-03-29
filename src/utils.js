'use strict'

const leftPad = require('left-pad')

/**
 * Convert a JavaScript date into an `RFC3339Nano` formatted
 * string.
 *
 * @param {Date} time
 * @returns {string}
 */
module.exports.toRFC3339 = (time) => {
  const year = time.getUTCFullYear()
  const month = leftPad(time.getUTCMonth() + 1, 2, '0')
  const day = leftPad(time.getUTCDate(), 2, '0')
  const hour = leftPad(time.getUTCHours(), 2, '0')
  const minute = leftPad(time.getUTCMinutes(), 2, '0')
  const seconds = leftPad(time.getUTCSeconds(), 2, '0')
  const milliseconds = time.getUTCMilliseconds()
  const nanoseconds = milliseconds * 1000 * 1000

  return `${year}-${month}-${day}T${hour}:${minute}:${seconds}.${nanoseconds}Z`
}

/**
 * Parses a date string formatted as `RFC3339Nano` into a
 * JavaScript Date object.
 *
 * @param {string} time
 * @returns {Date}
 */
module.exports.parseRFC3339 = (time) => {
  const rfc3339Matcher = new RegExp(
    // 2006-01-02T
    '(\\d{4})-(\\d{2})-(\\d{2})T' +
    // 15:04:05
    '(\\d{2}):(\\d{2}):(\\d{2})' +
    // .999999999Z
    '\\.(\\d+)Z'
  )
  const m = String(time).trim().match(rfc3339Matcher)

  if (!m) {
    throw new Error('Invalid format')
  }

  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10) - 1
  const date = parseInt(m[3], 10)
  const hour = parseInt(m[4], 10)
  const minute = parseInt(m[5], 10)
  const second = parseInt(m[6], 10)
  const millisecond = parseInt(m[7].slice(0, -6), 10)

  return new Date(Date.UTC(year, month, date, hour, minute, second, millisecond))
}
