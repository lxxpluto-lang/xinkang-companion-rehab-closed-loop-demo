import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Check,
  Clock3,
  Database,
  FileSignature,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  UserCog,
  UsersRound
} from "lucide-react";
import { roleActions, roleMeta } from "../accessControl";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { DoctorPageKey, PermissionAction, Role } from "../types";

type AdminConsolePageKey = Exclude<DoctorPageKey, "dashboard" | "patients" | "followups" | "report" | "prescriptions" | "training" | "videoConfig">;
type OrgPermissionSheet = "organization" | "permissions" | "sync";

const identityAccounts = [
  { account: "wang.doctor", name: "王医生", source: "AD/工单", group: "康复医生组", orgCode: "QD-CRH", orgName: "青岛市心脏康复中心", status: "已同步", lastSync: "2026-08-04 20:00" },
  { account: "zhou.rehab", name: "周康复师", source: "AD/工单", group: "康复执行组", orgCode: "QD-CRH", orgName: "青岛市心脏康复中心", status: "待重试", lastSync: "2026-08-04 20:01" },
  { account: "liu.nurse", name: "刘护士", source: "AD/工单", group: "康复执行组", orgCode: "QD-CRH", orgName: "青岛市心脏康复中心", status: "已同步", lastSync: "2026-08-04 20:00" },
  { account: "chen.admin", name: "陈管理员", source: "平台创建", group: "系统管理员组", orgCode: "QD-CRH", orgName: "青岛市心脏康复中心", status: "已同步", lastSync: "2026-08-04 20:00" }
];

const permissionGroups = [
  { code: "GRP-CRH-DOCTOR", name: "康复医生组", members: 2, reports: "处方管理、阶段报告", datasets: "患者临床数据、训练数据", orgScope: "本中心及下属", status: "已同步" },
  { code: "GRP-CRH-OPS", name: "康复执行组", members: 2, reports: "训练工作台、单次报告", datasets: "训练数据、设备数据", orgScope: "当前康复中心", status: "已同步" },
  { code: "GRP-CRH-ADMIN", name: "系统管理员组", members: 1, reports: "全部验证版页面", datasets: "全部验证数据", orgScope: "项目范围内", status: "已同步" }
];

const reportMappings = [
  { report: "阶段性报告", reportCode: "RPT-STAGE", group: "康复医生组", datasets: "患者临床数据 + 训练数据", action: "查看/导出", orgScope: "单位及下属", filter: "org_code" },
  { report: "训练工作台", reportCode: "RPT-TRAINING", group: "康复执行组", datasets: "训练数据 + 设备数据", action: "查看", orgScope: "当前中心", filter: "center_code" },
  { report: "单次训练报告", reportCode: "RPT-SINGLE", group: "康复医生组", datasets: "训练数据", action: "查看", orgScope: "本人团队", filter: "doctor_id" },
  { report: "患者档案", reportCode: "RPT-PATIENT", group: "系统管理员组", datasets: "患者主数据", action: "查看/维护", orgScope: "项目范围内", filter: "org_code" }
];

const actionLabels: Record<PermissionAction, string> = {
  VIEW: "查看",
  CREATE: "新建",
  EDIT: "编辑",
  REVIEW: "复核",
  SIGN: "签署",
  PUBLISH: "发布",
  UNPUBLISH: "下架",
  DELETE: "删除",
  RESTORE: "恢复",
  PERMANENT_DELETE: "永久删除",
  PRINT: "打印",
  EXPORT: "导出",
  GRANT: "授权"
};

const documentRows = [
  { name: "运动处方打印模板", detail: "A4 医疗文书版 · V2.1", status: "已生效", owner: "医务科" },
  { name: "单次报告模板", detail: "指标、趋势、异常、结论", status: "已生效", owner: "康复医学科" },
  { name: "阶段报告模板", detail: "四版本处方演变", status: "已生效", owner: "康复医学科" },
  { name: "王医生数字签名", detail: "证书有效至 2027-07-01", status: "有效", owner: "王医生" },
  { name: "签署二次确认规则", detail: "高风险处方签署需本人确认", status: "有效", owner: "医务科" }
];

export function AdminConsolePage({ page }: { page: AdminConsolePageKey }) {
  if (page === "orgPermissions") return <OrgPermissionsPage />;
  return <DocumentConfigPage />;
}

