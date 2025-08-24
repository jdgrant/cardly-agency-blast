
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Wizard from "./pages/Wizard";
import Admin from "./pages/Admin";
import JobDetail from "./pages/JobDetail";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderStatus from "./pages/OrderStatus";
import Html2Pdf from "./pages/Html2Pdf";
import NotFound from "./pages/NotFound";
import PreviewCard from "./pages/PreviewCard";
import OrderManagement from "./pages/OrderManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/job/:orderId" element={<JobDetail />} />
          <Route path="/ordermanagement/:hashedOrderId" element={<OrderManagement />} />
          <Route path="/html2pdf" element={<Html2Pdf />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/order-status" element={<OrderStatus />} />
          <Route path="/preview/:which/:orderId" element={<PreviewCard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
