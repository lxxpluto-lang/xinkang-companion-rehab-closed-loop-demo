import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, KeyRound, LockKeyhole, ShieldCheck, Stethoscope, UserRoundCog } from "lucide-react";
import { roleMeta } from "../accessControl";
import type { Role } from "../types";

type StaffRole = Exclude<Role, "PATIENT">;

const demoAccounts: Array<{
  username: string;
  name: string;
  role: StaffRole;
  icon: typeof Stethoscope;
  scope: string;
  permissions: string[];
}> = [
  { username: "admin", name: "林管理员", role: "ADMIN", icon: ShieldCheck, scope: "全部数据", permissions: ["验证版全部菜单", "组织权限配置", "报告打印签名", "视频发布与永久删除"] },
  { username: "doctor.wang", name: "王医生", role: "DOCTOR", icon: Stethoscope, scope: "医疗团队", permissions: ["团队患者共享查看", "本人处方任务", "临床复核与签署", "训练大屏只读"] },
  { username: "rehab.zhou", name: "周康复师", role: "REHAB_EXECUTION", icon: UserRoundCog, scope: "当前康复中心", permissions: ["训练执行与现场记录", "基础与执行字段编辑", "报告结果查看", "视频草稿维护"] }
];

export function StaffLogin({
  onLogin,
  onBack
}: {
  onLogin: (role: StaffRole) => void;
  onBack: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<StaffRole>("DOCTOR");
  const [username, setUsername] = useState("doctor.wang");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const selected = demoAccounts.find((account) => account.role === selectedRole) ?? demoAccounts[1];

  function chooseAccount(role: StaffRole) {
    const account = demoAccounts.find((item) => item.role === role)!;
    setSelectedRole(role);
    setUsername(account.username);
    setPassword("123456");
    setError("");
  }

  function login() {
    const account = demoAccounts.find((item) => item.username === username && item.role === selectedRole);
    if (!account || password !== "123456") {
      setError("账号或密码不匹配。演示密码统一为 123456。");
      return;
    }
    onLogin(account.role);
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] p-6" data-testid="page-VIEW-STAFF-LOGIN">
      <div className="pointer-events-none fixed -left-32 -top-32 h-[460px] w-[460px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-cyan-100/60 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-48px)] max-w-[1180px] items-center">
        <div className="grid w-full overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(44,76,120,0.14)] lg:grid-cols-[0.92fr_1.08fr]">
          <section className="relative overflow-hidden bg-gradient-to-br from-[#174b75] via-[#276e9d] to-[#3b86b3] p-10 text-white">
            <span className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-white/[0.07]" />
            <button type="button" onClick={onBack} className="relative flex items-center gap-2 text-xs font-bold text-blue-100 hover:text-white"><ArrowLeft className="h-4 w-4" />返回系统入口</button>
            <div className="relative mt-14 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20"><HeartPulse className="h-6 w-6" /></span>
              <div><h1 className="text-xl font-bold">心康伴侣</h1><p className="mt-1 text-xs text-blue-100">医护 Web 身份认证</p></div>
            </div>
            <h2 className="relative mt-10 text-3xl font-bold leading-tight">一个入口，按岗位进入<br />各自的工作边界。</h2>
            <p className="relative mt-4 max-w-md text-sm leading-7 text-blue-100">登录后依据账号加载菜单、操作、数据与字段权限。隐藏菜单不等于授权，正式系统仍由服务端完成最终校验。</p>
            <div className="relative mt-10 space-y-3">
              {["角色与权限模板预设", "康复中心和医疗团队数据隔离", "签署、授权、删除全程审计"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-cyan-200" />{item}</div>)}
            </div>
          </section>

          <section className="p-10">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">STAFF SIGN IN</p><h2 className="mt-2 text-2xl font-bold text-slate-900">登录医护工作站</h2><p className="mt-2 text-xs text-slate-500">选择预设演示岗位，查看对应权限效果。</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">脱敏 Demo</span></div>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                const active = selectedRole === account.role;
                return <button type="button" key={account.role} onClick={() => chooseAccount(account.role)} className={`rounded-xl border p-3 text-left ${active ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200"}`}><Icon className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-400"}`} /><p className="mt-3 text-xs font-bold text-slate-800">{roleMeta[account.role].label}</p><p className="mt-1 text-[9px] text-slate-400">{account.scope}</p></button>;
              })}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <label className="col-span-2"><span className="field-label">账号</span><div className="relative"><UserRoundCog className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={username} onChange={(event) => setUsername(event.target.value)} className="text-field pl-10" /></div></label>
              <label className="col-span-2"><span className="field-label">密码</span><div className="relative"><KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} className="text-field pl-10" /></div></label>
            </div>
            {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-blue-800"><LockKeyhole className="h-4 w-4" />{selected.name} · 权限预览</span><span className="text-[9px] font-bold text-blue-600">{selected.scope}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">{selected.permissions.map((item) => <span key={item} className="rounded-lg bg-white px-3 py-2 text-[10px] text-slate-600 ring-1 ring-blue-100">{item}</span>)}</div>
            </div>
            <button type="button" onClick={login} className="btn-primary mt-6 w-full py-3.5 text-sm">以{roleMeta[selectedRole].label}身份登录<ArrowRight className="h-4 w-4" /></button>
            <p className="mt-3 text-center text-[10px] text-slate-400">演示账号密码统一为 123456 · 不连接真实身份认证服务</p>
          </section>
        </div>
      </div>
    </main>
  );
}