function OrgPermissionsPage() {
  const [activeSheet, setActiveSheet] = useState<OrgPermissionSheet>("organization");
  return (
    <section data-testid="page-VIEW-ORG-PERMISSIONS">
      <PageHeader
        eyebrow="3个月验证版 · 后台管理"
        title="组织权限"
        description="小型临床验证只保留账号、岗位、角色权限和数据范围配置，不展开完整院级后台治理。"
        action={<StatusBadge tone="blue"><LockKeyhole className="h-3.5 w-3.5" />管理员配置</StatusBadge>}
      />
      <div className="mb-5 inline-grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">
        <button type="button" onClick={() => setActiveSheet("organization")} className={`rounded-lg px-5 py-2 text-xs font-bold ${activeSheet === "organization" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>组织账号</button>
        <button type="button" onClick={() => setActiveSheet("permissions")} className={`rounded-lg px-5 py-2 text-xs font-bold ${activeSheet === "permissions" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>权限配置</button>
        <button type="button" onClick={() => setActiveSheet("sync")} className={`rounded-lg px-5 py-2 text-xs font-bold ${activeSheet === "sync" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>同步任务</button>
      </div>
      {activeSheet === "organization" ? <OrganizationSheet /> : activeSheet === "permissions" ? <PermissionSheet /> : <SyncSheet />}
    </section>
  );
}

function OrganizationSheet() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ "王医生": true, "周康复师": true, "刘护士": true, "赵医生": false });
  const [syncMessage, setSyncMessage] = useState("");
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><RefreshCw className="h-5 w-5 text-blue-600" /><div><b className="text-sm text-slate-900">AD/工单账号同步</b><p className="mt-1 text-[11px] text-slate-500">项目范围 QD-CRH · 每日 20:00 定时同步 · 增量比对，不重建未变化成员</p></div></div>
          <button type="button" onClick={() => setSyncMessage("手动同步已提交，正在比对用户与用户组变更")} className="btn-primary whitespace-nowrap"><RefreshCw className="h-4 w-4" />手动同步</button>
        </div>
        {syncMessage && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700">{syncMessage}</p>}
      </section>
      <div className="grid grid-cols-[0.82fr_1.18fr] gap-5">
      <section className="card p-5">
        <SectionHeader title="组织边界" description="组织编码用于报表行级过滤；下属节点默认继承上级数据范围。" action={<button className="btn-secondary"><Plus className="h-4 w-4" />新增账号</button>} />
        <div className="space-y-3">
          {[
            ["青岛市心脏康复中心", "ORG-QD", "单位", "下属节点 2 个"],
            ["市南院区", "QD-SN", "院区", "继承单位范围"],
            ["心脏康复科", "QD-SN-CRH", "科室", "医生与执行岗共用"],
            ["院内Ⅱ期康复中心", "QD-CRH", "验证中心", "当前 Demo 数据边界"]
          ].map(([name, code, type, detail], index) => (
            <div key={name} className={`flex items-center gap-3 rounded-xl border p-3 ${index === 3 ? "border-blue-200 bg-blue-50" : "border-slate-100"}`}>
              <Building2 className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <b className="text-slate-800">{name}</b>
                <p className="mt-1 text-[9px] text-slate-400">{type} · {code}</p>
              </div>
              <span className="text-[10px] text-slate-500">{detail}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="p-5">
          <SectionHeader title="账号与用户组" description="账号来源、组织编码、用户组和同步状态必须可追溯。" />
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] text-slate-400">
            <tr>{["账号/姓名", "来源", "用户组", "组织编码", "同步状态", "最近同步"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody>
            {identityAccounts.map((account) => (
              <tr className="border-t border-slate-100" key={account.account}>
                <td className="px-4 py-3"><b className="text-slate-800">{account.name}</b><p className="mt-1 text-[10px] text-slate-400">{account.account}</p></td>
                <td className="px-4 py-3 text-slate-500">{account.source}</td>
                <td className="px-4 py-3 text-slate-600">{account.group}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{account.orgCode}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2"><StatusBadge tone={account.status === "待重试" ? "orange" : "green"}>{account.status}</StatusBadge><button type="button" aria-label={`${account.name}账号启停`} onClick={() => setEnabled((state) => ({ ...state, [account.name]: !state[account.name] }))} className={`relative h-5 w-9 rounded-full ${enabled[account.name] ?? true ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabled[account.name] ?? true ? "left-4" : "left-0.5"}`} /></button></div>
                </td>
                <td className="px-4 py-3 text-[10px] text-slate-400">{account.lastSync}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      </div>
      <section className="grid grid-cols-3 gap-4">
        {permissionGroups.map((group) => <div className="card p-4" key={group.code}><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><UsersRound className="h-4 w-4" /></span><StatusBadge tone="green">{group.status}</StatusBadge></div><h3 className="mt-3 font-bold text-slate-900">{group.name}</h3><p className="mt-1 font-mono text-[10px] text-slate-400">{group.code}</p><div className="mt-3 space-y-1 text-[11px] text-slate-500"><p>成员 {group.members} 人 · 数据范围 {group.orgScope}</p><p>报表：{group.reports}</p><p>数据集：{group.datasets}</p></div></div>)}
      </section>
    </div>
  );
}

function PermissionSheet() {
  const [selectedRole, setSelectedRole] = useState<Exclude<Role, "PATIENT">>("DOCTOR");
  const [actions, setActions] = useState<Record<Exclude<Role, "PATIENT">, PermissionAction[]>>({
    ADMIN: [...roleActions.ADMIN],
    DOCTOR: [...roleActions.DOCTOR],
    REHAB_EXECUTION: [...roleActions.REHAB_EXECUTION]
  });
  const [saved, setSaved] = useState(false);
  const allActions = Object.keys(actionLabels) as PermissionAction[];
  function toggle(action: PermissionAction) {
    if (selectedRole === "ADMIN") return;
    setSaved(false);
    setActions((state) => ({ ...state, [selectedRole]: state[selectedRole].includes(action) ? state[selectedRole].filter((item) => item !== action) : [...state[selectedRole], action] }));
  }
  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-4">
        {(["ADMIN", "DOCTOR", "REHAB_EXECUTION"] as const).map((role) => (
          <button key={role} type="button" onClick={() => { setSelectedRole(role); setSaved(false); }} className={`card p-4 text-left ${selectedRole === role ? "border-blue-300 ring-2 ring-blue-100" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserCog className="h-4 w-4" /></span>
              <StatusBadge tone={role === "ADMIN" ? "red" : "blue"}>{roleMeta[role].scope}</StatusBadge>
            </div>
            <h3 className="mt-3 font-bold text-slate-900">{roleMeta[role].label}</h3>
            <p className="mt-1 text-[10px] text-slate-400">{roleMeta[role].note}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-5">
        <section className="card p-5">
          <SectionHeader title={`${roleMeta[selectedRole].label} · 操作权限`} description={selectedRole === "ADMIN" ? "管理员全权模板不可在演示环境内关闭。" : "验证版只演示核心动作授权。"} />
          <div className="grid grid-cols-4 gap-3">
            {allActions.map((action) => {
              const active = actions[selectedRole].includes(action);
              return (
                <button type="button" onClick={() => toggle(action)} key={action} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-400"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${active ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{active && <Check className="h-3.5 w-3.5" />}</span>
                  <span className="font-bold">{actionLabels[action]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-bold text-emerald-600">权限模板已保存</span>}
            <button type="button" onClick={() => setSaved(true)} className="btn-primary"><Save className="h-4 w-4" />保存权限模板</button>
          </div>
        </section>
        <section className="card p-5">
          <SectionHeader title="验证版权限口径" />
          <div className="space-y-3">
            {[
              ["菜单范围", selectedRole === "ADMIN" ? "核心业务 + 4 个后台菜单" : "核心业务 + 授权后台菜单"],
              ["数据范围", roleMeta[selectedRole].scope === "ALL" ? "全部验证数据" : roleMeta[selectedRole].scope === "TEAM" ? "医疗团队" : "当前康复中心"],
              ["患者档案", selectedRole === "DOCTOR" ? "团队患者共享查看；本人主管患者可建档和维护" : selectedRole === "ADMIN" ? "全部患者只读查看" : "中心患者基础资料与训练记录可维护"],
              ["随访管理", selectedRole === "DOCTOR" ? "仅本人患者可沟通、改期和完成" : selectedRole === "ADMIN" ? "全院随访只读查看" : "无随访管理入口"],
              ["视频资源", selectedRole === "ADMIN" ? "发布、下架、删除" : "草稿、编辑、提交发布"],
              ["签署动作", selectedRole === "DOCTOR" || selectedRole === "ADMIN" ? "可签署本人任务" : "不可签署"]
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-3" key={label}>
                <p className="text-[9px] text-slate-400">{label}</p>
                <p className="mt-1.5 font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card mt-5 overflow-hidden">
        <div className="p-5"><SectionHeader title="报表与数据集授权映射" description="菜单权限不等于数据集权限；报表、数据集和组织行级过滤需要分别配置。" /></div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] text-slate-400"><tr>{["报表", "编码", "用户组", "数据集", "操作", "组织范围", "行级过滤字段"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
          <tbody>{reportMappings.map((mapping) => <tr className="border-t border-slate-100" key={mapping.reportCode}><td className="px-4 py-3 font-bold text-slate-800"><span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" />{mapping.report}</span></td><td className="px-4 py-3 font-mono text-[10px] text-slate-400">{mapping.reportCode}</td><td className="px-4 py-3 text-slate-600">{mapping.group}</td><td className="px-4 py-3 text-slate-500">{mapping.datasets}</td><td className="px-4 py-3 text-slate-600">{mapping.action}</td><td className="px-4 py-3 text-slate-600">{mapping.orgScope}</td><td className="px-4 py-3 font-mono text-[10px] text-violet-600">{mapping.filter}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

function SyncSheet() {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-5">
      <section className="card p-5">
        <SectionHeader title="同步策略" description="账号和用户组采用增量差异同步，未变化成员不处理；移除成员只解除用户组关系，不物理删除平台账号。" action={<StatusBadge tone="blue"><Clock3 className="h-3.5 w-3.5" />每日 20:00</StatusBadge>} />
        <div className="mt-4 grid grid-cols-3 gap-3">{[["定时同步", "每日 20:00 自动执行"], ["手动同步", "管理员按需触发"], ["工单完成后同步", "账号审批完成后触发"]].map(([title, detail]) => <div className="rounded-xl border border-slate-100 bg-slate-50 p-3" key={title}><b className="text-xs text-slate-800">{title}</b><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div>)}</div>
      </section>
      <section className="grid grid-cols-[1fr_0.7fr] gap-5">
        <section className="card overflow-hidden"><div className="p-5"><SectionHeader title="最近一次同步任务" description="SYNC-20260804-2000 · 公共报表环境" action={<StatusBadge tone="orange"><AlertTriangle className="h-3.5 w-3.5" />部分成功</StatusBadge>} /></div><div className="grid grid-cols-3 gap-3 px-5 pb-5">{[["用户", "12"], ["用户组", "4"], ["新增/移除", "2 / 1"], ["未变化", "9"], ["失败", "1"], ["耗时", "18 秒"]].map(([label, value]) => <div className="rounded-xl border border-slate-100 p-3" key={label}><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>)}</div><div className="border-t border-slate-100 bg-amber-50 p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" /><div><b className="text-xs text-amber-900">失败项：zhou.rehab</b><p className="mt-1 text-[11px] text-amber-800">目标平台用户不存在 · 已保留原账号和用户组关系 · 可单独重试</p></div></div></div></section>
        <section className="card p-5"><SectionHeader title="任务操作" description="失败同步不能静默结束，必须保留结果并允许重试。" /><div className="mt-4 space-y-3"><button type="button" onClick={() => setMessage("失败项已重新提交，等待目标平台返回结果")} className="btn-primary w-full justify-center"><RotateCcw className="h-4 w-4" />立即重试失败项</button><button type="button" onClick={() => setMessage("已打开同步日志：包含操作者、时间、变更前后成员和失败原因")} className="btn-secondary w-full justify-center"><Database className="h-4 w-4" />查看同步日志</button>{message && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{message}</p>}</div></section>
      </section>
    </div>
  );
}

function DocumentConfigPage() {
  return (
    <section data-testid="page-VIEW-DOCUMENTCONFIG">
      <PageHeader
        eyebrow="3个月验证版 · 文书闭环"
        title="报告打印签名"
        description="保留处方打印、报告模板和数字签名，支撑医生复核、签署和线下沟通。"
        action={<StatusBadge tone="blue"><ShieldCheck className="h-3.5 w-3.5" />核心文书</StatusBadge>}
      />
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <SectionHeader title="模板与签名配置" description="验证期只维护报告、处方和医生签名相关配置。" />
          <button className="btn-primary"><Plus className="h-4 w-4" />新增配置</button>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400">
            <tr>{["配置名称", "内容摘要", "责任方", "当前状态", "操作"].map((item) => <th className="px-5 py-3" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody>
            {documentRows.map((row) => (
              <tr className="border-t border-slate-100" key={row.name}>
                <td className="px-5 py-4"><span className="flex items-center gap-2 font-bold text-slate-800"><FileSignature className="h-4 w-4 text-blue-600" />{row.name}</span></td>
                <td className="px-5 py-4 text-slate-500">{row.detail}</td>
                <td className="px-5 py-4 text-slate-500">{row.owner}</td>
                <td className="px-5 py-4"><StatusBadge tone={row.status.includes("待") ? "orange" : "green"}>{row.status}</StatusBadge></td>
                <td className="px-5 py-4"><button className="text-xs font-bold text-blue-700">配置</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
