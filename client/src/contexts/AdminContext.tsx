import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  isTransitioning: boolean;
  userId: string;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  grudgeIslandId: string;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const grudgeIslandId = "grudge-island-001";

  const userId = isAdmin ? "admin" : "guest";

  useEffect(() => {
    const storedAdmin = localStorage.getItem("grudge_admin");
    if (storedAdmin === "true") {
      setIsAdmin(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsTransitioning(true);
          localStorage.setItem("grudge_admin", "true");
          localStorage.removeItem("gruda_active_character");
          setTimeout(() => {
            window.location.href = "/home";
          }, 100);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Admin login error:", error);
      return false;
    }
  };

  const logout = () => {
    setIsTransitioning(true);
    localStorage.removeItem("grudge_admin");
    localStorage.removeItem("gruda_active_character");
    setTimeout(() => {
      window.location.href = "/home";
    }, 100);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading, isTransitioning, userId, login, logout, grudgeIslandId }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
