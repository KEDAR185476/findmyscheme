import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Upload from "./pages/Upload.tsx";
import Verify from "./pages/Verify.tsx";
import Questions from "./pages/Questions.tsx";
import Schemes from "./pages/Schemes.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import ExplainEligibility from "./pages/ExplainEligibility.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
