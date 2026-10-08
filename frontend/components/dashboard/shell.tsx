"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { House, Plane, UserCircle } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { useApp } from "@/components/providers";
export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter(),
    path = usePathname();
  return (
    <>
      <div className="dashboard-header">
        <Navigation
          onSearch={() => router.push("/")}
          onWishlist={() => router.push("/?wishlist=1")}
          wishlist={false}
        />
      </div>
      <main id="main-content" className="dashboard-shell">
        <nav className="dashboard-nav" aria-label="Your travel and hosting">
          <Link href="/trips" className={path === "/trips" ? "active" : ""}>
            <Plane size={17} />
            Trips
          </Link>
          <Link href="/hosting" className={path === "/hosting" ? "active" : ""}>
            <House size={17} />
            Hosting
          </Link>
        </nav>
        {children}
      </main>
    </>
  );
}
export function AccountGate({
  host = false,
  children,
}: {
  host?: boolean;
  children: ReactNode;
}) {
  const { user, users, selectUser, identityError } = useApp();
  if (identityError)
    return (
      <div className="empty-state" role="alert">
        <h1>Accounts are unavailable</h1>
        <p>{identityError}</p>
        <button
          className="button-dark"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </button>
      </div>
    );
  if (!user)
    return (
      <div className="empty-state" role="status">
        Loading your account…
      </div>
    );
  if (host && user.role !== "host")
    return (
      <section className="host-welcome">
        <House size={40} />
        <h1>Welcome to hosting</h1>
        <p>Choose a demo host to manage their homes and reservations.</p>
        <div className="host-account-choices">
          {users
            .filter((u) => u.role === "host")
            .map((u) => (
              <button
                className="account-option"
                key={u.id}
                onClick={() => selectUser(u.id)}
              >
                <UserCircle size={32} />
                <strong>{u.name}</strong>
              </button>
            ))}
        </div>
      </section>
    );
  return <>{children}</>;
}
export function BookingStatus({
  status,
  checkIn,
  checkOut,
}: {
  status: string;
  checkIn: string;
  checkOut: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const label =
    status === "cancelled"
      ? "Cancelled"
      : checkOut <= today
        ? "Completed"
        : checkIn <= today
          ? "In progress"
          : "Upcoming";
  return (
    <span className={`status-pill ${label.toLowerCase().replace(" ", "-")}`}>
      {label}
    </span>
  );
}
