export async function sleep (ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(() => { resolve(ms) }, ms))
}
