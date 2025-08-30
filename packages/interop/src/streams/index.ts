import { runTests } from '../utils/test-matrix.js'
import { echoStreamTests } from './echo.js'
import type { DaemonFactory } from '../index.js'

export async function streamTests (factory: DaemonFactory): Promise<void> {
  runTests('echo', echoStreamTests, factory)
}
