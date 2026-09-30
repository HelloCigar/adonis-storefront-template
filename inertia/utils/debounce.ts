export const debounce = <Args extends unknown[]>(
  callback: (...args: Args) => unknown,
  wait: number
) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      void callback(...args)
    }, wait)
  }
}
