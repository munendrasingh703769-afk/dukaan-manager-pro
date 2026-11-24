"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/business";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [bizName, setBizName] = useState("Provider Hub");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let id = getCurrentBusinessId();
        const { data: { user } } = await supabase.auth.getUser();
        if (!id && user) {
          const { data: biz } = await supabase.from("businesses").select("id, name, is_online").eq("owner_id", user.id).limit(1).maybeSingle();
          if (biz?.id && mounted) {
            id = biz.id;
            localStorage.setItem("current_business_id", biz.id);
            if (biz.name) setBizName(biz.name);
            if (typeof biz.is_online === "boolean") setIsOnline(biz.is_online);
          }
        } else if (id) {
          const { data: biz } = await supabase.from("businesses").select("name, is_online").eq("id", id).maybeSingle();
          if (biz && mounted) {
            if (biz.name) setBizName(biz.name);
            if (typeof biz.is_online === "boolean") setIsOnline(biz.is_online);
          }
        }
        if (id && mounted) {
          const { data: notifs } = await supabase.from("notifications").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(10);
          if (notifs && mounted) setNotifications(notifs);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    const id = getCurrentBusinessId();
    if (id) await supabase.from("businesses").update({ is_online: next }).eq("id", id);
  };

  const navItems = [
    { name: "Dashboard", href: "/provider", icon: "🏠" },
    { name: "My Services", href: "/provider/services", icon: "🛠️" },
    { name: "Bookings", href: "/provider/bookings", icon: "📅" },
    { name: "Quotations", href: "/provider/quotations", icon: "📝" },
    { name: "Inventory", href: "/provider/inventory", icon: "📦" },
    { name: "Purchases / Return", href: "/provider/purchases", icon: "📥" },
    { name: "Sales & Billing", href: "/provider/sales", icon: "🧾" },
    { name: "Expenses", href: "/provider/expenses", icon: "💸" },
    { name: "Earnings", href: "/provider/earnings", icon: "💰" },
    { name: "Team / Staff", href: "/provider/team", icon: "👷" },
    { name: "Plans & Upgrade", href: "/provider/plans", icon: "👑" },
    { name: "Profile & Area", href: "/provider/profile", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl bg-slate-100 font-bold text-slate-800 text-sm">☰</button>
          <div>
            <p className="text-xs font-extrabold text-blue-700 leading-none">VyapaarSetu</p>
            <p className="text-[11px] font-bold text-slate-600 truncate max-w-[130px]">{bizName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleOnline} className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}>
            {isOnline ? "🟢 Online" : "⚪ Offline"}
          </button>

          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-full bg-slate-100 relative text-sm">
              🔔
              {notifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-600 rounded-full" />}
            </button>

            {showNotif && <div onClick={() => setShowNotif(false)} className="fixed inset-0 z-40" />}
            {showNotif && (
              <div className="absolute right-0 mt-2 w-72 max-w-[88vw] bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50">
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                  <span className="text-xs font-extrabold text-slate-800">Notifications ({notifications.length})</span>
                  <button onClick={() => setShowNotif(false)} className="text-xs text-slate-400 font-bold">✕</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2 bg-slate-50 rounded-xl text-xs border border-slate-100">
                        <p className="font-bold text-slate-800">{n.title || "Alert"}</p>
                        <p className="text-slate-600 text-[11px]">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/40 z-40" />
          <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 p-4 shadow-2xl overflow-y-auto space-y-1">
            <div className="flex justify-between items-center pb-3 mb-2 border-b">
              <span className="font-extrabold text-blue-700 text-sm">Provider Menu</span>
              <button onClick={() => setMenuOpen(false)} className="p-1 text-slate-500 font-bold">✕</button>
            </div>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${pathname === item.href ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full mt-4 text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50">
              🚪 Logout
            </button>
          </aside>
        </>
      )}

      <main className="p-3 md:p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
