import { number, object, string } from 'yup'
import { AGENT_VERSION, MAX_IDENTIFY_MESSAGE_SIZE, MAX_INBOUND_STREAMS } from './consts.js'
import { identifyService, type IdentifyServiceComponents, type IdentifyServiceInit } from './index.js'
import type { DefaultIdentifyService } from './identify.js'

export const validateIdentifyConfig = (opts: IdentifyServiceInit): (components: IdentifyServiceComponents) => DefaultIdentifyService => {
  return identifyService(object({
    protocolPrefix: string().default('ipfs'),
    agentVersion: string().default(AGENT_VERSION),
    timeout: number().integer().default(60000),
    maxIdentifyMessageSize: number().integer().min(0).default(MAX_IDENTIFY_MESSAGE_SIZE),
    maxInboundStreams: number().integer().min(0).default(MAX_INBOUND_STREAMS),
    maxOutboundStreams: number().integer().min(0).default(0)
  }).validateSync(opts))
}
