import { Routes, Route, Outlet } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        {/* Thêm các route con khác tại đây */}
        {/* Ví dụ: <Route path="lessons" element={<Lessons />} /> */}
      </Route>
    </Routes>
  );
}

// Layout component với Outlet
function Layout() {
  return (
    <div>
      <header>
        <h1>Lesson Scheduler</h1>
        <nav>{/* Navigation links có thể thêm ở đây */}</nav>
      </header>
      <main>
        {/* Outlet sẽ render các route con tại đây */}
        <Outlet />
      </main>
      <footer>{/* Footer có thể thêm ở đây */}</footer>
    </div>
  );
}

// Component Home mẫu
function Home() {
  return (
    <div>
      <h2>Home</h2>
      <p>Welcome to the Lesson Scheduler application</p>
    </div>
  );
}

export default App;
