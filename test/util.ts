import { expect } from 'chai'

export const expectError = (error: unknown, message: string) => {
  if (error instanceof Error) {
    expect(error.message).to.equal(message)
  } else {
    expect('Did not throw error:').to.equal(message)
  }
}
