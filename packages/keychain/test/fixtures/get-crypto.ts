import { ecdsaCrypto, ed25519Crypto, rsaCrypto } from '@ipshipyard/crypto'
import type { CryptoLoader } from '../../src/index.ts'
import type { Crypto } from '@ipshipyard/crypto'

function isPromise <T = any> (obj?: any): obj is Promise<T> {
  return typeof obj?.then === 'function'
}

export function getCrypto (initialCryptos: Array<Crypto> = [], loadCrypto?: CryptoLoader): CryptoLoader {
  const cryptos: Record<string | number, Crypto> = {}

  initialCryptos = [
    ecdsaCrypto(),
    ed25519Crypto(),
    rsaCrypto(),
    ...initialCryptos
  ]

  initialCryptos.forEach(crypto => {
    cryptos[crypto.type] = crypto
    cryptos[crypto.code] = crypto
  })

  return async (nameOrCode) => {
    let crypto = cryptos[nameOrCode]

    if (crypto == null && loadCrypto != null) {
      const res = loadCrypto(nameOrCode)

      if (isPromise(res)) {
        crypto = await res
      } else {
        crypto = res
      }

      cryptos[crypto.type] = crypto
      cryptos[crypto.code] = crypto
    }

    if (crypto != null) {
      return crypto
    }

    throw new Error(`Could not load crypto for ${crypto}`)
  }
}
