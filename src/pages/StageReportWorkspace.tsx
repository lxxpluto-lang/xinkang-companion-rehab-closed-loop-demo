import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileHeart, Plus, Save, Send, Sparkles } from "lucide-react";
import { SectionHeader, StatusBadge } from "../components/UI";
import {
  createStoredStageReport,
  displayReportList,
  displayReportValue,
  type PatientStageConclusion,
  type ReportPatientSnapshot,
  type StageClinicalConclusion,
  type StoredStageReport,
  type StoredTrainingSession
} from "../reportData";
import type { StaffRole } from "../types";

type Props = {
  patient: ReportPatientSnapshot;
  sessions: StoredTrainingSession[];
  reports: StoredStageReport[];
  role: StaffRole;
  currentAccount: string;
  canEdit: boolean;
  onSave: (report: StoredStageReport) => void;
  onConfirm?: (reportId: string, account: string) => void;
  onPublish?: (reportId: string, account: string) => void;
};

const statusLabel: Record<StoredStageReport["status"], string> = {
  draft: "草稿",
  pending_doctor_review: "待医生审核",
  confirmed: "医生已确认",
  sent: "已发送患者端"
};

const emptyComparison = () => ({ metric: "", before: "", after: "", meaning: "" });

export function StageReportWorkspace({ patient, sessions, reports, role, currentAccount, canEdit, onSave, onConfirm, onPublish }: Props) {
  const patientReports = useMemo(() => reports.filter((report) => report.patientId === patient.patientId).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "")), [patient.patientId, reports]);
  const [selectedId, setSelectedId] = useState<string | null>(patientReports[0]?.reportId ?? null);
  const [draft, setDraft] = useState<StoredStageReport | null>(patientReports[0] ?? null);
  const selectedSessions = useMemo(() => sessions.filter((session) => draft?.selectedSessionIds.includes(session.id)), [draft?.selectedSessionIds, sessions]);
  const locked = !draft || draft.status === "sent";

  useEffect(() => {
    const current = patientReports.find((report) => report.reportId === selectedId) ?? patientReports[0] ?? null;
    if (draft && draft.patientId === patient.patientId && selectedId === draft.reportId && !patientReports.some((report) => report.reportId === selectedId)) return;
    setSelectedId(current?.reportId ?? null);
    setDraft(current);
  }, [patientReports]);

  function startNew() {
    const selection = sessions.slice(-4).map((session) => session.id);
    const next = createStoredStageReport(patient, sessions, selection, Math.max(0, ...patientReports.map((report) => report.version ?? 0)));
    setSelectedId(next.reportId);
    setDraft(next);
  }

  function updateDraft(patch: Partial<StoredStageReport>) {
    if (!draft || locked || !canEdit) return;
    setDraft({ ...draft, ...patch, patientSnapshot: patient });
  }

  function updateConclusion(patch: Partial<PatientStageConclusion>) {
    if (!draft || locked || !canEdit) return;
    updateDraft({ patientStageConclusion: { ...draft.patientStageConclusion, ...patch } });
  }

  function updateClinical(patch: Partial<StageClinicalConclusion>) {
    if (!draft || locked || !canEdit) return;
    updateDraft({ clinicalConclusion: { ...draft.clinicalConclusion, ...patch } });
  }

  function save(status: StoredStageReport["status"] = draft?.status ?? "draft") {
    if (!draft || !canEdit) return;
    const next = { ...draft, status, generatedBy: draft.generatedBy || currentAccount, patientSnapshot: patient, updatedAt: new Date().toISOString() };
    setDraft(next);
    setSelectedId(next.reportId);
    onSave(next);
  }

  function generateFacts() {
    if (!draft || draft.selectedSessionIds.length < 2 || !canEdit) return;
    const next = createStoredStageReport(patient, sessions, draft.selectedSessionIds, draft.version ? draft.version - 1 : 0);
    const preserved = {
      ...next,
      reportId: draft.reportId,
      reportNo: draft.reportNo,
      version: draft.version,
      patientStageConclusion: draft.patientStageConclusion,
      clinicalConclusion: draft.clinicalConclusion,
      status: "draft" as const,
      generatedBy: currentAccount,
      generatedAt: draft.generatedAt ?? next.generatedAt,
      confirmedBy: undefined,
      confirmedAt: undefined,
      sentBy: undefined,
      sentAt: undefined
    };
    setDraft(preserved);
  }

  function toggleSession(id: string) {
    if (!draft || locked || !canEdit) return;
    const selected = draft.selectedSessionIds.includes(id) ? draft.selectedSessionIds.filter((item) => item !== id) : [...draft.selectedSessionIds, id];
    updateDraft({ selectedSessionIds: selected, status: "draft" });
  }

  function confirm() {
    if (!draft || role !== "DOCTOR" || draft.selectedSessionIds.length < 2 || !draft.clinicalConclusion.summary.trim()) return;
    const next = { ...draft, status: "confirmed" as const, confirmedBy: currentAccount, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDraft(next);
    onSave(next);
    onConfirm?.(next.reportId, currentAccount);
  }

  function publish() {
    if (!draft || role !== "DOCTOR" || draft.status !== "confirmed") return;
    const next = { ...draft, status: "sent" as const, sentBy: currentAccount, sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDraft(next);
    onSave(next);
    onPublish?.(next.reportId, currentAccount);
  }

  const statusTone = draft?.status === "sent" || draft?.status === "confirmed" ? "green" : draft?.status === "pending_doctor_review" ? "orange" : "gray";
  return <div className="space-y-4">
    <section className="card p-5">
      <SectionHeader title="阶段报告" description="所有阶段报告均引用已保存的单次训练记录；患者端只显示医生已发送的版本。" action={canEdit ? <button type="button" className="btn-primary" onClick={startNew}><Plus className="h-4 w-4" />新建阶段报告</button> : undefined} />
      {patientReports.length ? <div className="mt-4 grid gap-2 md:grid-cols-3">{patientReports.map((report) => <button type="button" key={report.reportId} onClick={() => { setSelectedId(report.reportId); setDraft(report); }} className={`rounded-xl border p-3 text-left ${report.reportId === selectedId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-2"><b className="text-xs text-slate-900">{report.reportNo}</b><StatusBadge tone={report.status === "sent" || report.status === "confirmed" ? "green" : report.status === "pending_doctor_review" ? "orange" : "gray"}>{statusLabel[report.status]}</StatusBadge></div><p className="mt-2 text-[10px] text-slate-500">{displayReportValue(report.periodStart)} 至 {displayReportValue(report.periodEnd)} · 纳入{report.selectedSessionIds.length}次</p></button>)}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">暂无阶段报告，请从已完成训练记录新建。</div>}
    </section>

    {!draft ? null : <>
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-medical-600">{draft.reportNo}</p><h2 className="mt-1 text-xl font-bold text-slate-950">阶段事实与结论</h2><p className="mt-1 text-xs text-slate-500">患者：{patient.name} · 患者号：{patient.patientNo} · {displayReportValue(patient.diagnosis)}</p></div><StatusBadge tone={statusTone}>{statusLabel[draft.status]}</StatusBadge></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">{[[draft.aggregate.sessionCount, "纳入次数"], [`${draft.aggregate.totalActiveMinutes}分`, "实际运动时间"], [draft.aggregate.abnormalCount, "异常/暂停"], [`${displayReportValue(draft.aggregate.dataCompleteness)}%`, "数据完整率"]].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>)}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{sessions.map((session) => <label key={session.id} className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${draft.selectedSessionIds.includes(session.id) ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" disabled={locked || !canEdit} checked={draft.selectedSessionIds.includes(session.id)} onChange={() => toggleSession(session.id)} /><span><b>{session.exerciseType}</b> · {session.date}<br /><span className="text-[10px] text-slate-500">平均/峰值心率 {displayReportValue(session.avgHr)}/{displayReportValue(session.peakHr)} bpm · 训练后血压 {displayReportValue(session.postBp)} · RPE {displayReportValue(session.rpe)}</span></span></label>)}</div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><b>系统事实汇总</b><p className="mt-1">{draft.generatedSummary || "尚未生成，请至少选择2次训练记录。"}</p></div>
      </section>

      <section className="card p-5">
        <SectionHeader title="患者可读结论" description="以下字段均由报告保存；未填写内容在患者端显示为“未提供”。" />
        <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="标题" value={draft.patientStageConclusion.headline} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ headline: value })} /><Field label="患者可读总结" value={draft.patientStageConclusion.plainSummary} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ plainSummary: value })} /><Field label="耐量变化标签" value={draft.patientStageConclusion.toleranceChange.label} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ toleranceChange: { ...draft.patientStageConclusion.toleranceChange, label: value } })} /><Field label="耐量变化值" value={draft.patientStageConclusion.toleranceChange.value} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ toleranceChange: { ...draft.patientStageConclusion.toleranceChange, value } })} /><Field label="耐量变化依据" value={draft.patientStageConclusion.toleranceChange.basis} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ toleranceChange: { ...draft.patientStageConclusion.toleranceChange, basis: value } })} /><Field label="生命体征总结" value={draft.patientStageConclusion.vitalsStability.summary} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ vitalsStability: { ...draft.patientStageConclusion.vitalsStability, summary: value } })} /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><SelectField label="血压状态" value={draft.patientStageConclusion.vitalsStability.bp} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ vitalsStability: { ...draft.patientStageConclusion.vitalsStability, bp: value as PatientStageConclusion["vitalsStability"]["bp"] } })} /><SelectField label="血氧状态" value={draft.patientStageConclusion.vitalsStability.spo2} disabled={locked || !canEdit} onChange={(value) => updateConclusion({ vitalsStability: { ...draft.patientStageConclusion.vitalsStability, spo2: value as PatientStageConclusion["vitalsStability"]["spo2"] } })} /></div>
        <ComparisonEditor items={draft.patientStageConclusion.beforeAfterComparison} disabled={locked || !canEdit} onChange={(beforeAfterComparison) => updateConclusion({ beforeAfterComparison })} />
        <div className="mt-4 grid gap-3 md:grid-cols-3"><ListEditor label="饮食建议" items={draft.patientStageConclusion.dietAdvice} disabled={locked || !canEdit} onChange={(dietAdvice) => updateConclusion({ dietAdvice })} /><ListEditor label="训练注意事项" items={draft.patientStageConclusion.dailyCautions} disabled={locked || !canEdit} onChange={(dailyCautions) => updateConclusion({ dailyCautions })} /><ListEditor label="停训与联系规则" items={draft.patientStageConclusion.stopAndContactRules} disabled={locked || !canEdit} onChange={(stopAndContactRules) => updateConclusion({ stopAndContactRules })} /></div>
      </section>

      <section className="card p-5">
        <SectionHeader title="医生审核结论" description="医学结论必须由医生确认后才能发送患者端。" />
        <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="医生总结" value={draft.clinicalConclusion.summary} disabled={locked || !canEdit} onChange={(value) => updateClinical({ summary: value })} /><Field label="下一步处方说明" value={draft.clinicalConclusion.nextPrescription} disabled={locked || !canEdit} onChange={(value) => updateClinical({ nextPrescription: value })} /><Field label="复评要求" value={draft.clinicalConclusion.reassessment} disabled={locked || !canEdit} onChange={(value) => updateClinical({ reassessment: value })} /><Field label="下次随访" value={draft.clinicalConclusion.nextFollowUp} disabled={locked || !canEdit} onChange={(value) => updateClinical({ nextFollowUp: value })} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><ListEditor label="已完成目标" items={draft.clinicalConclusion.achievedGoals} disabled={locked || !canEdit} onChange={(achievedGoals) => updateClinical({ achievedGoals })} /><ListEditor label="待完成目标" items={draft.clinicalConclusion.pendingGoals} disabled={locked || !canEdit} onChange={(pendingGoals) => updateClinical({ pendingGoals })} /></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">{canEdit && !locked && <><button type="button" className="btn-secondary" onClick={() => save("draft")}><Save className="h-4 w-4" />保存草稿</button>{role === "REHAB_EXECUTION" && <button type="button" className="btn-primary" onClick={() => save("pending_doctor_review")}><Send className="h-4 w-4" />提交医生审核</button>}{role === "DOCTOR" && <button type="button" disabled={draft.selectedSessionIds.length < 2 || !draft.clinicalConclusion.summary.trim()} className="btn-primary disabled:bg-slate-300" onClick={confirm}><CheckCircle2 className="h-4 w-4" />医生确认</button>}</>}{role === "DOCTOR" && draft.status === "confirmed" && <button type="button" className="btn-primary" onClick={publish}><Send className="h-4 w-4" />发送患者端</button>}</div>
        {role === "REHAB_EXECUTION" && canEdit && !locked && <button type="button" className="btn-secondary mt-3" onClick={generateFacts}><Sparkles className="h-4 w-4" />重新生成事实汇总</button>}
      </section>
    </>}
  </div>;
}

function Field({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <label className="block"><span className="field-label">{label}</span><textarea className="text-field min-h-20 py-2 disabled:bg-slate-50" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <label className="block"><span className="field-label">{label}</span><select className="text-field disabled:bg-slate-50" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{["稳定", "需关注", "需医生复核", "未采集"].map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function ListEditor({ label, items, disabled, onChange }: { label: string; items: string[]; disabled: boolean; onChange: (items: string[]) => void }) {
  const values = items.length ? items : [""];
  return <section><div className="flex items-center justify-between"><span className="field-label">{label}</span><button type="button" disabled={disabled} onClick={() => onChange([...items, ""])} className="text-xs font-bold text-blue-700 disabled:text-slate-300">+ 添加</button></div><div className="mt-2 space-y-2">{values.map((item, index) => <div key={`${label}-${index}`} className="flex gap-2"><textarea className="text-field min-h-16 flex-1 py-2 disabled:bg-slate-50" disabled={disabled} value={item} placeholder="未提供" onChange={(event) => onChange(values.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /><button type="button" disabled={disabled || values.length <= 1} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} className="self-start px-2 py-2 text-xs font-bold text-rose-600 disabled:text-slate-300">删除</button></div>)}</div></section>;
}

function ComparisonEditor({ items, disabled, onChange }: { items: PatientStageConclusion["beforeAfterComparison"]; disabled: boolean; onChange: (items: PatientStageConclusion["beforeAfterComparison"]) => void }) {
  const values = items.length ? items : [emptyComparison()];
  return <section className="mt-4"><div className="flex items-center justify-between"><span className="field-label">前后对比项目</span><button type="button" disabled={disabled} onClick={() => onChange([...items, emptyComparison()])} className="text-xs font-bold text-blue-700 disabled:text-slate-300">+ 添加对比</button></div><div className="mt-2 space-y-2">{values.map((item, index) => <div key={`comparison-${index}`} className="grid gap-2 rounded-xl border border-slate-100 p-3 md:grid-cols-4">{(["metric", "before", "after", "meaning"] as const).map((key) => <input key={key} className="text-field" disabled={disabled} value={item[key]} placeholder={key === "metric" ? "指标" : key === "before" ? "之前" : key === "after" ? "现在" : "说明"} onChange={(event) => onChange(values.map((value, itemIndex) => itemIndex === index ? { ...value, [key]: event.target.value } : value))} />)}<button type="button" disabled={disabled || values.length <= 1} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} className="text-left text-xs font-bold text-rose-600 disabled:text-slate-300">删除此项</button></div>)}</div></section>;
}
