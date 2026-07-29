import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSignature,
  KeyRound,
  LockKeyhole,
  Network,
  Plus,
  Router,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UsersRound,
  Video
} from "lucide-react";
import { roleActions, roleMeta } from "../accessControl";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { TrainingVideo } from "./VideoLibraryPage";
import type { DoctorPageKey, PermissionAction, Role } from "../types";

type AdminConsolePageKey = Exclude<DoctorPageKey, "dashboard" | "patients" | "report" | "prescriptions" | "training" | "videoConfig">;

const adminTitles: Record<AdminConsolePageKey, { title: string; eyebrow: string; description: string }> = {
  adminOverview: { title: "管理概览", eyebrow: "后台管理", description: "聚合账号、权限、内容、设备和高风险操作，业务训练细节仍留在对应工作台。" },
  organization: { title: "组织与账号", eyebrow: "身份与组织", description: "维护机构、康复中心、科室、账号和医疗团队，决定数据范围的组织边界。" },
  permissions: { title: "权限中心", eyebrow: "RBAC + 数据与字段范围", description: "权限由菜单、操作、数据范围和字段范围共同决定，前端展示与服务端校验使用同一权限编码。" },
  businessConfig: { title: "业务配置", eyebrow: "临床规则字典", description: "维护运动项目、处方参数、危险分组、随访和异常分级等受控业务规则。" },
  trainingConfig: { title: "训练与设备", eyebrow: "设备与安全规则", description: "维护设备、工位、数据采集、告警阈值以及训练阶段语音和声音提醒。" },
  documentConfig: { title: "报告、打印与签名", eyebrow: "文书与签署", description: "统一管理报告模板、处方打印、数字签名授权和签署记录。" },
  notifications: { title: "消息与通知", eyebrow: "待办触达", description: "配置处方、异常、训练和随访提醒及消息模板。" },
  audit: { title: "数据与审计", eyebrow: "全过程可追溯", description: "查询登录、资料变更、处方签名、视频、权限和导出操作记录。" },
  integrations: { title: "系统与接口", eyebrow: "平台连接", description: "管理身份认证、设备、第三方服务、文件存储和系统运行状态。" }
};

const configData: Partial<Record<DoctorPageKey, Array<{ name: string; detail: string; status: string; owner: string }>>> = {
  businessConfig: [
    { name: "有氧运动项目字典", detail: "功率车、椭圆机 · 2 项启用", status: "已生效", owner: "康复医学科" },
    { name: "处方参数安全范围", detail: "心率、功率、时长、RPE", status: "待复核", owner: "王医生" },
    { name: "危险分组规则", detail: "低危、中危、高危", status: "已生效", owner: "医疗质量组" },
    { name: "阶段随访规则", detail: "处方完成、出院、训练中断", status: "已生效", owner: "康复中心" },
    { name: "异常事件分级", detail: "提示、关注、紧急", status: "已生效", owner: "医疗质量组" }
  ],
  trainingConfig: [
    { name: "功率车设备", detail: "8 台 · 7 台在线", status: "运行中", owner: "设备管理员" },
    { name: "背包采集设备", detail: "12 套 · 11 套在线", status: "运行中", owner: "设备管理员" },
    { name: "心率告警阈值", detail: "按处方靶区动态计算", status: "已生效", owner: "王医生" },
    { name: "阶段语音播报", detail: "热身、训练、放松、完成", status: "已启用", owner: "康复中心" },
    { name: "紧急声音提醒", detail: "异常等级 ≥ 紧急", status: "已启用", owner: "医疗质量组" }
  ],
  documentConfig: [
    { name: "运动处方打印模板", detail: "A4 医疗文书版 · V2.1", status: "已生效", owner: "医务科" },
    { name: "单次报告模板", detail: "指标、趋势、异常、结论", status: "已生效", owner: "康复医学科" },
    { name: "阶段报告模板", detail: "四版本处方演变", status: "已生效", owner: "康复医学科" },
    { name: "王医生数字签名", detail: "证书有效至 2027-07-01", status: "有效", owner: "王医生" },
    { name: "管理员临床签署授权", detail: "高风险操作需二次确认", status: "有效", owner: "林管理员" }
  ],
  notifications: [
    { name: "待复核处方提醒", detail: "生成后即时 + 2 小时催办", status: "已启用", owner: "处方管理" },
    { name: "训练异常提醒", detail: "站内通知 + 声音告警", status: "已启用", owner: "训练中心" },
    { name: "复诊与阶段提醒", detail: "处方完成后 24 小时内", status: "已启用", owner: "康复中心" },
    { name: "权限变更提醒", detail: "即时通知账号本人", status: "已启用", owner: "系统管理" }
  ],
  integrations: [
    { name: "统一身份认证", detail: "OIDC · Demo 模拟", status: "正常", owner: "信息科" },
    { name: "功率车适配器", detail: "Web Bluetooth / 网关", status: "正常", owner: "设备组" },
    { name: "HIS / EMR", detail: "患者建档与诊断同步", status: "待接入", owner: "信息科" },
    { name: "对象存储", detail: "训练视频与报告附件", status: "正常", owner: "信息科" },
    { name: "审计归档服务", detail: "保留期 10 年", status: "正常", owner: "信息科" }
  ]
};

