import { getTransactions } from "../api/get-transactions"
import { TransactionsDashboard } from "./TransactionsDashboard"

export async function TransactionsPage() {
  const transactions = await getTransactions()

  return <TransactionsDashboard initialTransactions={transactions} />
}
