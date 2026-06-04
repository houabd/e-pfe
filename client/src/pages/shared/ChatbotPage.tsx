import { useState, useRef, useCallback } from 'react';
import { Bot, User, Send, Square, Sparkles, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { askQuestionStream } from '@/services/chatbot.api';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  chunks_used?: number;
  source_type?: 'pdf' | 'general';
  warning?: string;
}

const SUGGESTIONS = [
  'Comment choisir un sujet de PFE ?',
  'Quelles sont les étapes pour valider un thème ?',
  'Comment former un binôme ?',
  "Qu'est-ce qu'un PFE de type Startup ?",
  'Comment contacter un encadrant ?',
];

const INITIAL_MSG: Message = {
  id: '0',
  role: 'assistant',
  content: "Bonjour ! Je suis l'assistant IA du département informatique de l'Université de Béjaïa. Posez-moi vos questions sur les PFE, les règlements, les procédures ou le département.",
};

function AssistantMessage({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  return (
    <div className="group flex w-full items-start gap-3">
      <div className="size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
        <Bot className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {!isStreaming && msg.warning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <span>{msg.warning}</span>
          </div>
        )}
        <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm">
          <Response>{msg.content}</Response>
          {isStreaming && msg.content === '' && <Loader size={14} className="mt-0.5" />}
        </div>
        {!isStreaming && msg.sources && msg.sources.length > 0 && (
          <Sources className="px-1">
            <SourcesTrigger count={msg.sources.length} />
            <SourcesContent>
              {msg.sources.map((src) => <Source key={src} title={src} />)}
            </SourcesContent>
          </Sources>
        )}
        {!isStreaming && msg.source_type === 'pdf' && msg.sources && msg.sources.length > 0 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-1">✅ Source : Guide LMD officiel</p>
        )}
        {!isStreaming && msg.source_type === 'general' && (
          <p className="text-[10px] text-orange-500 font-medium px-1">Réponse générale</p>
        )}
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex w-full items-end justify-end gap-3">
      <div className="max-w-[78%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm">
        {msg.content}
      </div>
      <div className="size-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-primary text-primary-foreground">
        <User className="size-3.5" />
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  const isFirstMessage = messages.length === 1;
  const isStreaming = isLoading && streamingMsgId !== null;

  const stopStream = useCallback(() => {
    streamControllerRef.current?.abort();
    setIsLoading(false);
    setStreamingMsgId(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
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
          const msg: Message = { id: assistantMsgId, role: 'assistant', content, source_type: 'general', warning: warning || undefined };
          return exists ? prev.map((m) => m.id === assistantMsgId ? msg : m) : [...prev, msg];
        });
        setStreamingMsgId(null);
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      },
      onError: (message) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) return prev.map((m) => m.id === assistantMsgId ? { ...m, content: message } : m);
          return [...prev, { id: assistantMsgId, role: 'assistant', content: message }];
        });
        setStreamingMsgId(null);
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      },
    });
  }, [isLoading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearConversation() {
    streamControllerRef.current?.abort();
    setMessages([INITIAL_MSG]);
    setInput('');
    setIsLoading(false);
    setStreamingMsgId(null);
    textareaRef.current?.focus();
  }

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Assistant IA e-PFE</h1>
            <p className="text-xs text-muted-foreground">Université de Béjaïa · Informatique</p>
          </div>
        </div>
        {messages.length > 1 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 h-8" onClick={clearConversation}>
            <Trash2 className="size-3.5" /> Effacer
          </Button>
        )}
      </div>

      <Conversation className="flex-1 rounded-xl border bg-muted/20 min-h-0">
        <ConversationContent>
          {messages.map((msg) =>
            msg.role === 'user'
              ? <UserMessage key={msg.id} msg={msg} />
              : <AssistantMessage key={msg.id} msg={msg} isStreaming={msg.id === streamingMsgId} />,
          )}
          {isLoading && streamingMsgId === null && (
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
                <Bot className="size-3.5" />
              </div>
              <Loader size={18} />
            </div>
          )}
          {isFirstMessage && !isLoading && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-1">
                <BookOpen className="size-3" /> Questions fréquentes
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => sendMessage(s)}
                    className="text-xs border rounded-full px-3 py-1.5 bg-background hover:bg-muted transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 pt-3">
        <div className="border rounded-xl bg-background shadow-sm overflow-hidden">
          <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="Posez votre question… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            disabled={isLoading} rows={1}
            className="w-full resize-none border-0 shadow-none focus-visible:ring-0 p-3 text-sm field-sizing-content min-h-[44px] max-h-36"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground/50">
              L'assistant peut faire des erreurs · Vérifiez les informations importantes
            </p>
            {isStreaming ? (
              <Button type="button" size="icon" variant="outline" onClick={stopStream} className="size-8 rounded-lg shrink-0">
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button type="button" size="icon" disabled={isLoading || !input.trim()} onClick={() => sendMessage(input)} className="size-8 rounded-lg shrink-0">
                <Send className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
