import { test as test1 } from './test-1.js'
import { test as testMessageFiltering } from './message-filtering/test.js'

export async function test() {
  await test1()
  await testMessageFiltering()
}
