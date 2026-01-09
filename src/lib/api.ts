export type ApiResult<T> = { data?: T; error?: string };

export interface TransactionSummary {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerTransaction extends TransactionSummary {
  payeeAccountInfo: string;
  swiftCode: string;
  provider?: string;
  declineReason?: string;
  declinedAt?: string;
  verifiedAt?: string;
  submittedAt?: string;
}

export interface PendingTransaction {
  _id: string;
  amount: number;
  currency: string;
  payeeAccountInfo: string;
  swiftCode: string;
  status: string;
  createdAt: string;
  customerId?: {
    username: string;
    fullName: string;
    accountNumber: string;
  } | null;
}

export interface CreatedTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf-token", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to get CSRF token");
  const json = (await res.json()) as { csrfToken: string };
  return json.csrfToken;
}

async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch (parseError) {
      if (res.ok) {
        throw parseError;
      }
    }

    if (!res.ok) {
      const errorMessage =
        typeof json === "object" && json !== null && "error" in json && json.error
          ? String((json as { error?: unknown }).error)
          : "Request failed";
      return { error: errorMessage };
    }

    return { data: json as T };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error";
    return { error: message };
  }
}

export const api = {
  register: (input: {
    fullName: string;
    idNumber: string;
    accountNumber: string;
    username: string;
    password: string;
  }) => postJson<{ message: string; user: { username: string } }>("/api/auth/register", input),

  login: (input: { username: string; accountNumber: string; password: string }) =>
    postJson<{ message: string; user: { username: string } }>("/api/auth/login", input),

  employeeLogin: (input: { employeeNumber: string; password: string }) =>
    postJson<{ message: string; user: { username: string; role: string } }>("/api/auth/employee/login", input),

  logout: () => postJson<{ message: string }>("/api/auth/logout", {}),

  me: async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const json: unknown = await res.json();
      if (!res.ok) {
        const errorMessage =
          typeof json === "object" && json !== null && "error" in json && json.error
            ? String((json as { error?: unknown }).error)
            : "Unauthorized";
        return { error: errorMessage } as ApiResult<{ user: { username: string } }>;
      }
      return { data: json as { user: { username: string } } } as ApiResult<{ user: { username: string } }>;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error";
      return { error: message } as ApiResult<{ user: { username: string } }>;
    }
  },

  // Transaction endpoints
  createTransaction: (input: {
    amount: string;
    currency: string;
    provider: string;
    payeeAccountInfo: string;
    swiftCode: string;
  }) => postJson<{ message: string; transaction: CreatedTransaction }>("/api/transactions", input),

  getMyTransactions: async () => {
    try {
      const res = await fetch("/api/transactions/my", { credentials: "include" });
      const json: unknown = await res.json();
      if (!res.ok) {
        const errorMessage =
          typeof json === "object" && json !== null && "error" in json && json.error
            ? String((json as { error?: unknown }).error)
            : "Failed to fetch transactions";
        return { error: errorMessage } as ApiResult<{ transactions: CustomerTransaction[] }>;
      }
      return { data: json as { transactions: CustomerTransaction[] } } as ApiResult<{ transactions: CustomerTransaction[] }>;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error";
      return { error: message } as ApiResult<{ transactions: CustomerTransaction[] }>;
    }
  },

  // Employee endpoints
  getPendingTransactions: async () => {
    try {
      const res = await fetch("/api/transactions/pending", { credentials: "include" });
      const json: unknown = await res.json();
      if (!res.ok) {
        const errorMessage =
          typeof json === "object" && json !== null && "error" in json && json.error
            ? String((json as { error?: unknown }).error)
            : "Failed to fetch pending transactions";
        return { error: errorMessage } as ApiResult<{ transactions: PendingTransaction[] }>;
      }
      return { data: json as { transactions: PendingTransaction[] } } as ApiResult<{ transactions: PendingTransaction[] }>;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error";
      return { error: message } as ApiResult<{ transactions: PendingTransaction[] }>;
    }
  },

  verifyTransaction: (input: { transactionId: string }) =>
    postJson<{ message: string }>("/api/transactions/verify", input),

  declineTransaction: (input: { transactionId: string; reason: string }) =>
    postJson<{ message: string }>("/api/transactions/decline", input),

  submitToSwift: (input: { transactionIds: string[] }) =>
    postJson<{ message: string; submittedCount: number }>("/api/transactions/submit-to-swift", input),
};
