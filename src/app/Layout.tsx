import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BookOpen,
  ChartNoAxesCombined,
  History,
  House,
  Moon,
  Sprout,
  Sun,
  Upload,
  Zap,
} from "lucide-react";
const links = [
  { to: "/", label: "Tableau de bord", icon: House },
  { to: "/vocabulary", label: "Mon vocabulaire", icon: BookOpen },
  { to: "/practice", label: "Entraînement", icon: Zap },
  { to: "/progress", label: "Ma progression", icon: Sprout },
  { to: "/statistics", label: "Statistiques", icon: ChartNoAxesCombined },
  { to: "/history", label: "Historique", icon: History },
];
export default function Layout() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <a className="skip" href="#content">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span lang="zh">知</span>
          <div>
            zhī<span>UN PEU CHAQUE JOUR</span>
          </div>
        </NavLink>
        <div className="nav-caption">MON ESPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/import">
            <Upload size={19} />
            Importer mes données
          </NavLink>
          <div className="small-note">
            <span lang="zh">千里之行，始于足下。</span>
            <p>Un voyage de mille lieues commence par un premier pas.</p>
          </div>
          <button
            className="theme"
            onClick={() => {
              try {
                localStorage.setItem("theme", dark ? "light" : "dark");
              } catch {
                /* The theme still works for this visit. */
              }
              setDark(!dark);
            }}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}Mode{" "}
            {dark ? "clair" : "sombre"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>Votre rendez-vous avec le mandarin</span>
          <span className="language">
            简体中文 <span>Chinois simplifié</span>
          </span>
        </div>
        <main id="content">
          <Outlet />
        </main>
        <footer>
          Apprendre, pratiquer, progresser.{" "}
          <span>一步一步 · Un pas à la fois</span>
        </footer>
      </div>
    </div>
  );
}
