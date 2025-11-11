import { Outlet, Route, Routes } from "react-router-dom";
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

function Layout() {
  return (
    <div>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}

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
