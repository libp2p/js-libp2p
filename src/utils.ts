/**
 * Convert a JavaScript date into an `RFC3339Nano` formatted
 * string
 */
export function toRFC3339 (time: Date) {
  const year = time.getUTCFullYear()
  const month = String(time.getUTCMonth() + 1).padStart(2, '0')
  const day = String(time.getUTCDate()).padStart(2, '0')
  const hour = String(time.getUTCHours()).padStart(2, '0')
  const minute = String(time.getUTCMinutes()).padStart(2, '0')
  const seconds = String(time.getUTCSeconds()).padStart(2, '0')
  const milliseconds = time.getUTCMilliseconds()
  const nanoseconds = String(milliseconds * 1000 * 1000).padStart(9, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:${seconds}.${nanoseconds}Z`
}

/**
 * Parses a date string formatted as `RFC3339Nano` into a
 * JavaScript Date object
 */
export function parseRFC3339 (time: string) {
  const rfc3339Matcher = new RegExp(
    // 2006-01-02T
    '(\\d{4})-(\\d{2})-(\\d{2})T' +
    // 15:04:05
    '(\\d{2}):(\\d{2}):(\\d{2})' +
    // .999999999Z
    '\\.(\\d+)Z'
  )
  const m = String(time).trim().match(rfc3339Matcher)

  if (m == null) {
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
