const charset = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')
export const genUfrag = (len: number): string => [...Array(len)].map(() => charset.at(Math.floor(Math.random() * charset.length))).join('')
