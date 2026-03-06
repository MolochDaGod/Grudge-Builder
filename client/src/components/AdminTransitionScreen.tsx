import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";

interface AdminTransitionScreenProps {
  isVisible: boolean;
  isAdmin: boolean;
}

export function AdminTransitionScreen({ isVisible, isAdmin }: AdminTransitionScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center"
          data-testid="admin-transition-screen"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border-4 border-amber-600/30 border-t-amber-500"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-10 h-10 text-amber-400" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel font-bold text-amber-400">
                {isAdmin ? "Accessing Admin Account" : "Returning to Guest Mode"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isAdmin ? "Loading Grudge Island and your heroes..." : "Switching back to guest account..."}
              </p>
            </div>

            <motion.div
              className="flex items-center gap-2 text-slate-500 text-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Please wait...</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
