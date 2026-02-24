import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Login from "./components/login/login";
import CheckLogin from "./components/home/check-login";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <CheckLogin></CheckLogin>
    </>
  );
}

export default App;
