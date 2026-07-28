import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileCheck2,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MonitorUp,
  ShieldCheck,
  Stethoscope,
  Video,
  UsersRound
} from "lucide-react";
import type { DoctorPageKey } from "../types";

const navItems: { key: DoctorPageKey; label: string; icon: typeof Activity; group: "clinical" | "nurse" | "quality" }[] = [
  { key: "dashboard", label: "今日工作台", icon: LayoutDashboard, group: "clinical" },
  { key: "prescriptions", label: "处方管理", icon: ClipboardList, group: "clinical" },
  { key: "report", label: "报告中心", icon: FileCheck2, group: "clinical" },
  { key: "patients", label: "患者管理", icon: UsersRound, group: "clinical" },
  { key: "abnormal", label: "异常复核", icon: AlertTriangle, group: "clinical" },
  { key: "nurse", label: "院内护士站", icon: MonitorUp, group: "nurse" },
  { key: "videos", label: "训练视频库", icon: Video, group: "quality" },
  { key: "operations", label: "数据管理", icon: BarChart3, group: "quality" }
];

export function DoctorLayout({
  page,
  onNavigate,
  onExit,
  children
}: {
  page: DoctorPageKey;
  onNavigate: (page: DoctorPageKey) => void;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="doctor-shell min-h-screen text-[13px]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[198px] flex-col border-r border-[#e7ebf2] bg-white text-slate-700 shadow-[8px_0_30px_rgba(59,87,130,0.04)]">
        <div className="border-b border-slate-100 px-4 py-4">
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
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="主导航">
          <p className="mb-2 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">临床工作</p>
          {navItems.filter((item) => item.group === "clinical").map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button
                key={item.key}
                type="button"
                data-action={`ACT-NAV-${item.key.toUpperCase()}`}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left text-[12px] font-medium ${
                  active
                    ? "bg-[#edf4ff] text-[#3476f6]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-[16px] w-[16px] ${active ? "text-[#3476f6]" : "text-slate-400"}`} />
                {item.label}
                {item.key === "abnormal" && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    2
                  </span>
                )}
              </button>
            );
          })}
          <p className="mb-2 mt-5 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">护士工作区</p>
          {navItems.filter((item) => item.group === "nurse").map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button key={item.key} type="button" onClick={() => onNavigate(item.key)} className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left text-[12px] font-medium ${active ? "bg-[#edf4ff] text-[#3476f6]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Icon className={`h-[16px] w-[16px] ${active ? "text-[#3476f6]" : "text-slate-400"}`} />
                {item.label}
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">2</span>
              </button>
            );
          })}
          <p className="mb-2 mt-5 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">质量与管理</p>
          {navItems.filter((item) => item.group === "quality").map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left text-[12px] font-medium ${
                  active ? "bg-[#edf4ff] text-[#3476f6]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-[16px] w-[16px] ${active ? "text-[#3476f6]" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="m-3 rounded-[10px] border border-[#dbe8ff] bg-[#f5f8ff] p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#3f71d8]">
            <ShieldCheck className="h-3.5 w-3.5" />
            安全边界
          </div>
          <p className="mt-1.5 text-[9px] leading-4 text-slate-500">
            AI 不自动诊断、不发布处方、不控制设备。所有高风险结论由医生确认。
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-2.5 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 hover:border-[#b9d1ff] hover:text-[#3476f6]"
            data-action="ACT-DOCTOR-EXIT"
          >
            返回双系统入口
          </button>
        </div>
      </aside>

      <div className="ml-[198px] min-h-screen">
        <header className="sticky top-0 z-10 border-b border-[#e8edf4] bg-white/90 backdrop-blur-xl">
          <div className="flex h-[56px] items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Menu className="h-4 w-4 text-slate-400" />
              <span className="text-[10px] text-slate-400">心康伴侣　/　</span>
              <span className="text-[12px] font-semibold text-slate-700">{navItems.find((item) => item.key === page)?.label}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="text-right">
                <p className="font-semibold text-slate-700">
                  {clock.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" })}
                </p>
                <p className="text-[9px] tabular-nums text-slate-400">{clock.toLocaleTimeString("zh-CN", { hour12: false })}</p>
              </div>
              <span className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-[#3476f6] ring-1 ring-[#dbe8ff]">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] text-slate-400">当前工作区</p>
                  <p className="text-[11px] font-semibold text-slate-700">{page === "nurse" ? "院内护士站 · 演示账号" : "康复医生 · 演示账号"}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-[#edf1f6] bg-[#f8faff] px-6 py-1.5 text-center text-[9px] font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Demo 环境 · 模拟/脱敏数据 · AI 输出仅供医生审核参考
          </div>
        </header>
        <main className="doctor-main mx-auto max-w-[1540px] p-5">{children}</main>
        <footer className="px-6 pb-5 text-center text-[9px] text-slate-400">
          医护 Web 端 · 医生处方决策与护士院内训练工作区
        </footer>
      </div>
    </div>
  );
}
