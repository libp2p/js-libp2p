// https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#rpc-messages
export const MAX_DCUTR_MESSAGE_SIZE = 1024 * 4
// ensure the dial has a high priority to jump to the head of the dial queue
export const DCUTR_DIAL_PRIORITY = 100

export const DEFAULT_MAX_INBOUND_STREAMS = 1

export const DEFAULT_MAX_OUTBOUND_STREAMS = 1

export const DEFAULT_TIMEOUT = 5000

export const DEFAULT_RETRIES = 3
