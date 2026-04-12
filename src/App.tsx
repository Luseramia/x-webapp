import { useState } from "react";
import "./App.css";
import AppRoutes from "./routes";
import MainLayout from "./layouts/MainLayout";
import { useAuth } from "./hooks/useAuth";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
function App() {
  const { isLoggedIn, login, logout } = useAuth();
  const [count, setCount] = useState(0);

  return (
    <>
      <Toaster position="top-center" />
      <Router>
        <MainLayout isLoggedIn={isLoggedIn} onLogout={logout}>
          <AppRoutes isLoggedIn={isLoggedIn} onLogin={login} />
        </MainLayout>
      </Router>
    </>
  );
}

export default App;
