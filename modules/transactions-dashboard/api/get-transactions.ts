import "server-only"

import { listMockTransactions } from "../model/mock-transactions"
import type { Transaction } from "../model/types"

const MOCK_API_DELAY_MS = 250

export async function getTransactions(): Promise<Transaction[]> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_API_DELAY_MS)
  })

  return listMockTransactions().sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  )
}
