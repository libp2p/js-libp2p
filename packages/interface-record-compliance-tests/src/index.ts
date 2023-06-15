import { expect } from 'aegir/chai'
import type { TestSetup } from '@libp2p/interface-compliance-tests'
import type { Record } from '@libp2p/interface-record'

export default (test: TestSetup<Record>): void => {
  describe('record', () => {
    let record: Record

    beforeEach(async () => {
      record = await test.setup()
    })

    afterEach(async () => {
      await test.teardown()
    })

    it('has domain and codec', () => {
      expect(record.domain).to.exist()
      expect(record.codec).to.exist()
    })

    it('is able to marshal', () => {
      const rawData = record.marshal()
      expect(rawData).to.have.property('byteLength')
    })

    it('is able to compare two records', () => {
      const equals = record.equals(record)
      expect(equals).to.eql(true)
    })
  })
}
