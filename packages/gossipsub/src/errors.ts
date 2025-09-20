export class InvalidPeerScoreParamsError extends Error {
  static name = 'InvalidPeerScoreParamsError'

  constructor (message = 'Invalid peer score params') {
    super(message)
    this.name = 'InvalidPeerScoreParamsError'
  }
}

export class InvalidPeerScoreThresholdsError extends Error {
  static name = 'InvalidPeerScoreThresholdsError'

  constructor (message = 'Invalid peer score thresholds') {
    super(message)
    this.name = 'InvalidPeerScoreThresholdsError'
  }
}
