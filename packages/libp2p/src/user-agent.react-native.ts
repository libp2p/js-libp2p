import { Platform } from 'react-native'
import * as pkg from './version.js'

export function userAgent (name?: string, version?: string): string {
  return `${name ?? pkg.name}/${version ?? pkg.version} react-native/${Platform.OS}-${`${Platform.Version}`.replaceAll('v', '')}`
}
