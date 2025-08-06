import { expect } from 'aegir/chai'
import { raceEvent } from 'race-event'
import { MessageQueue } from '../src/message-queue.ts'

export interface Events {
  event: Event
}

describe('message-queue', () => {
  it('should send data', async () => {
    const event = new Event('event')
    const queue = new MessageQueue()
    const eventPromise = raceEvent(queue, 'event')
    queue.send(event)

    await expect(eventPromise).to.eventually.equal(event)
  })

  it('should send data after a delay', async () => {
    const event = new Event('event')
    const queue = new MessageQueue({
      delay: 10
    })
    queue.send(event)

    const sent = await raceEvent(queue, 'event')

    expect(sent).to.equal(event)
  })

  it('should limit capacity', async () => {
    const sent: Event[] = [
      new Event('event'),
      new Event('event'),
      new Event('event'),
      new Event('event'),
      new Event('event')
    ]
    const received: Event[] = []

    const queue = new MessageQueue<Events>({
      delay: 10,
      capacity: 5
    })

    queue.addEventListener('event', evt => {
      received.push(evt)
    })

    expect(queue.send(sent[0])).to.be.true()
    expect(queue.send(sent[1])).to.be.true()
    expect(queue.send(sent[2])).to.be.true()
    expect(queue.send(sent[3])).to.be.true()
    expect(queue.send(sent[4])).to.be.false()

    await raceEvent(queue, 'drain')

    expect(received).to.deep.equal(sent)
  })
})
