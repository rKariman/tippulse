import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AdminGuard } from "@/components/auth/AdminGuard";
import HomePage from "./pages/HomePage";
import TipsPage from "./pages/TipsPage";
import PredictionsPage from "./pages/PredictionsPage";
import MatchPreviewPage from "./pages/MatchPreviewPage";
import NewsPage from "./pages/NewsPage";
import ArticlePage from "./pages/ArticlePage";
import FreeBetsPage from "./pages/FreeBetsPage";
import RedirectPage from "./pages/RedirectPage";
import AdminSyncPage from "./pages/AdminSyncPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NewsEditor from "./pages/admin/NewsEditor";
import FreeBetEditor from "./pages/admin/FreeBetEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tips/:market" element={<TipsPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/match/:slug" element={<MatchPreviewPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<ArticlePage />} />
            <Route path="/free-bets" element={<FreeBetsPage />} />
            <Route path="/r/:id" element={<RedirectPage />} />
            <Route path="/admin/sync" element={<AdminSyncPage />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Admin routes (protected) */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/news/:id" element={<AdminGuard><NewsEditor /></AdminGuard>} />
            <Route path="/admin/free-bets/:id" element={<AdminGuard><FreeBetEditor /></AdminGuard>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
