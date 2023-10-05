import { multiaddr } from '@multiformats/multiaddr'

export const validateMultiaddr = (value: Array<string | undefined> | undefined): boolean => {
  value?.forEach((addr) => {
    try {
      multiaddr(addr)
    } catch (err) {
      throw new Error(`invalid multiaddr: ${addr}`)
    }
  })
  return true
}
