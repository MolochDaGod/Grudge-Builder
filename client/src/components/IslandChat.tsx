import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Sparkles,
  User,
  Bot,
  Minimize2,
  Maximize2
} from "lucide-react";
interface CharacterLike {
  id: string;
  name: string;
  raceId: string;
  classId: string;
}

interface ChatMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  content: string;
  timestamp: number;
  isAI: boolean;
  isSystem?: boolean;
}

interface IslandChatProps {
  characters: CharacterLike[];
  selectedCharacterId: string | null;
  onSelectCharacter?: (id: string) => void;
  className?: string;
}

export function IslandChat({ 
  characters, 
  selectedCharacterId, 
  onSelectCharacter,
  className 
}: IslandChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChatterId, setActiveChatterId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const activeChatter = activeChatterId 
    ? characters.find(c => c.id === activeChatterId) 
    : selectedCharacter;
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);
  
  useEffect(() => {
    if (selectedCharacterId && !activeChatterId) {
      setActiveChatterId(selectedCharacterId);
    }
  }, [selectedCharacterId, activeChatterId]);
  
  useEffect(() => {
    if (!isExpanded && characters.length > 0) {
      const interval = setInterval(() => {
        if (Math.random() < 0.1 && characters.length > 0) {
          triggerRandomDiscussion();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isExpanded, characters]);
  
  const triggerRandomDiscussion = useCallback(async () => {
    if (characters.length === 0) return;
    
    try {
      // AI discussion — only available on local dev server, graceful fallback in prod
      const response = await fetch("/api/game/characters/random-discussion", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-mode": "true"
        },
        body: JSON.stringify({ 
          characterIds: characters.map(c => c.id) 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.speakerId && data.message) {
          const speaker = characters.find(c => c.id === data.speakerId);
          if (speaker) {
            const newMessage: ChatMessage = {
              id: `${Date.now()}-${Math.random()}`,
              speakerId: data.speakerId,
              speakerName: speaker.name,
              content: data.message,
              timestamp: Date.now(),
              isAI: true
            };
            setMessages(prev => [...prev.slice(-50), newMessage]);
            if (!isExpanded) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      }
      // 404 = AI service not available in production, silently skip
    } catch (error) {
      console.error("Error triggering discussion:", error);
    }
  }, [characters, isExpanded]);
  
  const sendMessage = async () => {
    if (!inputValue.trim() || !activeChatter || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      speakerId: "player",
      speakerName: "You",
      content: inputValue.trim(),
      timestamp: Date.now(),
      isAI: false
    };
    
    setMessages(prev => [...prev.slice(-50), userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/game/characters/${activeChatter.id}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-mode": "true"
        },
        body: JSON.stringify({ message: inputValue.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: `${Date.now()}-ai`,
          speakerId: activeChatter.id,
          speakerName: activeChatter.name,
          content: data.response,
          timestamp: Date.now(),
          isAI: true
        };
        setMessages(prev => [...prev.slice(-50), aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `${Date.now()}-error`,
          speakerId: "system",
          speakerName: "System",
          content: "Failed to get response. Try again.",
          timestamp: Date.now(),
          isAI: true,
          isSystem: true
        };
        setMessages(prev => [...prev.slice(-50), errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const generateGreeting = async (characterId: string) => {
    try {
      const response = await fetch(`/api/game/characters/${characterId}/greeting`, {
        headers: { "x-admin-mode": "true" }
      });
      if (response.ok) {
        const data = await response.json();
        const character = characters.find(c => c.id === characterId);
        if (character && data.greeting) {
          const greetingMessage: ChatMessage = {
            id: `${Date.now()}-greeting`,
            speakerId: characterId,
            speakerName: character.name,
            content: data.greeting,
            timestamp: Date.now(),
            isAI: true
          };
          setMessages(prev => [...prev.slice(-50), greetingMessage]);
        }
      }
    } catch (error) {
      console.error("Error generating greeting:", error);
    }
  };
  
  const selectChatter = (character: Character) => {
    setActiveChatterId(character.id);
    generateGreeting(character.id);
  };
  
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("fixed bottom-24 right-4 z-40", className)}
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="relative rounded-full w-14 h-14 bg-amber-600 hover:bg-amber-500 shadow-lg"
          data-testid="chat-expand-button"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed bottom-24 right-4 z-40 w-80",
        isExpanded && "w-96",
        className
      )}
    >
      <Card className="bg-slate-900/95 border-slate-700 backdrop-blur-sm shadow-2xl">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="text-sm text-amber-400 font-cinzel flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Hero Chat</span>
              {activeChatter && (
                <Badge variant="outline" className="text-[10px] ml-1">
                  {activeChatter.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && !isExpanded && (
                <Badge className="bg-red-500 text-white text-[10px]">
                  {unreadCount}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 space-y-3">
                {characters.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {characters.map(char => (
                      <Button
                        key={char.id}
                        variant={activeChatterId === char.id ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "text-[10px] h-6 px-2 shrink-0",
                          activeChatterId === char.id && "bg-amber-600"
                        )}
                        onClick={() => selectChatter(char)}
                        data-testid={`chat-select-${char.id}`}
                      >
                        {char.name}
                      </Button>
                    ))}
                  </div>
                )}
                
                <ScrollArea 
                  className="h-48 pr-2" 
                  ref={scrollRef as any}
                >
                  <div className="space-y-2">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-500 text-xs py-4">
                        {activeChatter 
                          ? `Start a conversation with ${activeChatter.name}!`
                          : "Select a hero to chat with"}
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            !msg.isAI && "justify-end"
                          )}
                        >
                          {msg.isAI && (
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                              msg.isSystem ? "bg-slate-600" : "bg-amber-600"
                            )}>
                              {msg.isSystem ? (
                                <Bot className="w-3 h-3 text-white" />
                              ) : (
                                <span className="text-[10px] text-white font-bold">
                                  {msg.speakerName.charAt(0)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={cn(
                            "max-w-[80%] rounded-lg px-2 py-1",
                            msg.isAI 
                              ? msg.isSystem 
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-800 text-slate-200"
                              : "bg-amber-600 text-white"
                          )}>
                            {msg.isAI && !msg.isSystem && (
                              <div className="text-[9px] text-amber-400 font-bold mb-0.5">
                                {msg.speakerName}
                              </div>
                            )}
                            <p className="text-xs leading-relaxed">{msg.content}</p>
                          </div>
                          {!msg.isAI && (
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">
                            {activeChatter?.name.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="bg-slate-800 rounded-lg px-3 py-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={activeChatter ? `Message ${activeChatter.name}...` : "Select a hero..."}
                    disabled={!activeChatter || isLoading}
                    className="text-xs bg-slate-800 border-slate-600"
                    data-testid="chat-input"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || !activeChatter || isLoading}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500"
                    data-testid="chat-send-button"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function ChatBubble({ 
  message, 
  characterName, 
  position 
}: { 
  message: string; 
  characterName: string;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      className="absolute z-40 pointer-events-none"
      style={{ 
        left: `${position.x}%`, 
        top: `${position.y - 15}%`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="bg-white/95 text-slate-900 rounded-lg px-3 py-2 max-w-48 shadow-lg relative">
        <div className="text-[10px] font-bold text-amber-600 mb-0.5">
          {characterName}
        </div>
        <p className="text-xs leading-relaxed">{message}</p>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95" />
        </div>
      </div>
    </motion.div>
  );
}
