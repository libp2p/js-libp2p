/* eslint-env browser */

// Check native crypto exists and is enabled (In insecure context `self.crypto`
// exists but `self.crypto.subtle` does not).
export default {
  get (win = globalThis) {
    const nativeCrypto = win.crypto

    if (nativeCrypto?.subtle == null) {
      throw Object.assign(
        new Error(
          'Missing Web Crypto API. ' +
          'The most likely cause of this error is that this page is being accessed ' +
          'from an insecure context (i.e. not HTTPS). For more information and ' +
          'possible resolutions see ' +
          'https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/README.md#web-crypto-api'
        ),
        { code: 'ERR_MISSING_WEB_CRYPTO' }
      )
    }

    return nativeCrypto
  }
}
