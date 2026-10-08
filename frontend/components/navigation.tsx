"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  Menu,
  UserCircle,
  Moon,
  Sun,
  Heart,
  House,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "./providers";
import { Modal } from "./modal";
export function Navigation({
  onSearch,
  onWishlist,
  wishlist,
}: {
  onSearch: () => void;
  onWishlist: () => void;
  wishlist: boolean;
}) {
  const { user, users, selectUser, dark, toggleTheme, identityError, notify } =
    useApp();
  const [account, setAccount] = useState(false);
  const path = usePathname();
  return (
    <>
      <header className="topbar shell">
        <Link href="/" className="brand" aria-label="Airbnb home">
          <svg
            width="34"
            height="36"
            viewBox="0 0 32 36"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M16 3c-3 0-4 4-7 10C6 19 1 27 4 31c4 5 10-3 12-6 2 3 8 11 12 6 3-4-2-12-5-18-3-6-4-10-7-10Z"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              d="M16 25c-8-9-4-13 0-13s8 4 0 13Z"
              stroke="currentColor"
              strokeWidth="2.2"
            />
          </svg>
          <span>airbnb</span>
        </Link>
        <nav className="primary-tabs" aria-label="Main">
          <button
            className={!wishlist && path === "/" ? "active" : ""}
            onClick={() => (wishlist ? onWishlist() : onSearch())}
          >
            Stays
          </button>
          <button onClick={() => notify("Experiences are coming soon.")}>
            Experiences
          </button>
        </nav>
        <div className="account-actions">
          <Link className="host-link" href="/hosting">
            Switch to hosting
          </Link>
          <button
            className="icon-button theme-button"
            onClick={toggleTheme}
            aria-label={dark ? "Use light mode" : "Use dark mode"}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="profile-button"
            aria-label="Open account menu"
            onClick={() => setAccount(true)}
          >
            <Menu size={19} />
            <UserCircle size={30} fill="currentColor" stroke="var(--surface)" />
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          onClick={() => (wishlist ? onWishlist() : onSearch())}
          className={!wishlist && path === "/" ? "active" : ""}
        >
          <Search size={23} />
          Explore
        </button>
        <button onClick={onWishlist} className={wishlist ? "active" : ""}>
          <Heart size={23} />
          Wishlists
        </button>
        <Link href="/trips" className={path === "/trips" ? "active" : ""}>
          <House size={23} />
          Trips
        </Link>
        <button onClick={() => setAccount(true)}>
          <UserCircle size={23} />
          Profile
        </button>
      </nav>
      {account && (
        <Modal title="Your account" onClose={() => setAccount(false)}>
          <div className="account-panel">
            <p className="muted">Choose an account to explore the demo.</p>
            {identityError && <p role="alert">{identityError}</p>}
            {users.map((u) => (
              <button
                className={`account-option ${user?.id === u.id ? "selected" : ""}`}
                key={u.id}
                onClick={() => {
                  selectUser(u.id);
                  setAccount(false);
                }}
              >
                <UserCircle size={32} />
                <span>
                  <strong>{u.name}</strong>
                  <small>
                    {u.role === "host"
                      ? "Host · manage your homes"
                      : "Guest · discover your next stay"}
                  </small>
                </span>
                {user?.id === u.id && <span className="selected-dot" />}
              </button>
            ))}
            <button
              className="account-option"
              onClick={() => {
                onWishlist();
                setAccount(false);
              }}
            >
              <Heart size={22} />
              Your wishlist
            </button>
            <Link
              className="account-option"
              href="/trips"
              onClick={() => setAccount(false)}
            >
              <House size={22} />
              My trips
            </Link>
            <Link
              className="account-option"
              href="/hosting"
              onClick={() => setAccount(false)}
            >
              <House size={22} />
              Host dashboard
            </Link>
            <div className="account-option">
              <Globe size={20} />
              English (US) · USD
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
