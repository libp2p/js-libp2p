
export const nopSource = {
  async *[Symbol.asyncIterator]() {}
}

export const nopSink = async (_: any) => {}
