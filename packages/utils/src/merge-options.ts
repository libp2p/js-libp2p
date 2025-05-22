import isOptionObject from 'is-plain-obj'

const { hasOwnProperty } = Object.prototype
const { propertyIsEnumerable } = Object
const defineProperty = (object: any, name: any, value: any): void => {
  Object.defineProperty(object, name, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  })
}

const globalThis = this
const defaultMergeOptions = {
  concatArrays: false,
  ignoreUndefined: false
}

const getEnumerableOwnPropertyKeys = (value: any): any[] => {
  const keys = []

  for (const key in value) {
    if (hasOwnProperty.call(value, key)) {
      keys.push(key)
    }
  }

  /* istanbul ignore else  */
  if (Object.getOwnPropertySymbols) {
    const symbols = Object.getOwnPropertySymbols(value)

    for (const symbol of symbols) {
      if (propertyIsEnumerable.call(value, symbol)) {
        keys.push(symbol)
      }
    }
  }

  return keys
}

function clone <T> (value: T): T
function clone <T> (value: T[]): T[]
function clone (value: any): any {
  if (Array.isArray(value)) {
    return cloneArray(value)
  }

  if (isOptionObject(value)) {
    return cloneOptionObject(value)
  }

  return value
}

function cloneArray <T> (array: T[]): T[] {
  const result = array.slice(0, 0)

  getEnumerableOwnPropertyKeys(array).forEach(key => {
    defineProperty(result, key, clone(array[key]))
  })

  return result
}

function cloneOptionObject (object: any): any {
  const result = Object.getPrototypeOf(object) === null ? Object.create(null) : {}

  getEnumerableOwnPropertyKeys(object).forEach(key => {
    defineProperty(result, key, clone(object[key]))
  })

  return result
}

const mergeKeys = (merged: any, source: any, keys: any[], config: any): any => {
  keys.forEach(key => {
    if (typeof source[key] === 'undefined' && config.ignoreUndefined) {
      return
    }

    // Do not recurse into prototype chain of merged
    if (key in merged && merged[key] !== Object.getPrototypeOf(merged)) {
      defineProperty(merged, key, merge(merged[key], source[key], config))
    } else {
      defineProperty(merged, key, clone(source[key]))
    }
  })

  return merged
}

/**
 * see [Array.prototype.concat ( ...arguments )](http://www.ecma-international.org/ecma-262/6.0/#sec-array.prototype.concat)
 */
const concatArrays = (merged: any, source: any, config: any): any => {
  let result = merged.slice(0, 0)
  let resultIndex = 0;

  [merged, source].forEach(array => {
    const indices: any[] = []

    // `result.concat(array)` with cloning
    for (let k = 0; k < array.length; k++) {
      if (!hasOwnProperty.call(array, k)) {
        continue
      }

      indices.push(String(k))

      if (array === merged) {
        // Already cloned
        defineProperty(result, resultIndex++, array[k])
      } else {
        defineProperty(result, resultIndex++, clone(array[k]))
      }
    }

    // Merge non-index keys
    result = mergeKeys(result, array, getEnumerableOwnPropertyKeys(array).filter(key => !indices.includes(key)), config)
  })

  return result
}

function merge (merged: any, source: any, config: any): any {
  if (config.concatArrays && Array.isArray(merged) && Array.isArray(source)) {
    return concatArrays(merged, source, config)
  }

  if (!isOptionObject(source) || !isOptionObject(merged)) {
    return clone(source)
  }

  return mergeKeys(merged, source, getEnumerableOwnPropertyKeys(source), config)
}

/**
 * Port of `merge-options` to typescript
 *
 * @see https://github.com/schnittstabil/merge-options/pull/28
 */
export function mergeOptions (this: any, ...options: any[]): any {
  const config = merge(clone(defaultMergeOptions), (this !== globalThis && this) || {}, defaultMergeOptions)
  let merged = { _: {} }

  for (const option of options) {
    if (option === undefined) {
      continue
    }

    if (!isOptionObject(option)) {
      throw new TypeError('`' + option + '` is not an Option Object')
    }

    merged = merge(merged, { _: option }, config)
  }

  return merged._
}
