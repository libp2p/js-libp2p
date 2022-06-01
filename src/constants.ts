// MaxRecordAge specifies the maximum time that any node will hold onto a record
// from the time its received. This does not apply to any other forms of validity that
// the record may contain.
// For example, a record may contain an ipns entry with an EOL saying its valid
// until the year 2020 (a great time in the future). For that record to stick around
// it must be rebroadcasted more frequently than once every 'MaxRecordAge'

export const second = 1000
export const minute = 60 * second
export const hour = 60 * minute

export const MAX_RECORD_AGE = 36 * hour

export const LAN_PREFIX = '/lan'

export const PROTOCOL_PREFIX = '/ipfs'

export const PROTOCOL_DHT = '/kad/1.0.0'

export const RECORD_KEY_PREFIX = '/dht/record'

export const PROVIDER_KEY_PREFIX = '/dht/provider'

export const PROVIDERS_LRU_CACHE_SIZE = 256

export const PROVIDERS_VALIDITY = 24 * hour

export const PROVIDERS_CLEANUP_INTERVAL = hour

export const READ_MESSAGE_TIMEOUT = 10 * second

// The number of records that will be retrieved on a call to getMany()
export const GET_MANY_RECORD_COUNT = 16

// K is the maximum number of requests to perform before returning failure
export const K = 20

// Alpha is the concurrency for asynchronous requests
export const ALPHA = 3

// How often we look for our closest DHT neighbours
export const QUERY_SELF_INTERVAL = Number(5 * minute)

// How long to look for our closest DHT neighbours for
export const QUERY_SELF_TIMEOUT = Number(30 * second)

// How often we try to find new peers
export const TABLE_REFRESH_INTERVAL = Number(5 * minute)

// How how long to look for new peers for
export const TABLE_REFRESH_QUERY_TIMEOUT = Number(30 * second)

// When a timeout is not specified, run a query for this long
export const DEFAULT_QUERY_TIMEOUT = Number(30 * second)
