export const nopSource = async function * nop (): AsyncGenerator<Uint8Array, any, unknown> {}

export const nopSink = async (_: any): Promise<void> => {}

const charset = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')
export const genUfrag = (len: number): string => [...Array(len)].map(() => charset.at(Math.floor(Math.random() * charset.length))).join('')
