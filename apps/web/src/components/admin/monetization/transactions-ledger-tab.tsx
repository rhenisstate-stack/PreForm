"use client";

import * as React from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ArrowDownToLine,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface TransactionsLedgerTabProps {
  canManagePlans: boolean;
}

export function TransactionsLedgerTab({ canManagePlans }: TransactionsLedgerTabProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState<number>(1);
  const pageSize = 20;

  // Load transactions query
  const {
    data: txData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-transactions-ledger", statusFilter, methodFilter, searchTerm, page],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") q.append("status", statusFilter);
      if (methodFilter && methodFilter !== "all") q.append("paymentMethod", methodFilter);
      if (searchTerm) q.append("search", searchTerm);
      q.append("page", page.toString());
      q.append("pageSize", pageSize.toString());

      const res = await fetch(`/api/admin/monetization/transactions?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const transactions: any[] = txData?.transactions ?? [];
  const totalCount: number = txData?.totalCount ?? transactions.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Export to CSV helper
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      "Order ID",
      "Candidate Name",
      "Candidate Email",
      "Plan",
      "Course",
      "Method",
      "Reference",
      "Receipt",
      "Amount",
      "Currency",
      "Status",
      "Created At",
    ];
    const rows = transactions.map((t) => [
      t.orderId,
      t.userName || "",
      t.userEmail || "",
      t.planName || "",
      t.course || "",
      t.paymentMethod || "",
      t.transactionReference || "",
      t.receiptNumber || "",
      t.amount,
      t.currency || "USD",
      t.status || "",
      t.createdAt ? new Date(t.createdAt).toISOString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val: any) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prepford_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border">
        <div>
          <h2 className="text-base font-serif font-semibold text-foreground">
            Financial Transactions Ledger &amp; Payment Reconciliation
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable audit record of all online card checkouts, M-Pesa collections, bank transfers, and manual receipts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="h-9 rounded-xl text-xs"
          >
            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Buttons */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            {(["all", "Succeeded", "Pending", "Failed", "Refunded"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "all" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          {/* Payment Method filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 rounded-lg border bg-background text-xs"
          >
            <option value="all">All Methods</option>
            <option value="Card">Card / Stripe</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Cash">Cash Deposit</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search order, ref, learner..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="py-3.5 px-5 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Transaction Records ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading financial transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <CreditCard className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-medium text-foreground">No transactions recorded</p>
              <p className="mt-0.5">Transactions will appear here as learners check out or manual payments are logged.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Plan &amp; Course</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference / Receipt</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((t: any) => {
                    const statusStr = t.status || "Succeeded";
                    const isSucceeded = statusStr === "Succeeded" || statusStr === "Verified";
                    const isPending = statusStr === "Pending";
                    const isFailed = statusStr === "Failed";
                    const isRefunded = statusStr === "Refunded";

                    return (
                      <tr key={t.id || t.orderId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                          {t.orderId ? t.orderId.slice(0, 8) + "..." : "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{t.userName || "Candidate"}</div>
                          <div className="text-muted-foreground text-[11px]">{t.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{t.planName}</div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-0.5">
                            {t.course || "RN"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="text-[10px]">
                            {t.paymentMethod || "Card"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                          {t.transactionReference || "-"}
                          {t.receiptNumber && (
                            <div className="text-[10px] text-muted-foreground font-sans">
                              #{t.receiptNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          ${t.amount} {t.currency || "USD"}
                        </td>
                        <td className="py-3.5 px-4">
                          {isSucceeded && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 text-[10px]">
                              Succeeded
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                              Pending
                            </Badge>
                          )}
                          {isFailed && (
                            <Badge variant="destructive" className="text-[10px]">
                              Failed
                            </Badge>
                          )}
                          {isRefunded && (
                            <Badge variant="secondary" className="text-muted-foreground text-[10px]">
                              Refunded
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground text-[11px]">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Page {page} of {totalPages} ({totalCount} total transactions)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 rounded-lg text-xs"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 rounded-lg text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
