import { WebCryptoMissingError } from '../errors.ts'

// Check native crypto exists and is enabled (in insecure browser contexts
// `globalThis.crypto` exists but `globalThis.crypto.subtle` does not).
export default {
  get (win = globalThis): Crypto {
    const nativeCrypto = win.crypto

    if (nativeCrypto?.subtle == null) {
      throw new WebCryptoMissingError(
        'Missing Web Crypto API. ' +
        'The most likely cause of this error is that this page is being accessed ' +
        'from an insecure context (i.e. not HTTPS). For more information and ' +
        'possible resolutions see ' +
        'https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/README.md#web-crypto-api'
      )
    }

    return nativeCrypto
  }
}
