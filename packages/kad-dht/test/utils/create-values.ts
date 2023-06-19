import { randomBytes } from '@libp2p/crypto'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

export interface Value {
  cid: CID
  value: Uint8Array
}

export async function createValues (length: number): Promise<Value[]> {
  return Promise.all(
    Array.from({ length }).map(async () => {
      const bytes = randomBytes(32)
      const h = await sha256.digest(bytes)
      return {
        cid: CID.createV1(raw.code, h),
        value: bytes
      }
    })
  )
}
