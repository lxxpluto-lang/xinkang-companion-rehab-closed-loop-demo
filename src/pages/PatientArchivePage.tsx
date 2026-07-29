import { useMemo, useState } from "react";
import { Activity, ArrowRight, FileText, LockKeyhole, Pencil, Plus, Save, Search, UserRound, X } from "lucide-react";
import { demoPatients } from "../mockData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import { patientMasterChen } from "../clinicalSharedData";

type ManagedPatient = {
  patient_demo_id: string;
  name: string;
  id_number: string;
  phone: string;
  age: number;
  gender: string;
  diagnosis_summary: string;
  risk_level: string;
  rehab_group: string;
  assessment: {
    cpet: string;
    six_mwt: string;
    resting_hr: number;
  };
  prescription_version: string;
  training_status: string;
  latest_abnormal: string;
  report_status: string;
  last_followup: string;
};

const patientProfiles = [
  { name: patientMasterChen.name, id_number: patientMasterChen.idNumber, phone: patientMasterChen.phone, rehab_group: patientMasterChen.rehabGroup, last_followup: patientMasterChen.latestFollowUp },
  { name: "李秀兰", id_number: "3702********4826", phone: "136****1938", rehab_group: "运动康复 A 组", last_followup: "2026-07-26" },
  { name: "周海明", id_number: "3702********7714", phone: "159****2850", rehab_group: "运动康复 B 组", last_followup: "2026-07-25" },
  { name: "王淑芬", id_number: "3702********3409", phone: "137****8246", rehab_group: "重点监护组", last_followup: "2026-07-24" }
];

const initialPatients: ManagedPatient[] = demoPatients.map((patient, index) => ({
  ...patient,
  ...patientProfiles[index]
}));

function riskTone(risk: string): "red" | "orange" | "green" {
  return risk === "高危" ? "red" : risk === "中危" ? "orange" : "green";
}

