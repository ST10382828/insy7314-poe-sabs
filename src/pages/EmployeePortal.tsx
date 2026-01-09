import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, LogOut, CheckCircle2, Send, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";

interface Transaction {
  _id: string;
  amount: number;
  currency: string;
  payeeAccountInfo: string;
  swiftCode: string;
  status: string;
  createdAt: string;
  customerId: {
    username: string;
    fullName: string;
    accountNumber: string;
  };
}

const EmployeePortal = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [transactionToDecline, setTransactionToDecline] = useState<Transaction | null>(null);

  const fetchPendingTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.getPendingTransactions();
      if (result.data) {
        const fetched = (result.data.transactions || []) as Transaction[];
        setTransactions(fetched);
        setSelectedTransactions((prev) => prev.filter((id) => fetched.some((tx: Transaction) => tx._id === id)));
      } else if (result.error) {
        console.error("Error fetching transactions:", result.error);
        toast({
          variant: "destructive",
          title: "Error loading transactions",
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        variant: "destructive",
        title: "Error loading transactions",
        description: "Failed to fetch transactions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPendingTransactions();
  }, [fetchPendingTransactions]);

  const verifyTransaction = async (transactionId: string) => {
    setIsLoading(true);
    try {
      const result = await api.verifyTransaction({ transactionId });
      if (result.error) throw new Error(result.error);

      toast({
        title: "Transaction verified",
        description: "The transaction has been marked as verified.",
      });

      await fetchPendingTransactions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitToSwift = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        variant: "destructive",
        title: "No transactions selected",
        description: "Please select verified transactions to submit to SWIFT.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.submitToSwift({ transactionIds: selectedTransactions });
      if (result.error) throw new Error(result.error);

      toast({
        title: "Submitted to SWIFT",
        description: `${result.data?.submittedCount || selectedTransactions.length} transactions submitted to SWIFT successfully.`,
      });

      setSelectedTransactions([]);
      await fetchPendingTransactions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions([...selectedTransactions, transactionId]);
    } else {
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId));
    }
  };

  const openDeclineDialog = (transaction: Transaction) => {
    setTransactionToDecline(transaction);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  };

  const handleDeclineTransaction = async () => {
    if (!transactionToDecline) return;
    if (declineReason.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Decline reason too short",
        description: "Please provide at least 10 characters explaining the decline.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.declineTransaction({
        transactionId: transactionToDecline._id,
        reason: declineReason.trim(),
      });
      if (result.error) throw new Error(result.error);

      toast({
        title: "Transaction declined",
        description: "The transaction has been declined.",
      });

      setDeclineDialogOpen(false);
      setTransactionToDecline(null);
      setDeclineReason("");
      await fetchPendingTransactions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Decline failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "default" as const, label: "Pending" },
      verified: { variant: "secondary" as const, label: "Verified" },
      submitted: { variant: "secondary" as const, label: "Submitted" },
      completed: { variant: "secondary" as const, label: "Completed" },
      failed: { variant: "destructive" as const, label: "Failed" },
    };

    const { variant, label } = config[status as keyof typeof config] || config.pending;

    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SecurBank International</h1>
              <p className="text-sm text-muted-foreground">Employee Verification Portal</p>
            </div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {user && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Welcome, {user.fullName}</CardTitle>
              <CardDescription>Employee Portal - Transaction Verification</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Verify payment details carefully before approving. Check payee account information and SWIFT codes for accuracy.
          </AlertDescription>
        </Alert>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>International Payment Queue</CardTitle>
                <CardDescription>Review and verify customer payment requests</CardDescription>
              </div>
              <Button 
                onClick={fetchPendingTransactions} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <svg 
                  className="mr-2 h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
              {selectedTransactions.length > 0 && (
                <Button onClick={submitToSwift} disabled={isLoading}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit {selectedTransactions.length} to SWIFT
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Payee Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>SWIFT Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No transactions to process
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell>
                        {transaction.status === "verified" ? (
                          <Checkbox
                            checked={selectedTransactions.includes(transaction._id)}
                            onCheckedChange={(checked) => 
                              handleSelectTransaction(transaction._id, checked as boolean)
                            }
                            disabled={isLoading}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.customerId?.fullName || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{transaction.customerId?.accountNumber || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{transaction.payeeAccountInfo}</TableCell>
                      <TableCell className="font-semibold">
                        {transaction.currency} {transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">{transaction.swiftCode}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        {transaction.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => verifyTransaction(transaction._id)}
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeclineDialog(transaction)}
                              disabled={isLoading}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Decline
                            </Button>
                          </div>
                        ) : transaction.status === "verified" ? (
                          <Badge variant="secondary">Ready for SWIFT</Badge>
                        ) : transaction.status === "submitted" ? (
                          <Badge variant="secondary">Submitted to SWIFT</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for declining this transaction. The requester will be notified of the decision.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="decline-reason">
              Decline reason
            </label>
            <Textarea
              id="decline-reason"
              placeholder="Explain why this transaction is being declined..."
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              disabled={isLoading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeclineTransaction}
              disabled={isLoading || declineReason.trim().length < 10}
            >
              Decline Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeePortal;
