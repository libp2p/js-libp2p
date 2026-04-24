import { raceSignal } from 'race-signal'
import type { AbortOptions } from '@libp2p/interface'
import type { QuicSession } from 'node:quic'

export async function getRemoteCertificate (session: QuicSession, options?: AbortOptions): Promise<Uint8Array> {
  const p = new Promise<Uint8Array>((resolve) => {
    session.onhandshake = () => {
      // @ts-expect-error missing from types
      resolve(session.peerCertificate.raw())
    }
  })

  return raceSignal(p, options?.signal)
}
