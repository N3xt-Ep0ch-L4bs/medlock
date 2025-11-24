import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.png";
import "./components.css";

function Navbar() {
  const navigate = useNavigate(); // ✅ define navigate here

  return (
    <div className="navbar">
      <div className="logo" onClick={() => navigate("/")}>
        <img src={Logo} alt="MedLock logo" />
        <p>MedLock</p>
      </div>

      <nav className="nav-links">
        <a href="#features">Features</a>
        <a href="/howitworks">How it works</a>
        <a href="#about">About</a>
        <a href="/support">Support</a>
        <button onClick={() => navigate("/login")} className="started-btn">
          Get started
        </button>
      </nav>
    </div>
  );
}

export default Navbar;

