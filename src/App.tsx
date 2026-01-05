import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { CommandMenu } from "./components/CommandMenu";
import { SchoolYearProvider } from "./contexts/SchoolYearContext";
import { EmployeeProvider } from "./contexts/EmployeeContext";
import Login from "./pages/Login";
import TeachingSchedule from "./pages/TeachingSchedule";
import Classes from "./pages/Classes";
import ClassDetails from "./pages/ClassDetails";
import ScoreBook from "./pages/ScoreBook";
import NotFound from "./pages/NotFound";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <SchoolYearProvider>
      <EmployeeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route element={<ProtectedRoute />}>
              <Route path="teaching-schedule" element={<TeachingSchedule />} />
              <Route path="classes" element={<Classes />} />
              <Route path="classes/:classId" element={<ClassDetails />} />
              <Route path="score-book" element={<ScoreBook />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </EmployeeProvider>
    </SchoolYearProvider>
  );
}

function Layout() {
  return (
    <SidebarProvider>
      <CommandMenu />
      <AppSidebar />
      <ScrollArea className="h-screen flex-1">
        <div className="min-h-screen">
          <main className="p-12">
            <Outlet />
          </main>
          <Toaster position="top-center" />
        </div>
      </ScrollArea>
    </SidebarProvider>
  );
}

function Home() {
  return <Navigate to="/teaching-schedule" />;
}

export default App;
