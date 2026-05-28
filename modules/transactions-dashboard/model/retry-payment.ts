import { TRANSACTION_STATUS, type RetryPaymentResult } from "./types"

export const RETRY_FAILURE_RATE = 0.2
export const MIN_RETRY_DELAY_MS = 1_000
export const MAX_RETRY_DELAY_MS = 4_000

interface RetryPaymentOptions {
  readonly random?: () => number
}

export function calculateRetryDelayMs(randomValue: number): number {
  const normalized = Math.min(Math.max(randomValue, 0), 0.999)
  const retryWindowMs = MAX_RETRY_DELAY_MS - MIN_RETRY_DELAY_MS + 1

  return MIN_RETRY_DELAY_MS + Math.floor(normalized * retryWindowMs)
}

export function isRetrySuccessful(randomValue: number): boolean {
  return randomValue >= RETRY_FAILURE_RATE
}

export async function retryPayment(
  transactionId: string,
  options: RetryPaymentOptions = {}
): Promise<RetryPaymentResult> {
  const random = options.random ?? Math.random
  const delayMs = calculateRetryDelayMs(random())

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs)
  })

  return {
    status: isRetrySuccessful(random())
      ? TRANSACTION_STATUS.SUCCESS
      : TRANSACTION_STATUS.FAILED,
    transactionId,
  }
}
