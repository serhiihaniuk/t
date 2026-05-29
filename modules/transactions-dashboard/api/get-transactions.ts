import "server-only"

import { listMockTransactions } from "@/modules/transactions-dashboard/model/transaction/mock-transactions"
import type { Transaction } from "@/modules/transactions-dashboard/model/transaction/transaction"

export async function getTransactions(): Promise<Transaction[]> {
  return listMockTransactions().sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  )
}
