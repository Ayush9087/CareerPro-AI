import { useEffect, useRef, useState } from 'react';
import { Bot, CircleAlert, LoaderCircle, MessageCircle, Plus, RotateCw, Send, Sparkles, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };
type ChatSessionSummary = { id: string; title: string; created_at: string; updated_at: string };
type ChatReply = {
  session: { id: string; title: string };
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  suggested_actions: string[];
  context_sources: string[];
};

const fallbackPrompts = [
  'Why is my readiness score what it is?',
  'What should I work on today?',
  'Why is TypeScript my highest priority?',
  'How can I improve my interview score?',
  'Which skill should I learn next?',
  'Which project should I improve?',
  'Am I ready to apply for frontend internships?',
];

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompts, setPrompts] = useState(fallbackPrompts);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [retryText, setRetryText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const endOfMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ sessions: ChatSessionSummary[] }>('/api/v1/chat/sessions'),
      api.get<{ prompts: string[] }>('/api/v1/chat/suggested-prompts'),
    ])
      .then(([sessionData, promptData]) => {
        if (!active) return;
        setSessions(sessionData.sessions);
        setPrompts(promptData.prompts);
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message || 'Advisor data could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setSuggestedActions([]);
    setDraft('');
    setRetryText('');
    setError(null);
  };

  const openSession = async (id: string) => {
    setLoadingSession(true);
    setError(null);
    try {
      const result = await api.get<{ id: string; title: string; messages: ChatMessage[] }>(`/api/v1/chat/sessions/${id}`);
      setSessionId(result.id);
      setMessages(result.messages);
      setSuggestedActions([]);
      setRetryText('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'This chat could not be opened.');
    } finally {
      setLoadingSession(false);
    }
  };

  const sendMessage = async (content = draft) => {
    const cleanContent = content.trim();
    if (!cleanContent || sending) return;
    setSending(true);
    setError(null);
    setRetryText(cleanContent);
    try {
      const result = await api.post<ChatReply>('/api/v1/chat/messages', {
        content: cleanContent,
        ...(sessionId ? { session_id: sessionId } : {}),
      });
      setSessionId(result.session.id);
      setMessages((current) => [...current, result.user_message, result.assistant_message]);
      setSuggestedActions(result.suggested_actions);
      setSessions((current) => {
        const updated = current.filter((item) => item.id !== result.session.id);
        return [{ ...result.session, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...updated].slice(0, 30);
      });
      setDraft('');
      setRetryText('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Your message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading your CareerPro Advisor</div>;
  }

  return (
    <Card className="flex h-[min(40rem,calc(100dvh-12.5rem))] md:h-[calc(100dvh-7rem)] min-h-[28rem] w-full max-w-full min-w-0 flex-col md:flex-row p-0 overflow-hidden page-enter">
      {/* Sidebar */}
      <aside className="border-b border-career-border bg-career-surface/50 md:w-72 md:max-w-[40%] md:shrink-0 md:border-b-0 md:border-r flex flex-col">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-career-border/50">
          <div>
             <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-1">AI Coach</p>
             <h1 className="text-xl font-serif">Your chats</h1>
          </div>
          <button type="button" onClick={startNewChat} title="New chat" aria-label="Start a new chat" className="w-10 h-10 rounded-full flex items-center justify-center bg-career-primary text-career-surface hover:bg-career-primary/90 transition-colors shadow-sm btn-press">
             <Plus className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Chat history" className="flex-1 flex gap-2 overflow-x-auto p-3 md:flex-col md:overflow-y-auto scrollbar-thin">
          {sessions.map((session) => (
            <button key={session.id} type="button" onClick={() => void openSession(session.id)} className={`min-w-44 px-4 py-3 rounded-xl text-left transition-colors md:min-w-0 flex flex-col gap-1 ${session.id === sessionId ? 'bg-career-primary/10 border border-career-primary/20 shadow-sm' : 'border border-transparent hover:bg-white hover:border-career-border/50'}`}>
              <span className={`block truncate text-sm font-medium ${session.id === sessionId ? 'text-career-primary' : 'text-career-dark'}`}>{session.title}</span>
              <span className="block text-xs text-career-muted font-medium">{new Date(session.updated_at).toLocaleDateString()}</span>
            </button>
          ))}
          {!sessions.length && (
            <div className="p-4 text-center border-2 border-dashed border-career-border/50 rounded-xl m-2">
               <p className="text-sm font-medium text-career-dark">No chat history</p>
               <p className="mt-1 text-xs text-career-muted">Your saved conversations will appear here.</p>
            </div>
          )}
        </nav>
        <div className="hidden md:block p-5 border-t border-career-border/50 bg-career-background/50">
           <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-career-accent shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-career-muted font-medium">Advice is grounded in your profile, readiness, skills, roadmap, resume, and interview records.</p>
           </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex min-h-[34rem] min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center gap-3 sm:gap-4 border-b border-career-border/50 px-4 sm:px-6 py-4 bg-career-surface/30 backdrop-blur-sm shrink-0">
          <div className="relative">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-career-primary to-career-secondary text-white flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5" />
             </div>
             <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0">
             <h2 className="font-serif text-base sm:text-lg text-career-dark truncate">CareerPro AI Coach</h2>
             <p className="text-xs font-medium text-career-primary flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-career-primary animate-pulse"></div> Context-aware guidance</p>
          </div>
          {loadingSession && <LoaderCircle className="ml-auto h-5 w-5 animate-spin text-career-primary" />}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
          {error && (
             <div role="alert" className="mb-6 flex items-start gap-3 border-l-4 border-rose-500 bg-rose-50/50 p-4 rounded-r-xl text-sm text-career-text shadow-sm animate-[slide-down_0.3s_ease-out]">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="flex-1">
                   {error}
                   {retryText && (
                      <button type="button" onClick={() => void sendMessage(retryText)} disabled={sending} className="ml-3 inline-flex items-center gap-1.5 font-semibold text-rose-700 hover:text-rose-900 transition-colors disabled:opacity-60">
                         <RotateCw className="h-3.5 w-3.5" />Retry
                      </button>
                   )}
                </div>
             </div>
          )}

          {!messages.length ? (
            <div className="h-full flex flex-col justify-center items-center max-w-3xl mx-auto py-8">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-career-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-[scale-in_0.5s_ease-out]">
                    <Sparkles className="h-8 w-8 text-career-accent" />
                 </div>
                 <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-2">Personalized Coaching</p>
                 <h3 className="text-2xl sm:text-3xl font-serif text-career-dark mb-3">What would you like to work on?</h3>
                 <p className="text-sm leading-relaxed text-career-muted max-w-lg mx-auto">Ask about your readiness score, skill priorities, roadmap, resume projects, or interview feedback. I have full context on your CareerPro profile.</p>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2 w-full">
                {prompts.map((prompt, i) => (
                   <button key={prompt} type="button" onClick={() => { setDraft(prompt); void sendMessage(prompt); }} disabled={sending} className="flex min-h-[3.5rem] items-center justify-between gap-3 border border-career-border/60 bg-career-background/40 px-4 py-3 rounded-xl text-left text-sm font-medium text-career-dark transition-all hover:border-career-primary/40 hover:bg-career-primary/5 hover:shadow-sm disabled:opacity-60 group animate-[fade-up_0.4s_ease-out_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                      <span className="leading-snug">{prompt}</span>
                      <MessageCircle className="h-4 w-4 shrink-0 text-career-muted group-hover:text-career-primary transition-colors" />
                   </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <article key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-[slide-up_0.3s_ease-out]`}>
                  {message.role === 'assistant' && (
                     <div className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-career-primary to-career-secondary text-white items-center justify-center shrink-0 shadow-sm mt-1">
                        <Bot className="h-4 w-4" />
                     </div>
                  )}
                  <div className={`max-w-[92%] sm:max-w-[85%] min-w-0 break-words whitespace-pre-wrap px-3 sm:px-5 py-3 sm:py-4 text-sm leading-relaxed shadow-sm ${message.role === 'user' ? 'bg-career-primary text-white rounded-2xl rounded-tr-sm' : 'border border-career-border/60 bg-career-surface rounded-2xl rounded-tl-sm text-career-dark'}`}>
                     {message.content}
                  </div>
                  {message.role === 'user' && (
                     <div className="hidden sm:flex w-8 h-8 rounded-full bg-career-background border border-career-border text-career-muted items-center justify-center shrink-0 mt-1">
                        <UserRound className="h-4 w-4" />
                     </div>
                  )}
                </article>
              ))}
              
              {sending && (
                 <div className="flex items-center gap-4 animate-[fade-in_0.3s_ease-out]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-career-primary to-career-secondary text-white flex items-center justify-center shrink-0 shadow-sm">
                       <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-career-surface border border-career-border/60 px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm text-career-muted flex items-center gap-3">
                       <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-career-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-career-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 bg-career-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                       </div>
                       <span className="font-medium">Analyzing your profile...</span>
                    </div>
                 </div>
              )}
              
              {!!suggestedActions.length && !sending && (
                 <div className="ml-0 sm:ml-12 flex flex-wrap gap-2 pt-2 animate-[fade-in_0.5s_ease-out]">
                    {suggestedActions.map((action) => (
                       <button key={action} type="button" onClick={() => { setDraft(action); void sendMessage(action); }} className="border border-career-border/80 bg-career-surface px-4 py-2 rounded-full text-xs font-medium text-career-primary hover:bg-career-primary hover:text-white hover:border-career-primary transition-colors shadow-sm">
                          {action}
                       </button>
                    ))}
                 </div>
              )}
              <div ref={endOfMessages} className="h-4" />
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 md:p-6 bg-white border-t border-career-border/50 shrink-0">
          <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 bg-career-surface border border-career-border p-2 rounded-2xl focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary/20 transition-all shadow-sm">
              <textarea 
                value={draft} 
                onChange={(event) => setDraft(event.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                maxLength={4000} 
                rows={1} 
                placeholder="Ask your AI coach anything..." 
                aria-label="Message the CareerPro Advisor" 
                className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-career-dark outline-none placeholder:text-career-muted/60 scrollbar-thin" 
              />
              <button 
                 type="submit" 
                 aria-label="Send message" 
                 title="Send message" 
                 disabled={sending || !draft.trim()} 
                 className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-career-primary text-white transition-all hover:bg-career-primary/90 disabled:cursor-not-allowed disabled:bg-career-border disabled:text-career-muted shadow-sm mb-0.5 mr-0.5"
              >
                 {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
              </button>
            </div>
            <p className="mt-2 w-full text-center text-[10px] font-medium text-career-muted/70 uppercase tracking-widest">Responses are tailored to your unique career data</p>
          </form>
        </div>
      </main>
    </Card>
  );
}