import { runTests } from '../utils/test-matrix.ts'
import { echoStreamTests } from './echo.ts'
import type { DaemonFactory } from '../index.ts'

export async function streamTests (factory: DaemonFactory): Promise<void> {
  runTests('echo', echoStreamTests, factory)
}
