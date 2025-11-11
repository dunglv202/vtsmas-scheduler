import { Routes, Route, Outlet } from "react-router-dom";
import "./App.css";
import { Button } from "./components/ui/button";
import TeachingSchedule from "./pages/TeachingSchedule";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="teaching-schedule" element={<TeachingSchedule />} />
      </Route>
    </Routes>
  );
}

// Layout component với Outlet
function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b shrink-0">
        <div className="px-4 py-2">
          <h1 className="text-xl font-bold">Lesson Scheduler</h1>
          <nav>{/* Navigation links có thể thêm ở đây */}</nav>
        </div>
      </header>
      <main className="flex-1 overflow-hidden w-full">
        {/* Outlet sẽ render các route con tại đây */}
        <Outlet />
      </main>
    </div>
  );
}

// Component Home mẫu
function Home() {
  return (
    <div>
      <h2>Home</h2>
      <p>Welcome to the Lesson Scheduler application</p>
      <Button>Explore</Button>
    </div>
  );
}

export default App;
