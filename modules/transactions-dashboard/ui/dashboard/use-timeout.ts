"use client"

import { useCallback, useEffect, useRef } from "react"

function useTimeout() {
  const timeoutByKeyRef = useRef(new Map<string, number>())

  const clearTimeoutByKey = useCallback((key: string): void => {
    const timeoutId = timeoutByKeyRef.current.get(key)

    if (timeoutId === undefined) {
      return
    }

    window.clearTimeout(timeoutId)
    timeoutByKeyRef.current.delete(key)
  }, [])

  const clearAllTimeouts = useCallback((): void => {
    timeoutByKeyRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId)
    })
    timeoutByKeyRef.current.clear()
  }, [])

  const scheduleTimeout = useCallback(
    (key: string, callback: () => void, delayMs: number): void => {
      clearTimeoutByKey(key)

      const timeoutId = window.setTimeout(() => {
        timeoutByKeyRef.current.delete(key)
        callback()
      }, delayMs)

      timeoutByKeyRef.current.set(key, timeoutId)
    },
    [clearTimeoutByKey]
  )

  useEffect(() => clearAllTimeouts, [clearAllTimeouts])

  return {
    clearAllTimeouts,
    clearTimeout: clearTimeoutByKey,
    scheduleTimeout,
  }
}

export { useTimeout }
