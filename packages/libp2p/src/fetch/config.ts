import { number, object, string } from "yup"
import { fetchService, type FetchService, type FetchServiceComponents, type FetchServiceInit } from "./index.js"
import { TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from "./constants.js"

export const validateFetchConfig = (opts: FetchServiceInit): (components: FetchServiceComponents) => FetchService => {
  return fetchService(object({
    protocolPrefix: string().default('ipfs'),
    timeout: number().integer().default(TIMEOUT),
    maxInboundStreams: number().integer().min(0).default(MAX_INBOUND_STREAMS),
    maxOutboundStreams: number().integer().min(0).default(MAX_OUTBOUND_STREAMS),
  }).validateSync(opts))
}
