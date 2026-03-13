import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, User, Send, Loader2, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatMessage } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";

const MAX_QUESTIONS = 4;

const incomeMap: Record<string, number> = {
  "Below ₹1 lakh": 80000,
  "₹1-2.5 lakh": 175000,
  "₹2.5-5 lakh": 375000,
  "₹5-8 lakh": 650000,
  "Above ₹8 lakh": 1000000,
};

interface AIQuestion {
  question: string;
  key: string;
  suggestions: string[];
  complete: boolean;
  greeting?: string;
}

const Questions = () => {
  const navigate = useNavigate();
  const { profile, setProfile, syncProfileToServer } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const progress = Math.min((questionsAsked / 3) * 100, 100);

  const completeAndNavigate = useCallback((greeting?: string) => {
    syncProfileToServer();
    const newMessages: ChatMessage[] = [];
    if (greeting) {
      newMessages.push({ id: "g-done", role: "assistant", content: greeting });
    }
    newMessages.push({
      id: "done",
      role: "assistant",
      content: "I have everything I need! Let me find the best government schemes for you 🎉",
    });
    setMessages(prev => [...prev, ...newMessages]);
    setLoading(false);
    setTimeout(() => {
      navigate("/schemes");
      toast.success("Profile complete! Showing your matched schemes.");
    }, 1200);
  }, [syncProfileToServer, navigate]);

  const fetchNextQuestion = useCallback(
    async (history: { role: string; content: string }[], currentProfile: any, asked: number) => {
      // Client-side hard cap enforcement
      if (asked >= MAX_QUESTIONS) {
        completeAndNavigate("That's all the questions I needed!");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("smart-questions", {
          body: { profile: currentProfile, conversationHistory: history, questionsAsked: asked },
        });
        if (error) throw error;
        if (data.error) { toast.error(data.error); setLoading(false); return; }

        const q = data as AIQuestion;
        if (q.complete) {
          completeAndNavigate(q.greeting);
          return;
        }

        setCurrentQuestion(q);
        const newMessages: ChatMessage[] = [];
        if (q.greeting) newMessages.push({ id: `g-${asked}`, role: "assistant", content: q.greeting });
        newMessages.push({ id: `q-${asked}`, role: "assistant", content: q.question, suggestions: q.suggestions });
        setMessages(prev => [...prev, ...newMessages]);
      } catch (err) {
        console.error("Failed to fetch AI question:", err);
        toast.error("Failed to generate question. Using fallback.");
        fallbackQuestion(asked);
      }
      setLoading(false);
    },
    [completeAndNavigate]
  );

  // Minimal fallback — single high-impact question
  const fallbackQuestion = (asked: number) => {
    if (asked >= MAX_QUESTIONS || profile.employmentStatus) {
      completeAndNavigate();
      return;
    }
    const q: AIQuestion = {
      question: "What best describes your current situation?",
      key: "employmentStatus",
      suggestions: ["Student", "Farmer", "Salaried", "Business Owner", "Self-Employed", "Unemployed", "Retired"],
      complete: false,
      greeting: "Just one quick question!",
    };
    setCurrentQuestion(q);
    setMessages(prev => [
      ...prev,
      { id: `g-${asked}`, role: "assistant", content: q.greeting! },
      { id: `q-${asked}`, role: "assistant", content: q.question, suggestions: q.suggestions },
    ]);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Count how many fields are already filled from OCR
    const filledFields = ["name", "dob", "gender", "address", "state", "income", "employmentStatus"]
      .filter(k => {
        const v = (profile as any)[k];
        return v !== null && v !== undefined && v !== "";
      });

    const welcomeMsg = filledFields.length >= 5
      ? `Great news${profile.name ? `, ${profile.name}` : ""}! Your documents filled most of your profile. I just need to confirm a couple of things.`
      : `Hi${profile.name ? ` ${profile.name}` : ""}! I'll ask just 1–2 quick questions to match you with the right schemes.`;

    setMessages([{ id: "welcome", role: "assistant", content: welcomeMsg }]);
    fetchNextQuestion([], profile, 0);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion || loading) return;
    setMessages(prev => [...prev, { id: `u-${questionsAsked}`, role: "user", content: answer }]);

    let value: any = answer;
    if (currentQuestion.key === "hasDisability") value = answer !== "No";
    if (currentQuestion.key === "hasBankAccount") value = answer === "Yes";
    if (currentQuestion.key === "income") value = incomeMap[answer] || parseInt(answer.replace(/[^\d]/g, "")) || null;

    const updatedProfile = { ...profile, [currentQuestion.key]: value };
    setProfile(prev => ({ ...prev, [currentQuestion.key]: value }));

    const newHistory = [
      ...conversationHistory,
      { role: "assistant", content: currentQuestion.question },
      { role: "user", content: answer },
    ];
    setConversationHistory(newHistory);
    const newCount = questionsAsked + 1;
    setQuestionsAsked(newCount);
    setCurrentQuestion(null);
    setInput("");
    await fetchNextQuestion(newHistory, updatedProfile, newCount);
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 glass-nav">
          <div className="container flex h-16 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold">Quick Questions</span>
              <p className="text-xs text-muted-foreground">Step 3 of 3 • Just 1–3 questions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {questionsAsked === 0 ? "Starting" : `${questionsAsked} of ~3`}
                </span>
              </div>
              <div className="w-16 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-1.5 rounded-full gradient-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-xl space-y-4">
            <AnimatePresence>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "assistant"
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "bg-muted border border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-card border shadow-soft"
                        : "gradient-primary text-primary-foreground shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border bg-card px-4 py-3.5 shadow-soft">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse-soft" />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse-soft" style={{ animationDelay: "0.15s" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
                    </div>
                    Thinking...
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Suggestions + Input */}
        <div className="border-t bg-card/80 backdrop-blur-xl p-4">
          <div className="mx-auto max-w-xl">
            {currentQuestion?.suggestions && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex flex-wrap gap-2"
              >
                {currentQuestion.suggestions.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className="rounded-full border-primary/20 text-xs hover:bg-primary/5 hover:border-primary/40 transition-all"
                    onClick={() => handleAnswer(s)}
                  >
                    {s}
                  </Button>
                ))}
              </motion.div>
            )}
            <form
              className="flex gap-2"
              onSubmit={e => {
                e.preventDefault();
                if (input.trim()) handleAnswer(input.trim());
              }}
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your answer..."
                className="h-11 flex-1 rounded-xl"
                disabled={loading || !currentQuestion}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-xl shadow-sm"
                disabled={!input.trim() || loading || !currentQuestion}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Questions;