const actionLabels: Record<PermissionAction, string> = {
  VIEW: "查看", CREATE: "新建", EDIT: "编辑", REVIEW: "复核", SIGN: "签署", PUBLISH: "发布", UNPUBLISH: "下架", DELETE: "删除", RESTORE: "恢复", PERMANENT_DELETE: "永久删除", PRINT: "打印", EXPORT: "导出", GRANT: "授权"
};

export function AdminConsolePage({
  page,
  videos
}: {
  page: AdminConsolePageKey;
  videos: TrainingVideo[];
}) {
  const title = adminTitles[page];
  return (
    <section data-testid={`page-VIEW-${page.toUpperCase()}`}>
      <PageHeader eyebrow={title.eyebrow} title={title.title} description={title.description} action={<StatusBadge tone="blue"><LockKeyhole className="h-3.5 w-3.5" />管理员配置</StatusBadge>} />
      {page === "adminOverview" && <AdminOverview videos={videos} />}
      {page === "organization" && <OrganizationPage />}
      {page === "permissions" && <PermissionCenter />}
      {page === "audit" && <AuditPage />}
      {configData[page] && <ConfigTable page={page} rows={configData[page] || []} />}
    </section>
  );
}

function AdminOverview({ videos }: { videos: TrainingVideo[] }) {
  return <>
    <div className="mb-5 grid grid-cols-5 gap-4">
      <StatCard label="启用账号" value="36" note="医生 8 · 执行岗 24 · 管理员 4" icon={<UsersRound className="h-5 w-5" />} />
      <StatCard label="角色模板" value="4" note="3 个医护角色 · 1 个患者角色" icon={<UserCog className="h-5 w-5" />} />
      <StatCard label="视频待发布" value={String(videos.filter((item) => item.status === "PENDING").length)} note="需要内容发布权限" tone="orange" icon={<Video className="h-5 w-5" />} />
      <StatCard label="设备在线率" value="94%" note="18 / 19 台设备在线" tone="green" icon={<Router className="h-5 w-5" />} />
      <StatCard label="高风险操作" value="3" note="签署 2 · 权限变更 1" tone="red" icon={<ShieldAlert className="h-5 w-5" />} />
    </div>
    <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
      <section className="card p-5"><SectionHeader title="后台待办" description="只保留需要管理员处理的配置和治理事项。" /><div className="space-y-3">{[
        ["视频发布审核", "弹力带上肢训练", "内容管理", "待处理"],
        ["临时权限申请", "刘护士申请数据导出 24 小时", "权限中心", "待审批"],
        ["设备离线", "椭圆机 02 已离线 18 分钟", "训练与设备", "关注"],
        ["签名证书到期", "赵医生证书 15 天后到期", "打印与签名", "关注"]
      ].map(([title, detail, source, status]) => <div key={title} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className={`h-2.5 w-2.5 rounded-full ${status === "待处理" ? "bg-amber-500" : "bg-blue-500"}`} /><div className="flex-1"><b className="text-slate-800">{title}</b><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div><span className="text-[10px] text-slate-400">{source}</span><ChevronRight className="h-4 w-4 text-slate-300" /></div>)}</div></section>
      <section className="card p-5"><SectionHeader title="安全与合规状态" /><div className="space-y-3">{[
        ["服务端权限校验", "策略已同步", true],
        ["高风险二次确认", "签署、授权、永久删除", true],
        ["审计日志归档", "今日 186 条", true],
        ["HIS / EMR 接口", "尚未连接", false]
      ].map(([label, detail, ok]) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3" key={String(label)}>{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="flex-1 font-bold text-slate-700">{label}</span><span className="text-[10px] text-slate-400">{detail}</span></div>)}</div></section>
    </div>
  </>;
}

function OrganizationPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ "王医生": true, "周康复师": true, "刘护士": true, "赵医生": false });
  return <div className="grid grid-cols-[0.8fr_1.2fr] gap-5">
    <section className="card p-5"><SectionHeader title="组织边界" description="数据范围以账号所属康复中心为基础。" action={<button className="btn-secondary"><Plus className="h-4 w-4" />新增组织</button>} /><div className="space-y-3">{[
      ["青岛市心脏康复中心", "主机构", "1 个院区"],
      ["市南院区", "院区", "2 个科室"],
      ["心脏康复科", "科室", "36 个账号"],
      ["院内Ⅱ期康复中心", "康复中心", "28 位执行人员"]
    ].map(([name, type, detail], index) => <div key={name} className={`flex items-center gap-3 rounded-xl border p-3 ${index === 3 ? "border-blue-200 bg-blue-50" : "border-slate-100"}`}><Building2 className="h-4 w-4 text-blue-600" /><div className="flex-1"><b className="text-slate-800">{name}</b><p className="mt-1 text-[9px] text-slate-400">{type}</p></div><span className="text-[10px] text-slate-500">{detail}</span></div>)}</div></section>
    <section className="card overflow-hidden"><div className="p-5"><SectionHeader title="账号与岗位" description="停用账号立即撤销会话权限，但不会删除历史操作人。" /></div><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] text-slate-400"><tr>{["姓名", "岗位角色", "数据范围", "所属中心", "账号状态"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{[
      ["王医生", "康复医生", "医疗团队", "院内Ⅱ期康复中心"],
      ["周康复师", "康复执行岗", "当前中心", "院内Ⅱ期康复中心"],
      ["刘护士", "康复执行岗", "当前中心", "院内Ⅱ期康复中心"],
      ["赵医生", "康复医生", "医疗团队", "院内Ⅱ期康复中心"]
    ].map(([name, role, scope, center]) => <tr className="border-t border-slate-100" key={name}><td className="px-4 py-3 font-bold text-slate-800">{name}</td><td className="px-4 py-3">{role}</td><td className="px-4 py-3">{scope}</td><td className="px-4 py-3">{center}</td><td className="px-4 py-3"><button type="button" onClick={() => setEnabled((state) => ({ ...state, [name]: !state[name] }))} className={`relative h-6 w-11 rounded-full ${enabled[name] ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled[name] ? "left-6" : "left-1"}`} /></button></td></tr>)}</tbody></table></section>
  </div>;
}

