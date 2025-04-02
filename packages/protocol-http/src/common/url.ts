class Url extends URL {
  private _rawHostname: string | null = null

  constructor (url: string) {
    super(url)
    this._captureHostname(url)
  }

  private _captureHostname (url: string): void {
    if (super.hostname !== '' && !super.hostname.includes('.')) {
      const match = url.match(/:\/\/(.*?@)?(.*?)([:/]|$)/)
      if (match != null) {
        const originalHostname = match[2]
        if (originalHostname.toLowerCase() === super.hostname) {
          this._rawHostname = originalHostname
        }
      }
    }
  }

  get hostname (): string {
    return this._rawHostname ?? super.hostname
  }

  set hostname (value: string) {
    super.hostname = value
    this._rawHostname = !value.includes('.') ? value : null
  }

  get host (): string {
    if (this._rawHostname != null) {
      return super.port !== '' ? `${this._rawHostname}:${super.port}` : this._rawHostname
    }
    return super.host
  }

  set host (value: string) {
    super.host = value
    const [hostname] = value.split(':')
    this._rawHostname = !hostname.includes('.') ? hostname : null
  }

  get href (): string {
    return this._rawHostname == null ? super.href : this.toString()
  }

  set href (value: string) {
    super.href = value
    this._captureHostname(value)
  }

  toString (): string {
    if (this._rawHostname == null) {
      return super.toString()
    }

    // Simple string replacement - replace the lowercase hostname with our case-preserved one
    return super.toString().replace(super.hostname, this._rawHostname)
  }
}

export { Url as URL }
