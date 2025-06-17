import process from 'node:process'
import * as pkg from './version.js'

export function userAgent (name?: string, version?: string): string {
  let platform = 'node'
  let platformVersion = process.versions.node

  if (process.versions.deno != null) {
    platform = 'deno'
    platformVersion = process.versions.deno
  }

  if (process.versions.bun != null) {
    platform = 'bun'
    platformVersion = process.versions.bun
  }

  if (process.versions.electron != null) {
    platform = 'electron'
    platformVersion = process.versions.electron
  }

  return `${name ?? pkg.name}/${version ?? pkg.version} ${platform}/${platformVersion.replaceAll('v', '')}`
}
