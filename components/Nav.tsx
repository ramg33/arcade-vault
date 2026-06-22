'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, saveUser } from "@/lib/auth";
import type { User } from "@/lib/data";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("av-auth", sync);
    return () => window.removeEventListener("av-auth", sync);
  }, []);

  const isActive = (name: "biblioteca" | "salon") => {
    if (name === "biblioteca") return pathname.startsWith("/games");
    if (name === "salon") return pathname === "/hall";
    return false;
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleSignOut = () => {
    saveUser(null);
    window.dispatchEvent(new Event("av-auth"));
    router.push("/");
  };

  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => go("/")}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </div>

        <div className="links">
          <Link
            href="/games"
            className={isActive("biblioteca") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            Biblioteca
          </Link>
          <Link
            href="/hall"
            className={isActive("salon") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            Salón de la Fama
          </Link>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <button className="btn auth-btn" onClick={() => go("/auth")}>
            Iniciar Sesión
          </button>
        )}

        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <a
          className={isActive("biblioteca") ? "active" : ""}
          onClick={() => go("/games")}
          style={{ cursor: "pointer" }}
        >
          Biblioteca
        </a>
        <a
          className={isActive("salon") ? "active" : ""}
          onClick={() => go("/hall")}
          style={{ cursor: "pointer" }}
        >
          Salón de la Fama
        </a>
        <a
          className={pathname === "/auth" ? "active" : ""}
          onClick={() => go("/auth")}
          style={{ cursor: "pointer" }}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </a>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
