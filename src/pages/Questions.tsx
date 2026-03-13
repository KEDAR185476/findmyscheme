import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Shield, Send, ArrowRight, Bot, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatMessage } from "@/types";
import { toast } from "sonner";

// Mock AI question flow — these are generated based on missing profile fields
const generateQuestions = (profile: any): { question: string; key: string; suggestions: string[] }[] => {
  const qs: { question: string; key: string; suggestions: string[] }[] = [];

  if (!profile.employmentStatus) {
    qs.push({
      question: "What is your current employment status?",
      key: "employmentStatus",
      suggestions: ["Employed (Salaried)", "Self-Employed", "Farmer", "Daily Wage Worker", "Unemployed", "Student", "Retired"],
    });
  }
  if (!profile.educationLevel) {
    qs.push({
      question: "What is your highest level of education?",
      key: "educationLevel",
      suggestions: ["Below 10th", "10th Pass", "12th Pass", "Graduate", "Post Graduate", "Professional Degree"],
    });
  }
  if (!profile.maritalStatus) {
    qs.push({
      question: "What is your marital status?",
      key: "maritalStatus",
      suggestions: ["Single", "Married", "Widowed", "Divorced"],
    });
  }
  if (!profile.hasDisability && profile.hasDisability !== false) {
    qs.push({
      question: "Do you or any family member have a disability?",
      key: "hasDisability",
      suggestions: ["No", "Yes - Physical", "Yes - Visual", "Yes - Hearing", "Yes - Intellectual"],
    });
  }
  if (!profile.landOwnership) {
    qs.push({
      question: "Do you own any agricultural land?",
      key: "landOwnership",
      suggestions: ["No land", "Below 1 acre", "1-5 acres", "Above 5 acres"],
    });
  }
  if (!profile.hasBankAccount && profile.hasBankAccount !== true) {
    qs.push({
      question: "Do you have a bank account linked with Aadhaar?",
      key: "hasBankAccount",
      suggestions: ["Yes", "No", "Not sure"],
    });
  }
  if (!profile.income && profile.income !== 0) {
    qs.push({
      question: "What is your approximate annual family income?",
      key: "income",
      suggestions: ["Below ₹1 lakh", "₹1-2.5 lakh", "₹2.5-5 lakh", "₹5-8 lakh", "Above ₹8 lakh"],
    });
  }

  return qs;
};

const incomeMap: Record<string, number> = {
  "Below ₹1 lakh": 80000,
  "₹1-2.5 lakh": 175000,
  "₹2.5-5 lakh": 375000,
  "₹5-8 lakh": 650000,
  "Above ₹8 lakh": 1000000,
};

const Questions = () => {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const questions = generateQuestions(profile);
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQ) / totalQuestions) * 100 : 100;

  useEffect(() => {
    if (questions.length === 0) {
      navigate("/schemes");
      return;
    }
    // Ask first question
    if (messages.length === 0) {
      setTyping(true);
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hi${profile.name ? ` ${profile.name}` : ""}! I have a few quick questions to help find the best schemes for you. Let's begin!`,
          },
          {
            id: "q-0",
            role: "assistant",
            content: questions[0].question,
            suggestions: questions[0].suggestions,
          },
        ]);
        setTyping(false);
      }, 800);
    }
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleAnswer = (answer: string) => {
    const q = questions[currentQ];
    if (!q) return;

    // Add user message
    setMessages(prev => [...prev, { id: `u-${currentQ}`, role: "user", content: answer }]);

    // Update profile
    let value: any = answer;
    if (q.key === "hasDisability") value = answer !== "No";
    if (q.key === "hasBankAccount") value = answer === "Yes";
    if (q.key === "income") value = incomeMap[answer] || parseInt(answer.replace(/[^\d]/g, "")) || null;

    setProfile(prev => ({ ...prev, [q.key]: value }));

    const nextQ = currentQ + 1;

    if (nextQ >= questions.length) {
      // Done
      setTyping(true);
      // Mark onboarding complete and sync to server
      syncProfileToServer();
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: "done", role: "assistant", content: "Thank you! I have enough information now. Let me find the best schemes for you! 🎉" },
        ]);
        setTyping(false);
        setTimeout(() => {
          navigate("/schemes");
          toast.success("Profile complete! Showing your matched schemes.");
        }, 1500);
      }, 600);
    } else {
      setCurrentQ(nextQ);
      setTyping(true);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: `q-${nextQ}`, role: "assistant", content: questions[nextQ].question, suggestions: questions[nextQ].suggestions },
        ]);
        setTyping(false);
      }, 500);
    }
    setInput("");
  };

  const currentSuggestions = questions[currentQ]?.suggestions || [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">Smart Questions</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{Math.min(currentQ + 1, totalQuestions)}/{totalQuestions}</span>
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

          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border bg-card px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Suggestions + Input */}
      <div className="border-t bg-card p-4">
        <div className="mx-auto max-w-xl">
          {currentSuggestions.length > 0 && !typing && (
            <div className="mb-3 flex flex-wrap gap-2">
              {currentSuggestions.map(s => (
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
              disabled={typing || currentQ >= questions.length}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || typing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Questions;
