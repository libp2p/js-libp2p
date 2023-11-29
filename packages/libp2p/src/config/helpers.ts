import { CodeError } from '@libp2p/interface/errors'
import { multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'

export const validateMultiaddr = (value: Array<string | undefined> | undefined): boolean => {
  if (value == null || value === undefined) {
    return false
  }

  value?.forEach((addr) => {
    try {
      multiaddr(addr)
    } catch (err) {
      throw new CodeError(`invalid multiaddr: ${addr}`, codes.ERR_INVALID_MULTIADDR)
    }
  })

  return true
}
