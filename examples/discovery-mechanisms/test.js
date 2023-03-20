import { test as test1 } from './test-1.js'
import { test as test2 } from './test-2.js'
import { test as test3 } from './test-3.js'

export async function test () {
  await test1()
  await test2()
  await test3()
}
