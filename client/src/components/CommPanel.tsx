import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MessageSquare, Sparkles, ChevronDown, ChevronUp, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityLogEntry } from '@/components/IslandSidebar';

interface CommPanelProps {
  logs: string[];
  activityLog?: ActivityLogEntry[];
  onSendMessage?: (message: string) => void;
  className?: string;
}

export function CommPanel({
  logs,
  activityLog = [],
  onSendMessage,
  className,
}: CommPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'chat'>('activity');
  const [chatInput, setChatInput] = useState('');
  const [unreadActivity, setUnreadActivity] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== 'activity' && logs.length > 0) {
      setUnreadActivity(prev => prev + 1);
    }
  }, [logs.length, activeTab]);

  useEffect(() => {
    if (activeTab === 'activity') {
      setUnreadActivity(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, activityLog]);

  const handleSend = () => {
    if (chatInput.trim() && onSendMessage) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-50 bg-slate-800 border-slate-600 shadow-lg"
        data-testid="open-comm-panel"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Chat
        {unreadActivity > 0 && (
          <Badge className="ml-2 bg-amber-600 text-white text-[10px] px-1.5">
            {unreadActivity}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed bottom-24 left-4 z-40 w-72",
        className
      )}
    >
      <Card className="bg-slate-900/95 border-slate-700 shadow-2xl backdrop-blur-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300 font-normal flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Communications
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                onClick={() => setIsMinimized(!isMinimized)}
                data-testid="toggle-comm-minimize"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                onClick={() => setIsOpen(false)}
                data-testid="close-comm-panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activity' | 'chat')}>
                  <TabsList className="w-full bg-slate-800/50 rounded-none border-b border-slate-700">
                    <TabsTrigger
                      value="activity"
                      className="flex-1 text-xs data-[state=active]:bg-slate-700"
                      data-testid="tab-activity"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Activity
                      {unreadActivity > 0 && activeTab !== 'activity' && (
                        <Badge className="ml-1 bg-amber-600 text-white text-[9px] px-1 py-0">
                          {unreadActivity}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="chat"
                      className="flex-1 text-xs data-[state=active]:bg-slate-700"
                      data-testid="tab-chat"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Chat
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="activity" className="m-0">
                    <div
                      ref={scrollRef}
                      className="h-48 overflow-y-auto px-3 py-2 space-y-1.5"
                    >
                      <AnimatePresence mode="popLayout">
                        {logs.length === 0 ? (
                          <div className="text-slate-500 text-xs text-center py-4">
                            No activity yet
                          </div>
                        ) : (
                          logs.map((log, i) => (
                            <motion.div
                              key={`${i}-${log.slice(0, 15)}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs text-slate-300 border-b border-slate-800/50 pb-1"
                            >
                              {log}
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </TabsContent>

                  <TabsContent value="chat" className="m-0">
                    <div className="h-48 overflow-y-auto px-3 py-2 space-y-2">
                      <div className="text-xs text-slate-500 text-center py-8">
                        Island chat coming soon...
                      </div>
                    </div>
                    <div className="p-2 border-t border-slate-700 flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className="h-8 text-xs bg-slate-800 border-slate-600"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        data-testid="chat-input"
                      />
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0 bg-amber-600 hover:bg-amber-500"
                        onClick={handleSend}
                        data-testid="send-chat"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default CommPanel;
