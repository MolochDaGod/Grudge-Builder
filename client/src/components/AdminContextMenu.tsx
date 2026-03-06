import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Image, Move, Maximize2, Edit3, 
  Trash2, Copy, RotateCcw, Settings, X 
} from 'lucide-react';

export interface AdminMenuAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface AdminContextMenuProps {
  children: ReactNode;
  isAdminMode: boolean;
  targetId?: string;
  targetType?: 'sprite' | 'ui-card' | 'element' | 'generic';
  onReplaceSprite?: () => void;
  onMove?: () => void;
  onResize?: () => void;
  onEditCard?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onReset?: () => void;
  customActions?: AdminMenuAction[];
  holdDelay?: number;
  className?: string;
}

export default function AdminContextMenu({
  children,
  isAdminMode,
  targetId,
  targetType = 'generic',
  onReplaceSprite,
  onMove,
  onResize,
  onEditCard,
  onDelete,
  onDuplicate,
  onReset,
  customActions = [],
  holdDelay = 300,
  className,
}: AdminContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHoldingRef = useRef(false);

  const defaultActions: AdminMenuAction[] = [];

  if (onReplaceSprite) {
    defaultActions.push({
      id: 'replace-sprite',
      label: 'Replace Sprite',
      icon: <Image className="w-4 h-4" />,
      onClick: onReplaceSprite,
    });
  }

  if (onMove) {
    defaultActions.push({
      id: 'move',
      label: 'Move',
      icon: <Move className="w-4 h-4" />,
      onClick: onMove,
    });
  }

  if (onResize) {
    defaultActions.push({
      id: 'resize',
      label: 'Resize',
      icon: <Maximize2 className="w-4 h-4" />,
      onClick: onResize,
    });
  }

  if (onEditCard) {
    defaultActions.push({
      id: 'edit-card',
      label: 'Edit UI Card',
      icon: <Edit3 className="w-4 h-4" />,
      onClick: onEditCard,
    });
  }

  if (onDuplicate) {
    defaultActions.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      onClick: onDuplicate,
    });
  }

  if (onReset) {
    defaultActions.push({
      id: 'reset',
      label: 'Reset',
      icon: <RotateCcw className="w-4 h-4" />,
      onClick: onReset,
    });
  }

  if (onDelete) {
    defaultActions.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      danger: true,
    });
  }

  const allActions = [...defaultActions, ...customActions];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isAdminMode) return;
    if (e.button !== 2) return;

    e.preventDefault();
    isHoldingRef.current = true;

    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        const x = Math.min(e.clientX, window.innerWidth - 200);
        const y = Math.min(e.clientY, window.innerHeight - 300);
        setMenuPosition({ x, y });
        setIsOpen(true);
      }
    }, holdDelay);
  }, [isAdminMode, holdDelay]);

  const handleMouseUp = useCallback(() => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isAdminMode) {
      e.preventDefault();
    }
  }, [isAdminMode]);

  const handleActionClick = (action: AdminMenuAction) => {
    if (action.disabled) return;
    action.onClick();
    setIsOpen(false);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative",
          isAdminMode && "cursor-crosshair",
          className
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        data-testid={`admin-context-target-${targetId || 'default'}`}
      >
        {children}
        
        {isAdminMode && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse pointer-events-none z-10" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && allActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] min-w-[180px] rounded-lg border border-slate-600 bg-slate-800/95 backdrop-blur-sm shadow-xl"
            style={{ left: menuPosition.x, top: menuPosition.y }}
            onMouseDown={(e) => e.stopPropagation()}
            data-testid="admin-context-menu"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Settings className="w-3 h-3" />
                Admin Tools
              </span>
              <button
                onClick={closeMenu}
                className="text-slate-400 hover:text-white transition-colors"
                data-testid="admin-menu-close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {targetType !== 'generic' && (
              <div className="px-3 py-1 text-[10px] text-slate-500 border-b border-slate-700/50">
                {targetType.toUpperCase()} {targetId ? `#${targetId}` : ''}
              </div>
            )}

            <div className="py-1">
              {allActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    action.disabled
                      ? "text-slate-500 cursor-not-allowed"
                      : action.danger
                        ? "text-red-400 hover:bg-red-500/20"
                        : "text-slate-200 hover:bg-slate-700/80"
                  )}
                  data-testid={`admin-action-${action.id}`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function useAdminMode() {
  const [adminMode, setAdminMode] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAdminMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return { adminMode, setAdminMode };
}
