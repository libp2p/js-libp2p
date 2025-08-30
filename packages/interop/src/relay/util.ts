import { pbStream, echo } from '@libp2p/utils'
import { HopMessage } from './pb/index.js'
import type { Daemon } from '../index.js'
import type { PeerId, Stream } from '@libp2p/interface'

const RELAY_V2_HOP = '/libp2p/circuit/relay/0.2.0/hop'

export const reserve = async (d: Daemon, peerID: PeerId, message?: Partial<HopMessage>): Promise<HopMessage> => {
  const stream = await d.client.openStream(peerID, RELAY_V2_HOP)
  const pb = pbStream(stream)
  await pb.write({
    type: HopMessage.Type.RESERVE,
    ...(message ?? {})
  }, HopMessage)

  return pb.read(HopMessage)
}

export const echoHandler = {
  protocol: '/echo/1.0.0',
  handler: async (stream: Stream) => {
    await echo(stream)
  }
}
