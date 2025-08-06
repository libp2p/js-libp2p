import type { MessageStream } from '@libp2p/interface'

export function redirect (channelA: MessageStream, channelB: MessageStream): void {
  channelA.addEventListener('message', (evt) => {
    const sendMore = channelB.send(evt.data)

    if (sendMore === false) {
      channelA.pause()

      channelA.addEventListener('drain', () => {
        channelA.resume()
      }, {
        once: true
      })
    }
  })

  channelB.addEventListener('message', (evt) => {
    const sendMore = channelA.send(evt.data)

    if (sendMore === false) {
      channelB.pause()

      channelB.addEventListener('drain', () => {
        channelB.resume()
      }, {
        once: true
      })
    }
  })
}
