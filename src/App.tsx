import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import TeachingSchedule from "./pages/TeachingSchedule";
import { ScrollArea } from "@/components/ui/scroll-area";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route element={<ProtectedRoute />}>
          <Route path="teaching-schedule" element={<TeachingSchedule />} />
        </Route>
      </Route>
    </Routes>
  );
}

function Layout() {
  return (
    <ScrollArea className="h-screen">
      <div className="min-h-screen">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </ScrollArea>
  );
}

function Home() {
  return <Navigate to="/teaching-schedule" />;
}

export default App;
