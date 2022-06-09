
export function mapIterable <T, R> (iter: IterableIterator<T>, map: (val: T) => R): IterableIterator<R> {
  const iterator: IterableIterator<R> = {
    [Symbol.iterator]: () => {
      return iterator
    },
    next: () => {
      const next = iter.next()
      const val = next.value

      if (next.done === true || val == null) {
        const result: IteratorReturnResult<any> = {
          done: true,
          value: undefined
        }

        return result
      }

      return {
        done: false,
        value: map(val)
      }
    }
  }

  return iterator
}
