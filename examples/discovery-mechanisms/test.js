import test1 from './test-1.js'
import test2 from './test-2.js'
import test3 from './test-3.js'

export default async function test () {
  await test1()
  await test2()
  await test3()
}
