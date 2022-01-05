/**
 * Verify if two arrays of non primitive types with the "equals" function are equal.
 * Compatible with multiaddr, peer-id and others.
 */
export function arrayEquals (a: any[], b: any[]) {
  const sort = (a: any, b: any) => a.toString().localeCompare(b.toString())
  return a.length === b.length && b.sort(sort) && a.sort(sort).every((item, index) => b[index].equals(item))
}