export function PatientArchivePage({ role }: { role: Exclude<Role, "PATIENT"> }) {
  const [patients, setPatients] = useState<ManagedPatient[]>(initialPatients);
  const [selectedId, setSelectedId] = useState(initialPatients[0].patient_demo_id);
  const [keyword, setKeyword] = useState("");
  const [editDraft, setEditDraft] = useState<ManagedPatient | null>(null);
  const [editingMode, setEditingMode] = useState<"create" | "edit">("edit");
  const canEditClinical = role === "ADMIN" || role === "DOCTOR";
  const selected = patients.find((patient) => patient.patient_demo_id === selectedId) ?? patients[0];
  const filteredPatients = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return patients;
    return patients.filter((patient) => [patient.name, patient.patient_demo_id, patient.id_number, patient.phone, patient.diagnosis_summary].some((field) => field.toLowerCase().includes(value)));
  }, [keyword, patients]);

  function savePatient() {
    if (!editDraft) return;
    setPatients((items) => editingMode === "create" ? [editDraft, ...items] : items.map((patient) => patient.patient_demo_id === editDraft.patient_demo_id ? editDraft : patient));
    setSelectedId(editDraft.patient_demo_id);
    setEditDraft(null);
  }

  function openEdit(patient: ManagedPatient) {
    setEditingMode("edit");
    setEditDraft({ ...patient, assessment: { ...patient.assessment } });
  }

  function openCreate() {
    const nextNumber = patients.length + 1;
    setEditingMode("create");
    setEditDraft({
      patient_demo_id: `P-DEMO-${String(nextNumber).padStart(3, "0")}`,
      name: "",
      id_number: "",
      phone: "",
      age: 60,
      gender: "男",
      diagnosis_summary: canEditClinical ? "冠心病Ⅱ期院内康复待完善" : "待医生完善",
      risk_level: "中危",
      rehab_group: "运动康复 A 组",
      assessment: { cpet: "待补充", six_mwt: "待补充", resting_hr: 72 },
      prescription_version: "待开具",
      training_status: "待建档",
      latest_abnormal: "无",
      report_status: "未生成",
      last_followup: patientMasterChen.latestFollowUp
    });
  }

  return (
    <section data-testid="page-VIEW-PATIENT-ARCHIVES">
      <PageHeader eyebrow={role === "REHAB_EXECUTION" ? "当前康复中心 · 基础与执行字段可编辑" : role === "DOCTOR" ? "医疗团队共享 · 临床任务指定负责人" : "全部患者与字段权限"} title="患者信息与康复档案" description={role === "REHAB_EXECUTION" ? "可维护联系方式、接诊、生命体征、训练后确认和异常上报；诊断、危险分组及处方字段只能提交更正申请。" : "团队医生可在工作台新增患者建档信息，处方、异常和签署任务仍分派到具体责任人。"} action={<button type="button" onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />新增患者</button>} />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="font-bold text-slate-900">患者档案列表</h2>
            <p className="mt-1 text-[11px] text-slate-400">共 {patients.length} 位患者 · 修改仅用于当前Demo会话</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreate} className="btn-secondary"><Plus className="h-4 w-4" />新增患者</button>
            <label className="relative block w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400" placeholder="搜索姓名、编号、证件号或诊断" />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400">
              <tr>
                {["患者信息", "性别/年龄", "诊断摘要", "危险分组", "康复分组", "当前处方", "训练状态", "下次确认", "操作"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.patient_demo_id} onClick={() => setSelectedId(patient.patient_demo_id)} className={`cursor-pointer border-t border-slate-100 ${selectedId === patient.patient_demo_id ? "bg-blue-50/70" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><UserRound className="h-4 w-4" /></span>
                      <span><b className="block text-slate-900">{patient.name}</b><small className="mt-0.5 block text-[10px] text-slate-400">{patient.patient_demo_id}</small></span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{patient.gender} / {patient.age}岁</td>
                  <td className="max-w-[220px] px-4 py-3 leading-5 text-slate-600">{patient.diagnosis_summary}</td>
                  <td className="px-4 py-3"><StatusBadge tone={riskTone(patient.risk_level)}>{patient.risk_level}</StatusBadge></td>
                  <td className="px-4 py-3 text-slate-600">{patient.rehab_group}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{patient.prescription_version}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.training_status}</td>
                  <td className="px-4 py-3 text-slate-500">{patient.last_followup}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(patient); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPatients.length === 0 && <div className="py-10 text-center text-xs text-slate-400">未找到匹配患者</div>}
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <section className="card p-5">
          <SectionHeader title={`${selected.name} · 康复档案`} action={<div className="flex items-center gap-2"><StatusBadge tone={riskTone(selected.risk_level)}>{selected.risk_level}</StatusBadge><button type="button" onClick={() => openEdit(selected)} className="btn-secondary"><Pencil className="h-4 w-4" />编辑基本信息</button></div>} />
          <div className="grid grid-cols-6 gap-3">
            {[
              ["患者编号", selected.patient_demo_id],
              ["证件号码", selected.id_number],
              ["联系电话", selected.phone],
              ["年龄/性别", `${selected.age}岁 / ${selected.gender}`],
              ["康复分组", selected.rehab_group],
              ["静息心率", `${selected.assessment.resting_hr} bpm`]
            ].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold leading-5 text-slate-800">{value}</p></div>)}
          </div>
          <div className="mt-3 grid grid-cols-[1.4fr_1fr_1fr] gap-3">
            {[["诊断摘要", selected.diagnosis_summary], ["CPET", selected.assessment.cpet], ["6MWT", selected.assessment.six_mwt]].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold leading-5 text-slate-800">{value}</p></div>)}
          </div>
        </section>
        <div className="grid grid-cols-2 gap-5">
          <section className="card p-5"><SectionHeader title="处方历史" /><div className="space-y-3">{[["V4.0", "2026-07-25", "当前执行"], ["V3.1", "2026-07-11", "已归档"], ["V2.0", "2026-06-26", "已归档"]].map(([version, date, status]) => <div className="flex items-center rounded-lg border border-slate-100 p-3" key={version}><FileText className="h-4 w-4 text-blue-600" /><span className="ml-2 flex-1 font-bold text-slate-700">{version}<small className="ml-2 font-normal text-slate-400">{date}</small></span><StatusBadge tone={status === "当前执行" ? "green" : "gray"}>{status}</StatusBadge></div>)}</div></section>
          <section className="card p-5"><SectionHeader title="报告历史" /><div className="space-y-3">{[["阶段性报告", "07-01至07-25", "已审核"], ["单次报告", "07-25 功率车", "已完成"], ["单次报告", "07-23 功率车", "已完成"]].map(([type, date, status]) => <div className="flex items-center rounded-lg border border-slate-100 p-3" key={type + date}><Activity className="h-4 w-4 text-emerald-600" /><span className="ml-2 flex-1 font-bold text-slate-700">{type}<small className="ml-2 font-normal text-slate-400">{date}</small></span><StatusBadge tone="green">{status}</StatusBadge></div>)}</div></section>
        </div>
        <section className="card border-l-4 border-l-blue-500 p-4"><div className="flex items-center"><div className="flex-1"><p className="font-bold text-slate-800">最近一次训练摘要（医生只读）</p><p className="mt-1 text-xs text-slate-500">07-28 功率车 · 完成32分钟 · 靶区达标84% · 无提前终止</p></div><button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">查看单次报告<ArrowRight className="h-4 w-4" /></button></div></section>
      </div>

      {editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="patient-edit-title">
          <form onSubmit={(event) => { event.preventDefault(); savePatient(); }} className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div><p className="text-[10px] font-bold text-blue-600">患者档案</p><h2 id="patient-edit-title" className="mt-1 text-lg font-bold text-slate-900">{editingMode === "create" ? "新增患者信息" : "编辑基本信息"} · {editDraft.patient_demo_id}</h2></div>
              <button type="button" onClick={() => setEditDraft(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="关闭"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-4 p-6">
              <label><span className="field-label">患者姓名</span><input required value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} className="text-field" /></label>
              <label><span className="field-label">性别</span><select value={editDraft.gender} onChange={(event) => setEditDraft({ ...editDraft, gender: event.target.value })} className="text-field"><option>男</option><option>女</option><option>其他</option></select></label>
              <label><span className="field-label">年龄</span><input required min={1} max={120} type="number" value={editDraft.age} onChange={(event) => setEditDraft({ ...editDraft, age: Number(event.target.value) })} className="text-field" /></label>
              <label><span className="field-label">证件号码</span><input required value={editDraft.id_number} onChange={(event) => setEditDraft({ ...editDraft, id_number: event.target.value })} className="text-field" /></label>
              <label><span className="field-label">联系电话</span><input required value={editDraft.phone} onChange={(event) => setEditDraft({ ...editDraft, phone: event.target.value })} className="text-field" /></label>
              <label><span className="field-label">危险分组 {!canEditClinical && <LockKeyhole className="ml-1 inline h-3.5 w-3.5 text-amber-500" />}</span><select disabled={!canEditClinical} value={editDraft.risk_level} onChange={(event) => setEditDraft({ ...editDraft, risk_level: event.target.value })} className="text-field disabled:bg-slate-100 disabled:text-slate-400"><option>低危</option><option>中危</option><option>高危</option></select></label>
              <label><span className="field-label">康复分组</span><select value={editDraft.rehab_group} onChange={(event) => setEditDraft({ ...editDraft, rehab_group: event.target.value })} className="text-field"><option>运动康复 A 组</option><option>运动康复 B 组</option><option>重点监护组</option></select></label>
              <label><span className="field-label">静息心率（bpm）</span><input type="number" min={30} max={180} value={editDraft.assessment.resting_hr} onChange={(event) => setEditDraft({ ...editDraft, assessment: { ...editDraft.assessment, resting_hr: Number(event.target.value) } })} className="text-field" /></label>
              <label><span className="field-label">训练后确认日期</span><input type="date" value={editDraft.last_followup} onChange={(event) => setEditDraft({ ...editDraft, last_followup: event.target.value })} className="text-field" /></label>
              <label className="col-span-3"><span className="field-label">诊断摘要 {!canEditClinical && <><LockKeyhole className="ml-1 inline h-3.5 w-3.5 text-amber-500" /><small className="ml-2 font-normal text-amber-600">临床核心字段只读，如有错误请提交资料更正申请</small></>}</span><textarea disabled={!canEditClinical} required rows={3} value={editDraft.diagnosis_summary} onChange={(event) => setEditDraft({ ...editDraft, diagnosis_summary: event.target.value })} className="text-field min-h-20 py-2 disabled:bg-slate-100 disabled:text-slate-400" /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setEditDraft(null)} className="btn-secondary">取消</button>
              <button type="submit" className="btn-primary"><Save className="h-4 w-4" />{editingMode === "create" ? "新增并保存" : "保存患者信息"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
