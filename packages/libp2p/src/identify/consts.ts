
import { version } from '../version.js'

export const PROTOCOL_VERSION = 'ipfs/0.1.0' // deprecated
export const AGENT_VERSION = `js-libp2p/${version}`
export const MULTICODEC_IDENTIFY = '/ipfs/id/1.0.0' // deprecated
export const MULTICODEC_IDENTIFY_PUSH = '/ipfs/id/push/1.0.0' // deprecated

export const IDENTIFY_PROTOCOL_VERSION = '0.1.0'
export const MULTICODEC_IDENTIFY_PROTOCOL_NAME = 'id'
export const MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME = 'id/push'
export const MULTICODEC_IDENTIFY_PROTOCOL_VERSION = '1.0.0'
export const MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION = '1.0.0'
