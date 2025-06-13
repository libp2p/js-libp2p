/**
 * Implements exponential moving average. Ported from `moving-average`.
 *
 * @see https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
 * @see https://www.npmjs.com/package/moving-average
 */
export class MovingAverage {
  public movingAverage: number
  public variance: number
  public deviation: number
  public forecast: number
  private readonly timeSpan: number
  private previousTime?: number

  constructor (timeSpan: number) {
    this.timeSpan = timeSpan
    this.movingAverage = 0
    this.variance = 0
    this.deviation = 0
    this.forecast = 0
  }

  alpha (t: number, pt: number): number {
    return 1 - (Math.exp(-(t - pt) / this.timeSpan))
  }

  push (value: number, time: number = Date.now()): void {
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
