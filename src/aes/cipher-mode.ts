import errcode from 'err-code'

const CIPHER_MODES = {
  16: 'aes-128-ctr',
  32: 'aes-256-ctr'
}

export function cipherMode (key: Uint8Array) {
  if (key.length === 16 || key.length === 32) {
    return CIPHER_MODES[key.length]
  }

  const modes = Object.entries(CIPHER_MODES).map(([k, v]) => `${k} (${v})`).join(' / ')
  throw errcode(new Error(`Invalid key length ${key.length} bytes. Must be ${modes}`), 'ERR_INVALID_KEY_LENGTH')
}
