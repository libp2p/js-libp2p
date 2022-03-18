import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * Convert a namespace string into a cid
 */
export async function namespaceToCid (namespace: string): Promise<CID> {
  const bytes = new TextEncoder().encode(namespace)
  const hash = await sha256.digest(bytes)

  return CID.createV0(hash)
}
