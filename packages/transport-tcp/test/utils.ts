/**
 * A delayed promise that doesn't keep the node process running
 */
export async function delay (ms: number): Promise<void> {
  await new Promise<void>(resolve => {
    AbortSignal.timeout(ms).addEventListener('abort', () => {
      resolve()
    }, {
      once: true
    })
  })
}
