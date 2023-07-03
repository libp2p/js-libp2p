import { number, object, string } from "yup"
import { PingService, PingServiceComponents, PingServiceInit, pingService } from "./index.js"
import { MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS, PROTOCOL_PREFIX, TIMEOUT } from "./constants.js"

export const validatePingConfig = (opts: PingServiceInit): (components: PingServiceComponents) => PingService => {
  return pingService(object({
    protocolPrefix: string().default(PROTOCOL_PREFIX),
    timeout: number().integer().default(TIMEOUT),
    maxInboundStreams: number().integer().min(0).default(MAX_INBOUND_STREAMS),
    maxOutboundStreams: number().integer().min(0).default(MAX_OUTBOUND_STREAMS)
  }).validateSync(opts))
}
