import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import TeachingSchedule from "./pages/TeachingSchedule";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
  return <Navigate to="/teaching-schedule" />;
}

export default App;