function PermissionCenter() {
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
  return <>
    <div className="mb-5 grid grid-cols-3 gap-4">{(["ADMIN", "DOCTOR", "REHAB_EXECUTION"] as const).map((role) => <button key={role} type="button" onClick={() => { setSelectedRole(role); setSaved(false); }} className={`card p-4 text-left ${selectedRole === role ? "border-blue-300 ring-2 ring-blue-100" : ""}`}><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserCog className="h-4 w-4" /></span><StatusBadge tone={role === "ADMIN" ? "red" : "blue"}>{roleMeta[role].scope}</StatusBadge></div><h3 className="mt-3 font-bold text-slate-900">{roleMeta[role].label}</h3><p className="mt-1 text-[10px] text-slate-400">{roleMeta[role].note}</p></button>)}</div>
    <div className="grid grid-cols-[1.2fr_0.8fr] gap-5">
      <section className="card p-5"><SectionHeader title={`${roleMeta[selectedRole].label} · 操作权限`} description={selectedRole === "ADMIN" ? "管理员全权模板不可在演示环境内关闭。" : "点击动作开关模拟角色模板配置。"} /><div className="grid grid-cols-4 gap-3">{allActions.map((action) => { const active = actions[selectedRole].includes(action); return <button type="button" onClick={() => toggle(action)} key={action} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-400"}`}><span className={`flex h-5 w-5 items-center justify-center rounded ${active ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{active && <Check className="h-3.5 w-3.5" />}</span><span className="font-bold">{actionLabels[action]}</span></button>; })}</div><div className="mt-5 flex items-center justify-end gap-3">{saved && <span className="text-xs font-bold text-emerald-600">权限模板已保存并记录审计</span>}<button type="button" onClick={() => setSaved(true)} className="btn-primary"><Save className="h-4 w-4" />保存权限模板</button></div></section>
      <section className="card p-5"><SectionHeader title="横向权限合同" /><div className="space-y-3">{[
        ["菜单权限", selectedRole === "ADMIN" ? "业务工作 + 后台管理" : "仅业务工作"],
        ["数据范围", roleMeta[selectedRole].scope === "ALL" ? "全部数据" : roleMeta[selectedRole].scope === "TEAM" ? "医疗团队" : "当前康复中心"],
        ["临床核心字段", selectedRole === "REHAB_EXECUTION" ? "只读 · 可申请更正" : "可编辑"],
        ["高风险操作", selectedRole === "ADMIN" ? "二次确认 + 审计" : "需独立授权"],
        ["权限失效", "撤销后刷新当前会话"]
      ].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1.5 font-bold text-slate-800">{value}</p></div>)}</div></section>
    </div>
  </>;
}

function ConfigTable({ page, rows }: { page: DoctorPageKey; rows: Array<{ name: string; detail: string; status: string; owner: string }> }) {
  const icon = page === "trainingConfig" ? Activity : page === "documentConfig" ? FileSignature : page === "notifications" ? BellRing : page === "integrations" ? Network : Database;
  const Icon = icon;
  return <section className="card overflow-hidden"><div className="flex items-center justify-between p-5"><SectionHeader title="配置项目" description="配置发布后形成版本，历史版本不可覆盖。" /><button className="btn-primary"><Plus className="h-4 w-4" />新增配置</button></div><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold text-slate-400"><tr>{["配置名称", "内容摘要", "责任方", "当前状态", "操作"].map((item) => <th className="px-5 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-t border-slate-100" key={row.name}><td className="px-5 py-4"><span className="flex items-center gap-2 font-bold text-slate-800"><Icon className="h-4 w-4 text-blue-600" />{row.name}</span></td><td className="px-5 py-4 text-slate-500">{row.detail}</td><td className="px-5 py-4 text-slate-500">{row.owner}</td><td className="px-5 py-4"><StatusBadge tone={row.status.includes("待") ? "orange" : row.status.includes("未") ? "gray" : "green"}>{row.status}</StatusBadge></td><td className="px-5 py-4"><button className="text-xs font-bold text-blue-700">配置<ChevronRight className="ml-1 inline h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></section>;
}

function AuditPage() {
  const logs = useMemo(() => [
    ["10:54:08", "王医生", "SIGN", "签署处方 RX-20260729-01", "成功", "192.168.10.24"],
    ["10:46:32", "林管理员", "GRANT", "授予刘护士 EXPORT 临时权限", "成功", "192.168.10.8"],
    ["10:32:17", "林管理员", "PUBLISH", "发布视频 VIDEO-BDJ-001", "成功", "192.168.10.8"],
    ["09:58:44", "周康复师", "EDIT", "更新患者 PT-001 基础资料", "成功", "192.168.10.31"],
    ["09:42:03", "未知账号", "EXPORT", "尝试导出跨中心患者数据", "已拒绝", "192.168.20.16"]
  ], []);
  return <div className="grid grid-cols-[1.25fr_0.75fr] gap-5"><section className="card overflow-hidden"><div className="p-5"><SectionHeader title="高风险与业务操作日志" description="日志记录操作者、角色、时间、来源和结果，不允许业务账号删除。" /></div><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] text-slate-400"><tr>{["时间", "操作者", "动作", "资源", "结果", "来源"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{logs.map((log) => <tr className="border-t border-slate-100" key={log.join("-")}><td className="px-4 py-3 font-mono text-[10px]">{log[0]}</td><td className="px-4 py-3 font-bold">{log[1]}</td><td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-1 font-mono text-[9px]">{log[2]}</span></td><td className="px-4 py-3">{log[3]}</td><td className="px-4 py-3"><StatusBadge tone={log[4] === "成功" ? "green" : "red"}>{log[4]}</StatusBadge></td><td className="px-4 py-3 text-slate-400">{log[5]}</td></tr>)}</tbody></table></section><section className="card p-5"><SectionHeader title="审计策略" /><div className="space-y-3">{[["处方与签名", "长期保留"], ["权限变更", "长期保留"], ["患者资料变更", "10 年"], ["视频操作", "5 年"], ["登录与访问", "1 年"]].map(([name, value]) => <div className="flex items-center rounded-xl bg-slate-50 p-3" key={name}><ShieldCheck className="h-4 w-4 text-blue-600" /><span className="ml-2 flex-1 font-bold text-slate-700">{name}</span><span className="text-[10px] text-slate-500">{value}</span></div>)}</div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-700"><KeyRound className="mr-2 inline h-4 w-4" />审计日志只允许查询和合规导出，不提供删除入口。</div></section></div>;
}
