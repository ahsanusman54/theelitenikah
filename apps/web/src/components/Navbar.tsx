import Link from "next/link";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/messages", label: "Messages" },
  { href: "/match", label: "Match" },
  { href: "/activities", label: "Activities" },
  { href: "/search", label: "Search" },
];

type NotificationRow = {
  id: string;
  type: string;
  content: string;
  read_status: boolean;
  created_at: string;
};

export default function Navbar({
  userId,
  userName,
  userEmail,
  initialNotifications,
  isAdmin,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
  initialNotifications: NotificationRow[];
  isAdmin: boolean;
}) {
  const displayName = userName || userEmail.split("@")[0];

  return (
    <header className="bg-navbar text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-pink text-white">
            ♥
          </span>
          theelitenikah
        </Link>

        <nav className="hidden gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-pink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <NotificationBell myId={userId} initialNotifications={initialNotifications} />
          <Link
            href="/credits"
            className="rounded-full bg-brand-pink px-4 py-1.5 text-sm font-semibold hover:bg-brand-pink-dark"
          >
            Get more credits
          </Link>
          <UserMenu displayName={displayName} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
