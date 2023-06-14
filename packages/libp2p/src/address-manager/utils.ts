
export function debounce (func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return function () {
    const later = function (): void {
      timeout = undefined
      func()
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
