/**
 * Finds the first item in a collection that is matched in the
 * `asyncCompare` function.
 *
 * `asyncCompare` is an async function that must
 * resolve to either `true` or `false`.
 *
 * @param {Array} array
 * @param {function(*)} asyncCompare - An async function that returns a boolean
 */
export async function findAsync <T> (array: T[], asyncCompare: (val: T) => Promise<any>): Promise<T | undefined> {
  const promises = array.map(asyncCompare)
  const results = await Promise.all(promises)
  const index = results.findIndex(result => result)
  return array[index]
}
