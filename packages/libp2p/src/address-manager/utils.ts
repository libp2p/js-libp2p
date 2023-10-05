import { type ObjectSchema, object, array, string, mixed } from 'yup'
import { validateMultiaddr } from '../config/helpers.js'
import type { AddressManagerInit } from '.'
import type { Multiaddr } from '@multiformats/multiaddr'

export function debounce (func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return function () {
    const later = function (): void {
      timeout = undefined
      func()
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function validateAddressManagerConfig (opts: AddressManagerInit): ObjectSchema<Record<string, unknown>> {
  return object({
    listen: array().of(string()).test('is multiaddr', validateMultiaddr).default([]),
    announce: array().of(string()).test('is multiaddr', validateMultiaddr).default([]),
    noAnnounce: array().of(string()).test('is multiaddr', validateMultiaddr).default([]),
    announceFilter: mixed().default(() => (addrs: Multiaddr[]): Multiaddr[] => addrs)
  })
}
