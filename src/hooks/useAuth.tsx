import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface User {
  username: string;
  fullName: string;
  accountNumber: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: "customer" | "employee" | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"customer" | "employee" | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const result = await api.me();
      if (result.data && result.data.user) {
        setUser(result.data.user);
        // Set role based on user data or default to customer
        setUserRole((result.data.user.role as "customer" | "employee") || "customer");
      } else {
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    await checkAuthStatus();
  };

  const signOut = async () => {
    try {
      await api.logout();
      setUser(null);
      setUserRole(null);
      
      toast({
        title: "Signed out successfully",
        description: "You have been securely logged out",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
