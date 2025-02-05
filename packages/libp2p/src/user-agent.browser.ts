import * as pkg from './version.js'

export function userAgent (name?: string, version?: string): string {
  return `${name ?? pkg.name}/${version ?? pkg.version} browser/${globalThis.navigator.userAgent}`
}
