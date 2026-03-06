import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/contexts/AdminContext";
import { Shield, LogOut, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminLoginDialog({ open, onOpenChange }: AdminLoginDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAdmin, logout } = useAdmin();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!password.trim()) return;
    
    setIsLoading(true);
    const success = await login(password);
    setIsLoading(false);
    
    if (success) {
      toast({
        title: "Admin Access Granted",
        description: "You now have access to AI Admin features.",
      });
      setPassword("");
      onOpenChange(false);
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid admin password.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "Admin access has been revoked.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-amber-600/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-amber-400 font-cinzel flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {isAdmin ? "AI Admin Access" : "Admin Login"}
          </DialogTitle>
        </DialogHeader>

        {isAdmin ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
              <p className="text-green-400 text-sm font-medium">Admin Access Active</p>
              <p className="text-slate-400 text-xs mt-1">
                You have access to Grudge Island and AI unit management.
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-slate-300">
              <p>Admin Features:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>View and manage AI Units</li>
                <li>Access Grudge Island</li>
                <li>Database seeding controls</li>
                <li>Account reset functions</li>
              </ul>
            </div>

            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20"
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout from Admin
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Enter the admin password to access AI management features.
            </p>
            
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="bg-slate-800 border-slate-600 pr-10"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                data-testid="input-admin-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button 
              onClick={handleLogin}
              disabled={!password.trim() || isLoading}
              className="w-full bg-amber-600 hover:bg-amber-500"
              data-testid="button-admin-login"
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? "Authenticating..." : "Access Admin"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
