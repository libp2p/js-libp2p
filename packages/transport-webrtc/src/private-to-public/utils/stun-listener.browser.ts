import { UnimplementedError } from '../../error.ts'
import type { StunRequestCallback } from './stun.ts'
import type { Logger } from '@libp2p/interface'

export { parseStunUsernameUfrags } from './stun.ts'

export interface StunServer {
  close(): Promise<void>
  address(): never
}

export async function stunListener (host: string, port: number, log: Logger, cb: StunRequestCallback): Promise<StunServer> {
  throw new UnimplementedError('stunListener')
}
