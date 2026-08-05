import { useState } from "react";
import {
  Building2,
  Check,
  FileSignature,
  LockKeyhole,
  Plus,
  Save,
  ShieldCheck,
  UserCog,
  X
} from "lucide-react";
import { roleActions, roleMeta } from "../accessControl";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { DoctorPageKey, PermissionAction, Role } from "../types";

type AdminConsolePageKey = Exclude<DoctorPageKey, "dashboard" | "patients" | "followups" | "report" | "prescriptions" | "training" | "videoConfig">;
type OrgPermissionSheet = "organization" | "permissions";

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
      <div className="mb-5 inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
        <button type="button" onClick={() => setActiveSheet("organization")} className={`rounded-lg px-5 py-2 text-xs font-bold ${activeSheet === "organization" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>组织账号</button>
        <button type="button" onClick={() => setActiveSheet("permissions")} className={`rounded-lg px-5 py-2 text-xs font-bold ${activeSheet === "permissions" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>权限配置</button>
      </div>
      {activeSheet === "organization" ? <OrganizationSheet /> : <PermissionSheet />}
    </section>
  );
}

function OrganizationSheet() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ "王医生": true, "周康复师": true, "刘护士": true, "赵医生": false });
  return (
    <div className="grid grid-cols-[0.82fr_1.18fr] gap-5">
      <section className="card p-5">
        <SectionHeader title="组织边界" description="验证版只维护一个康复中心和必要岗位账号。" action={<button className="btn-secondary"><Plus className="h-4 w-4" />新增账号</button>} />
        <div className="space-y-3">
          {[
            ["合作康复中心", "主机构", "1 个院区"],
            ["验证院区", "院区", "1 个康复团队"],
            ["康复科", "科室", "医生与执行岗共用"],
            ["院内Ⅱ期康复团队", "验证中心", "本 Demo 数据边界"]
          ].map(([name, type, detail], index) => (
            <div key={name} className={`flex items-center gap-3 rounded-xl border p-3 ${index === 3 ? "border-blue-200 bg-blue-50" : "border-slate-100"}`}>
              <Building2 className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <b className="text-slate-800">{name}</b>
                <p className="mt-1 text-[9px] text-slate-400">{type}</p>
              </div>
              <span className="text-[10px] text-slate-500">{detail}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="p-5">
          <SectionHeader title="账号与岗位" description="管理员只维护验证团队账号，不展示完整组织架构后台。" />
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] text-slate-400">
            <tr>{["姓名", "岗位角色", "数据范围", "所属中心", "账号状态"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody>
            {[
              ["王医生", "康复医生", "医疗团队", "院内Ⅱ期康复中心"],
              ["周康复师", "康复执行岗", "当前中心", "院内Ⅱ期康复中心"],
              ["刘护士", "康复执行岗", "当前中心", "院内Ⅱ期康复中心"],
              ["赵医生", "康复医生", "医疗团队", "院内Ⅱ期康复中心"]
            ].map(([name, role, scope, center]) => (
              <tr className="border-t border-slate-100" key={name}>
                <td className="px-4 py-3 font-bold text-slate-800">{name}</td>
                <td className="px-4 py-3">{role}</td>
                <td className="px-4 py-3">{scope}</td>
                <td className="px-4 py-3">{center}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setEnabled((state) => ({ ...state, [name]: !state[name] }))} className={`relative h-6 w-11 rounded-full ${enabled[name] ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled[name] ? "left-6" : "left-1"}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </>
  );
}

function DocumentConfigPage() {
  const [activeConfig, setActiveConfig] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState("王医生-签名.png");
  const [saved, setSaved] = useState(false);
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
                <td className="px-5 py-4">{row.name === "单次报告模板" || row.name === "阶段报告模板" ? <span className="text-xs text-slate-400">验证版暂不开放</span> : <button type="button" onClick={() => { setActiveConfig(row.name); setSaved(false); }} className="text-xs font-bold text-blue-700">配置</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {activeConfig && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"><section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold text-blue-600">后台配置</p><h2 className="mt-1 text-xl font-bold text-slate-950">{activeConfig}</h2></div><button type="button" onClick={() => setActiveConfig(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="关闭配置"><X className="h-4 w-4" /></button></div>{activeConfig === "王医生数字签名" ? <div className="mt-5 space-y-4"><div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">处方签署时只允许本人使用已配置签名；管理员可以配置模板，但不能代替医生签署。</div><label className="block"><span className="field-label">上传签名图片</span><input type="file" accept="image/png,image/jpeg" onChange={(event) => setSignatureFile(event.target.files?.[0]?.name ?? signatureFile)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-xs" /></label><div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex h-16 w-28 items-center justify-center rounded-lg bg-white text-2xl italic text-slate-700 shadow-sm">王医生</div><div><p className="text-xs font-bold text-slate-800">当前文件</p><p className="mt-1 text-[10px] text-slate-500">{signatureFile}</p></div></div></div> : <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><b>康复报告模板预览</b><p className="mt-2">网页预览使用成长进度、生命体征前后对照和阶段勋章等轻量动画；打印/PDF 输出静态、清晰的医疗文书。</p></div>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setActiveConfig(null)} className="btn-secondary">取消</button><button type="button" onClick={() => setSaved(true)} className="btn-primary"><Save className="h-4 w-4" />保存配置</button>{saved && <span className="self-center text-xs font-bold text-emerald-600">已保存</span>}</div></section></div>}
    </section>
  );
}
