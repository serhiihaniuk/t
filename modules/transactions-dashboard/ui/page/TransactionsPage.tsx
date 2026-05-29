import { getTransactions } from "@/modules/transactions-dashboard/api/get-transactions"
import { TransactionsDashboard } from "@/modules/transactions-dashboard/ui/dashboard/TransactionsDashboard"

export async function TransactionsPage() {
  const transactions = await getTransactions()

  return <TransactionsDashboard initialTransactions={transactions} />
}
