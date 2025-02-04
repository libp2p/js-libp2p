import { encode, decode } from 'cborg'
import { CustomProgressEvent } from 'progress-events'
import type { ValueCodec } from 'it-rpc'

export const customProgressEventCodec: ValueCodec<CustomProgressEvent> = {
  type: 4099,
  canEncode: (val) => val instanceof CustomProgressEvent,
  encode: (val, codec, context, invocation) => encode({
    type: val.type,
    detail: codec.toValue(val.detail, context, invocation)
  }),
  decode: (val, codec, pushable, invocation) => {
    const { type, detail } = decode(val)

    return new CustomProgressEvent(type, codec.fromValue(detail, pushable, invocation))
  }
}
