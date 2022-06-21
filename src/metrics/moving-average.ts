import type { MovingAverage } from '@libp2p/interface-metrics'

export class DefaultMovingAverage {
  public movingAverage: number
  public variance: number
  public deviation: number
  public forecast: number
  private readonly timespan: number
  private previousTime?: number

  constructor (timespan: number) {
    if (typeof timespan !== 'number') {
      throw new Error('must provide a timespan to the moving average constructor')
    }

    if (timespan <= 0) {
      throw new Error('must provide a timespan > 0 to the moving average constructor')
    }

    this.timespan = timespan
    this.movingAverage = 0
    this.variance = 0
    this.deviation = 0
    this.forecast = 0
  }

  alpha (t: number, pt: number) {
    return 1 - (Math.exp(-(t - pt) / this.timespan))
  }

  push (time: number, value: number) {
    if (this.previousTime != null) {
      // calculate moving average
      const a = this.alpha(time, this.previousTime)
      const diff = value - this.movingAverage
      const incr = a * diff
      this.movingAverage = a * value + (1 - a) * this.movingAverage
      // calculate variance & deviation
      this.variance = (1 - a) * (this.variance + diff * incr)
      this.deviation = Math.sqrt(this.variance)
      // calculate forecast
      this.forecast = this.movingAverage + a * diff
    } else {
      this.movingAverage = value
    }

    this.previousTime = time
  }
}

export function createMovingAverage (timespan: number): MovingAverage {
  return new DefaultMovingAverage(timespan)
}
