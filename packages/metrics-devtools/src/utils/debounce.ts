export function debounce (callback: () => void, wait: number = 100): () => void {
  let timeout: ReturnType<typeof setTimeout>
  let start: number | undefined

  return (): void => {
    if (start == null) {
      start = Date.now()
    }

    if (timeout != null && Date.now() - start > wait) {
      clearTimeout(timeout)
      start = undefined
      callback()
      return
    }

    clearTimeout(timeout)
    timeout = setTimeout(() => {
      start = undefined
      callback()
    }, wait)
  }
}
