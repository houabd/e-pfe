import { useState, useRef, useCallback } from 'react';
import { User, Send, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { askQuestionStream } from '@/services/chatbot.api';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources';
import { ChatbotLogo } from '@/components/ui/ChatbotLogo';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  chunks_used?: number;
  source_type?: 'pdf' | 'general';
  warning?: string;
}

const INITIAL_MSG: Message = {
  id: '0',
  role: 'assistant',
  content: "Bonjour ! Je suis l'assistant IA du département informatique. Posez-moi vos questions sur les PFE.",
};

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  const isStreaming = isLoading && streamingMsgId !== null;

  const stopStream = useCallback(() => {
    streamControllerRef.current?.abort();
    setIsLoading(false);
    setStreamingMsgId(null);
  }, []);

  const sendMessage = useCallback((question: string) => {
    const q = question.trim();
    if (!q || isLoading) return;

    const assistantMsgId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: q }]);
    setInput('');
    setIsLoading(true);
    setStreamingMsgId(null);

    streamControllerRef.current?.abort();
    streamControllerRef.current = askQuestionStream(q, {
      onChunk: (chunk) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (!exists) return [...prev, { id: assistantMsgId, role: 'assistant', content: chunk }];
          return prev.map((m) => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m);
        });
        setStreamingMsgId((prev) => prev ?? assistantMsgId);
      },
      onDone: (sources, chunks_used, source_type) => {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsgId ? { ...m, sources, chunks_used, source_type } : m,
        ));
        setStreamingMsgId(null);
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      },
      onFallback: (content, warning) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          const msg: Message = { id: assistantMsgId, role: 'assistant', content, source_type: 'gemini', warning };
          return exists ? prev.map((m) => m.id === assistantMsgId ? msg : m) : [...prev, msg];
        });
        setStreamingMsgId(null);
        setIsLoading(false);
      },
      onError: (message) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) return prev.map((m) => m.id === assistantMsgId ? { ...m, content: message } : m);
          return [...prev, { id: assistantMsgId, role: 'assistant', content: message }];
        });
        setStreamingMsgId(null);
        setIsLoading(false);
      },
    });
  }, [isLoading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleClose() {
    stopStream();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant IA"
        className={cn(
          'fixed bottom-6 right-6 z-50 size-16 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all overflow-hidden p-0',
          open && 'hidden',
        )}
      >
        <ChatbotLogo size={64} />
      </button>

      <div
        className={cn(
          'fixed z-50 flex flex-col bg-background border shadow-2xl transition-all duration-200',
          'bottom-0 right-0 w-full rounded-t-xl h-[60vh]',
          'sm:bottom-6 sm:right-6 sm:w-[340px] sm:rounded-xl sm:h-[440px] sm:max-h-[calc(100vh-104px)]',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 brand-gradient-hero rounded-t-xl">
          <div className="size-7 rounded-full overflow-hidden shrink-0">
            <ChatbotLogo size={28} />
          </div>
          <p className="flex-1 text-xs font-semibold text-white truncate" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            Assistant IA e-PFE
          </p>
          <Button variant="ghost" size="icon" className="size-6 shrink-0 text-white/70 hover:text-white hover:bg-white/15" onClick={handleClose}>
            <X className="size-3" />
          </Button>
        </div>

        {/* Messages */}
        <Conversation className="flex-1 min-h-0 bg-muted/10">
          <ConversationContent className="p-3 gap-3">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex w-full items-end justify-end gap-2">
                  <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-xs shadow-sm">
                    {msg.content}
                  </div>
                  <div className="size-6 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-primary text-primary-foreground">
                    <User className="size-3" />
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex w-full items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <ChatbotLogo size={24} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {msg.id !== streamingMsgId && msg.warning && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30 px-2 py-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                        <span className="shrink-0">⚠️</span>
                        <span>{msg.warning}</span>
                      </div>
                    )}
                    <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm text-xs">
                      <Response>{msg.content}</Response>
                      {msg.id === streamingMsgId && msg.content === '' && <Loader size={12} className="mt-0.5" />}
                    </div>
                    {msg.id !== streamingMsgId && msg.sources && msg.sources.length > 0 && (
                      <Sources className="px-1">
                        <SourcesTrigger count={msg.sources.length} />
                        <SourcesContent>
                          {msg.sources.map((src) => <Source key={src} title={src} />)}
                        </SourcesContent>
                      </Sources>
                    )}
                    {msg.id !== streamingMsgId && msg.source_type === 'general' && (
                      <p className="text-[10px] text-orange-500 font-medium px-1">🤖 Réponse générale</p>
                    )}
                    {msg.id !== streamingMsgId && msg.source_type === 'pdf' && msg.sources && msg.sources.length > 0 && (
                      <p className="text-[10px] text-emerald-600 font-medium px-1">✅ Guide LMD officiel</p>
                    )}
                  </div>
                </div>
              ),
            )}
            {isLoading && streamingMsgId === null && (
              <div className="flex items-center gap-2">
                <ChatbotLogo size={24} />
                <Loader size={14} />
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input */}
        <div className="shrink-0 p-2 border-t">
          <div className="flex items-end gap-2 border rounded-xl bg-background overflow-hidden px-3 py-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question…"
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-xs field-sizing-content min-h-[24px] max-h-24"
            />
            {isStreaming ? (
              <Button type="button" size="icon" variant="outline" onClick={stopStream} className="size-7 rounded-lg shrink-0 mb-0.5">
                <Square className="size-3" />
              </Button>
            ) : (
              <Button type="button" size="icon" disabled={isLoading || !input.trim()} onClick={() => sendMessage(input)} className="size-7 rounded-lg shrink-0 mb-0.5">
                <Send className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
