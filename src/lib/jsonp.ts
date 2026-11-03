// Minimal JSONP helper. The Deezer API sends no CORS headers but supports
// `output=jsonp&callback=...`, which is the documented way to call it from a
// browser.

let counter = 0

export function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('JSONP needs a DOM'))
      return
    }
    const cb = `__amandleJsonp${Date.now().toString(36)}${counter++}`
    const w = window as unknown as Record<string, unknown>
    const script = document.createElement('script')
    const timer = window.setTimeout(() => finish(new Error('JSONP timeout')), timeoutMs)

    function finish(err: Error | null, data?: T) {
      window.clearTimeout(timer)
      delete w[cb]
      script.remove()
      if (err) reject(err)
      else resolve(data as T)
    }

    w[cb] = (data: T) => finish(null, data)
    script.onerror = () => finish(new Error('JSONP load error'))
    const sep = url.includes('?') ? '&' : '?'
    script.src = `${url}${sep}output=jsonp&callback=${cb}`
    document.head.appendChild(script)
  })
}
