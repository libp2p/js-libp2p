/**
 * Pseudo-randomly shuffles an array
 *
 * Mutates the input array
 */
export function shuffle<T>(arr: T[]): T[] {
  if (arr.length <= 1) {
    return arr
  }
  const randInt = () => {
    return Math.floor(Math.random() * Math.floor(arr.length))
  }

  for (let i = 0; i < arr.length; i++) {
    const j = randInt()
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
