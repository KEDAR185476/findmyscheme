import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Shield, Send, Bot, User, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatMessage } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const estimatedTotal = 6; // Estimated max questions
  const progress = Math.min((questionsAsked / estimatedTotal) * 100, 95);

  const fetchNextQuestion = useCallback(async (history: { role: string; content: string }[], currentProfile: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-questions", {
        body: { profile: currentProfile, conversationHistory: history },
      });

      if (error) throw error;

      if (data.error) {
        // Handle rate limits / payment
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const q = data as AIQuestion;

      if (q.complete) {
        // AI says we have enough info
        syncProfileToServer();
        setMessages(prev => [
          ...prev,
          ...(q.greeting ? [{ id: `g-done`, role: "assistant" as const, content: q.greeting }] : []),
          { id: "done", role: "assistant" as const, content: "I have enough information now. Let me find the best government schemes for you! 🎉" },
        ]);
        setLoading(false);
        setTimeout(() => {
          navigate("/schemes");
          toast.success("Profile complete! Showing your matched schemes.");
        }, 1500);
        return;
      }

      setCurrentQuestion(q);
      const newMessages: ChatMessage[] = [];
      if (q.greeting) {
        newMessages.push({ id: `g-${questionsAsked}`, role: "assistant", content: q.greeting });
      }
      newMessages.push({
        id: `q-${questionsAsked}`,
        role: "assistant",
        content: q.question,
        suggestions: q.suggestions,
      });
      setMessages(prev => [...prev, ...newMessages]);
    } catch (err) {
      console.error("Failed to fetch AI question:", err);
      toast.error("Failed to generate question. Using fallback.");
      // Fallback to basic questions
      fallbackQuestion();
    }
    setLoading(false);
  }, [questionsAsked, syncProfileToServer, navigate]);

  const fallbackQuestions: AIQuestion[] = [
    { question: "What is your current employment status?", key: "employmentStatus", suggestions: ["Employed (Salaried)", "Self-Employed", "Farmer", "Student", "Unemployed", "Retired"], complete: false },
    { question: "What is your highest level of education?", key: "educationLevel", suggestions: ["Below 10th", "10th Pass", "12th Pass", "Graduate", "Post Graduate"], complete: false },
    { question: "Do you own any agricultural land?", key: "landOwnership", suggestions: ["No land", "Below 1 acre", "1-5 acres", "Above 5 acres"], complete: false },
    { question: "Do you have a bank account linked with Aadhaar?", key: "hasBankAccount", suggestions: ["Yes", "No", "Not sure"], complete: false },
  ];
  const fallbackIndex = useRef(0);

  const fallbackQuestion = () => {
    const q = fallbackQuestions[fallbackIndex.current % fallbackQuestions.length];
    fallbackIndex.current++;
    // Skip if already answered
    if ((profile as any)[q.key]) {
      if (fallbackIndex.current < fallbackQuestions.length) {
        fallbackQuestion();
        return;
      }
      // All done
      syncProfileToServer();
      setMessages(prev => [...prev, { id: "done", role: "assistant", content: "Profile complete! Let me find schemes for you! 🎉" }]);
      setTimeout(() => navigate("/schemes"), 1500);
      return;
    }
    setCurrentQuestion(q);
    setMessages(prev => [...prev, { id: `q-${questionsAsked}`, role: "assistant", content: q.question, suggestions: q.suggestions }]);
  };

  // Initialize
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi${profile.name ? ` ${profile.name}` : ""}! I'll ask you a few smart questions to find the best government schemes for you. Your answers help me personalize recommendations.`,
      },
    ]);

    fetchNextQuestion([], profile);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion || loading) return;

    // Add user message
    setMessages(prev => [...prev, { id: `u-${questionsAsked}`, role: "user", content: answer }]);

    // Update profile
    let value: any = answer;
    if (currentQuestion.key === "hasDisability") value = answer !== "No";
    if (currentQuestion.key === "hasBankAccount") value = answer === "Yes";
    if (currentQuestion.key === "income") value = incomeMap[answer] || parseInt(answer.replace(/[^\d]/g, "")) || null;

    const updatedProfile = { ...profile, [currentQuestion.key]: value };
    setProfile(prev => ({ ...prev, [currentQuestion.key]: value }));

    // Update conversation history for AI context
    const newHistory = [
      ...conversationHistory,
      { role: "assistant", content: currentQuestion.question },
      { role: "user", content: answer },
    ];
    setConversationHistory(newHistory);
    setQuestionsAsked(prev => prev + 1);
    setCurrentQuestion(null);
    setInput("");

    // Fetch next AI question
    await fetchNextQuestion(newHistory, updatedProfile);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">Smart Questions</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {questionsAsked} answered
            </span>
            <Progress value={progress} className="h-1.5 w-24" />
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl space-y-4">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "assistant" ? "bg-card border" : "bg-primary text-primary-foreground"}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border bg-card px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Suggestions + Input */}
      <div className="border-t bg-card p-4">
        <div className="mx-auto max-w-xl">
          {currentQuestion?.suggestions && !loading && (
            <div className="mb-3 flex flex-wrap gap-2">
              {currentQuestion.suggestions.map(s => (
                <Button key={s} size="sm" variant="outline" className="rounded-full text-xs" onClick={() => handleAnswer(s)}>
                  {s}
                </Button>
              ))}
            </div>
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
              className="flex-1"
              disabled={loading || !currentQuestion}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading || !currentQuestion}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Questions;
