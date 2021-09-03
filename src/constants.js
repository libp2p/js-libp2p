'use strict'

// MaxRecordAge specifies the maximum time that any node will hold onto a record
// from the time its received. This does not apply to any other forms of validity that
// the record may contain.
// For example, a record may contain an ipns entry with an EOL saying its valid
// until the year 2020 (a great time in the future). For that record to stick around
// it must be rebroadcasted more frequently than once every 'MaxRecordAge'

const second = exports.second = 1000
const minute = exports.minute = 60 * second
const hour = exports.hour = 60 * minute

exports.MAX_RECORD_AGE = 36 * hour

exports.PROTOCOL_DHT = '/kad/1.0.0'

exports.PROVIDERS_KEY_PREFIX = '/providers/'

exports.PROVIDERS_LRU_CACHE_SIZE = 256

exports.PROVIDERS_VALIDITY = 24 * hour

exports.PROVIDERS_CLEANUP_INTERVAL = hour

exports.READ_MESSAGE_TIMEOUT = 10 * second

// The number of records that will be retrieved on a call to getMany()
exports.GET_MANY_RECORD_COUNT = 16

// K is the maximum number of requests to perform before returning failure
exports.K = 20

// Alpha is the concurrency for asynchronous requests
exports.ALPHA = 3
