import { UnimplementedError } from '../../error.ts'
import type { Logger } from '@libp2p/interface'

export { parseStunUsernameUfrags } from './stun.ts'

export interface StunServer {
  close(): Promise<void>
  address(): never
}

export interface Callback {
  (serverUfrag: string, clientUfrag: string, clientPwd: string | undefined, remoteHost: string, remotePort: number): void
}

export async function stunListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  throw new UnimplementedError('stunListener')
}
