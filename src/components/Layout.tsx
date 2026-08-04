import { useEffect, useMemo, useState } from "react";
import { ChevronDown, HeartPulse, LockKeyhole, LogOut, Menu, ShieldCheck, UserRoundCog } from "lucide-react";
import { navItems, roleMeta } from "../accessControl";
import type { DoctorPageKey, Role } from "../types";

export function DoctorLayout({
  page,
  role,
  onRoleChange,
  onNavigate,
  onExit,
  children
}: {
  page: DoctorPageKey;
  role: Exclude<Role, "PATIENT">;
  onRoleChange: (role: Exclude<Role, "PATIENT">) => void;
  onNavigate: (page: DoctorPageKey) => void;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const [clock, setClock] = useState(new Date());
  const allowedItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const visibleItems = useMemo(() => allowedItems.filter((item) => !item.hidden), [allowedItems]);
  const currentItem = allowedItems.find((item) => item.key === page) ?? allowedItems[0];

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="doctor-shell min-h-screen text-[13px]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[180px] flex-col border-r border-[#e7ebf2] bg-white text-slate-700 shadow-[8px_0_30px_rgba(59,87,130,0.04)]">
        <div className="border-b border-slate-100 px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#3f7cff] text-white shadow-[0_7px_18px_rgba(63,124,255,0.25)]">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-wide text-slate-900">心康伴侣</p>
              <p className="mt-0.5 text-[9px] text-slate-400">医护 Web 工作站</p>
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="主导航">
          <NavGroup
            title="业务工作"
            items={visibleItems.filter((item) => item.group === "business")}
            page={page}
            onNavigate={onNavigate}
          />
          {visibleItems.some((item) => item.group === "admin") && (
            <NavGroup
              title="后台管理"
              items={visibleItems.filter((item) => item.group === "admin")}
              page={page}
              onNavigate={onNavigate}
            />
          )}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="rounded-[10px] border border-[#dbe8ff] bg-[#f5f8ff] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#3f71d8]">
              <ShieldCheck className="h-3.5 w-3.5" />
              当前数据范围
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-slate-500">{roleMeta[role].note}</p>
          </div>
          <button type="button" onClick={onExit} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[10px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <LogOut className="h-3.5 w-3.5" />退出演示工作站
          </button>
        </div>
      </aside>

      <div className="ml-[180px] min-h-screen">
        <header className="sticky top-0 z-10 border-b border-[#e8edf4] bg-white/92 backdrop-blur-xl">
          <div className="flex h-[58px] items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Menu className="h-4 w-4 text-slate-400" />
              <span className="text-[10px] text-slate-400">心康伴侣　/　{currentItem?.group === "admin" ? "后台管理" : "业务工作"}　/　</span>
              <span className="text-[12px] font-semibold text-slate-700">{currentItem?.label}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="text-right">
                <p className="font-semibold text-slate-700">{clock.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" })}</p>
                <p className="text-[9px] tabular-nums text-slate-400">{clock.toLocaleTimeString("zh-CN", { hour12: false })}</p>
              </div>
              <span className="h-8 w-px bg-slate-200" />
              <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <UserRoundCog className="h-4 w-4 text-blue-600" />
                <span>
                  <span className="block text-[9px] text-slate-400">{roleMeta[role].account}</span>
                  <span className="block text-[10px] font-bold text-slate-700">{roleMeta[role].label}</span>
                </span>
                <select
                  aria-label="切换演示角色"
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value as Exclude<Role, "PATIENT">)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="ADMIN">系统管理员</option>
                  <option value="DOCTOR">康复医生</option>
                  <option value="REHAB_EXECUTION">康复执行岗</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-[#edf1f6] bg-[#f8faff] px-6 py-1.5 text-center text-[9px] font-medium text-slate-500">
            <LockKeyhole className="h-3 w-3 text-amber-500" />
            Demo 权限原型 · 菜单、操作、数据及字段权限同步演示 · 高风险操作需二次确认
          </div>
        </header>
        <main className="doctor-main mx-auto max-w-[1540px] p-5">{children}</main>
        <footer className="px-6 pb-5 text-center text-[9px] text-slate-400">医护 Web 端 · 角色权限与操作审计演示</footer>
      </div>
    </div>
  );
}

function NavGroup({
  title,
  items,
  page,
  onNavigate
}: {
  title: string;
  items: typeof navItems;
  page: DoctorPageKey;
  onNavigate: (page: DoctorPageKey) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 mt-1 flex items-center gap-2 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
        {title === "后台管理" && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[8px] text-violet-600">管理</span>}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.key === page || (page === "assessment" && item.key === "patients");
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left text-[11px] font-medium ${
                active ? "bg-[#edf4ff] text-[#3476f6]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-[15px] w-[15px] ${active ? "text-[#3476f6]" : "text-slate-400"}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{item.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
