import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Printer, Save, Send, Sparkles } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { AssessmentRecord } from "../assessmentData";
import type { RehabReport } from "../dischargeHandbookData";
import { effectiveFollowUpStatus, type FollowUpRecord, type FollowUpTask } from "../followUpData";
import { stageReportData } from "../patient/stageReportData";
import type { StageReport } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";

type ReportRole = "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";
type ReportSheet = "stage" | "discharge";

function createReport(patient: ManagedPatient, assessments: AssessmentRecord[], followUps: FollowUpTask[], followUpRecords: FollowUpRecord[], selectedSessionIds: string[], episodeNo = 1): RehabReport {
  const reviewed = assessments.filter((record) => record.status === "doctor_reviewed");
  const completedFollowUps = followUps.filter((task) => effectiveFollowUpStatus(task) === "completed").length;
  const patientRecords = followUpRecords.filter((record) => record.patientId === patient.patient_demo_id);
  const latest = reviewed[0];
  return {
    reportId: `CRH-RR-${patient.patient_demo_id}-E${episodeNo}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    patientId: patient.patient_demo_id,
    episodeNo,
    admissionDate: patient.planned_rehab_date || patient.created_at.slice(0, 10),
    dischargeDate: patient.discharge_date || undefined,
    generatedAt: new Date().toISOString(),
    status: "draft",
    medicalSection: { diagnosis: patient.diagnosis_summary, treatmentCourse: "", procedure: patient.procedure_history || "", medications: patient.current_medications || "", followUpRequirements: "", clinicalConclusion: "" },
    rehabSection: {
      assessmentSummary: latest ? `已复核 ${reviewed.length} 次体能评估；最近一次SPPB ${latest.sppb.totalScore}/12。` : "暂无已复核阶段末评估，不生成能力提升结论。",
      trainingSummary: selectedSessionIds.length ? `已纳入 ${selectedSessionIds.length} 次已完成训练记录，逐次比较心率、血氧、血压、功率、RPE与异常。` : "尚未选择训练记录。",
      adherenceSummary: patientRecords.length ? `运动依从性：${patientRecords.at(-1)?.exerciseAdherence ?? "待确认"}；用药依从性：${patientRecords.at(-1)?.medicationAdherence ?? "待确认"}。` : "尚无已确认随访记录。",
      followUpSummary: `当前 ${followUps.length} 个随访节点，已完成 ${completedFollowUps} 个。`,
      improvementSummary: reviewed.length >= 2 ? "具备基线与阶段末评估，可结合原始记录形成变化结论。" : "缺少两个有效评估时间点，仅展示当前值。"
    },
    recommendationDraft: "建议按医院正式处方执行居家康复，继续观察训练时长、心率、血压和症状；持续胸痛、晕厥或急诊/再住院时应及时就医。",
    sourceRefs: [...selectedSessionIds, ...reviewed.map((record) => record.assessmentId), ...followUps.map((task) => task.id), ...patientRecords.map((record) => record.recordId)]
  };
}

export function RehabDischargeReportPage({ role, currentAccount, patients, assessments, followUps, followUpRecords, reports, initialPatientId, onSave }: {
  role: ReportRole;
  currentAccount: string;
  patients: ManagedPatient[];
  assessments: AssessmentRecord[];
  followUps: FollowUpTask[];
  followUpRecords: FollowUpRecord[];
  reports: RehabReport[];
  initialPatientId?: string | null;
  onSave: (report: RehabReport) => void;
}) {
  const scopedPatients = role === "DOCTOR" ? patients.filter((patient) => patient.assigned_doctor === currentAccount) : patients;
  const [sheet, setSheet] = useState<ReportSheet>("stage");
  const [patientId, setPatientId] = useState(initialPatientId && scopedPatients.some((item) => item.patient_demo_id === initialPatientId) ? initialPatientId : scopedPatients[0]?.patient_demo_id ?? "");
  const patient = scopedPatients.find((item) => item.patient_demo_id === patientId) ?? scopedPatients[0];
  const availableSessions = patient?.patient_demo_id === "P-DEMO-001" ? stageReportData.sessions.filter((session) => session.completed) : [];
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(availableSessions.slice(-4).map((session) => session.id));
  const [stageReport, setStageReport] = useState<StageReport>({ reportId: "STAGE-DRAFT-001", patientId: patient?.patient_demo_id ?? "", selectedSessionIds, generatedSummary: "", status: "draft" });
  const patientReports = reports.filter((item) => item.patientId === patient?.patient_demo_id).sort((a, b) => (b.episodeNo ?? 1) - (a.episodeNo ?? 1));
  const patientFollowUps = useMemo(() => followUps.filter((task) => task.patientId === patient?.patient_demo_id), [followUps, patient?.patient_demo_id]);
  const [report, setReport] = useState<RehabReport | null>(() => patient ? patientReports[0] ?? createReport(patient, assessments.filter((item) => item.patientId === patient.patient_demo_id), patientFollowUps, followUpRecords, selectedSessionIds) : null);

  function switchPatient(nextId: string) {
    const next = scopedPatients.find((item) => item.patient_demo_id === nextId);
    if (!next) return;
    const sessions = next.patient_demo_id === "P-DEMO-001" ? stageReportData.sessions.filter((session) => session.completed) : [];
    const selection = sessions.slice(-4).map((session) => session.id);
    setPatientId(nextId);
    setSelectedSessionIds(selection);
    setStageReport({ reportId: `STAGE-${nextId}-DRAFT`, patientId: nextId, selectedSessionIds: selection, generatedSummary: "", status: "draft" });
    const existing = reports.filter((item) => item.patientId === nextId).sort((a, b) => (b.episodeNo ?? 1) - (a.episodeNo ?? 1))[0];
    setReport(existing ?? createReport(next, assessments.filter((item) => item.patientId === nextId), followUps.filter((item) => item.patientId === nextId), followUpRecords, selection));
  }

  function toggleSession(sessionId: string) {
    setSelectedSessionIds((current) => current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]);
    setStageReport((current) => ({ ...current, generatedSummary: "", status: "draft" }));
  }

  function generateStageDraft() {
    if (selectedSessionIds.length < 2 || !patient) return;
    const selected = availableSessions.filter((session) => selectedSessionIds.includes(session.id));
    const averageHr = Math.round(selected.reduce((sum, item) => sum + item.avgHr, 0) / selected.length);
    const minimumSpo2 = Math.min(...selected.map((item) => item.minSpo2 ?? 100));
    const abnormalCount = selected.filter((item) => item.symptom !== "无明显不适" || item.pauses > 0 || item.terminatedEarly).length;
    setStageReport({ reportId: `STAGE-${patient.patient_demo_id}-${Date.now()}`, patientId: patient.patient_demo_id, selectedSessionIds: [...selectedSessionIds], generatedSummary: `已联合分析${selected.length}次训练：平均心率约${averageHr} bpm，最低血氧${minimumSpo2}%，记录${abnormalCount}次症状或暂停。以上为AI汇总草稿，需医生查看原始记录后确认。`, status: "pending_doctor_review" });
  }

  function confirmStageReport() {
    if (role !== "DOCTOR" || stageReport.status !== "pending_doctor_review") return;
    setStageReport((current) => ({ ...current, status: "confirmed", confirmedBy: currentAccount, confirmedAt: new Date().toISOString() }));
  }

  function saveDischarge(status: RehabReport["status"]) {
    if (!report || role !== "DOCTOR" || report.status === "published") return;
    const now = new Date().toISOString();
    const next = { ...report, sourceRefs: Array.from(new Set([...report.sourceRefs, ...selectedSessionIds])), status, confirmedBy: status !== "draft" ? currentAccount : report.confirmedBy, confirmedAt: status === "doctor_confirmed" ? now : report.confirmedAt, publishedAt: status === "published" ? now : report.publishedAt };
    setReport(next);
    onSave(next);
  }

  if (!patient || !report) return <section className="card p-8 text-center">暂无可用患者</section>;
  const missingMedical = Object.values(report.medicalSection).some((value) => !value.trim());
  const selectedSessions = availableSessions.filter((session) => selectedSessionIds.includes(session.id));

  return <section data-testid="page-VIEW-REHAB-DISCHARGE-REPORT">
    <PageHeader eyebrow="康复报告中心" title="阶段报告与出院康复手册" description="阶段报告来自医生明确选择的训练记录；出院报告发布后才同步患者手册并触发随访。" action={<StatusBadge tone="blue"><FileText className="h-3.5 w-3.5" />正式处方仍在HIS/纸质流程</StatusBadge>} />
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">患者<select value={patient.patient_demo_id} onChange={(event) => switchPatient(event.target.value)} className="text-field min-w-64">{scopedPatients.map((item) => <option key={item.patient_demo_id} value={item.patient_demo_id}>{item.name} · {item.patient_code}</option>)}</select></label>
      <div className="ml-auto flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setSheet("stage")} className={`rounded-lg px-5 py-2 text-xs font-bold ${sheet === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段报告</button><button type="button" onClick={() => setSheet("discharge")} className={`rounded-lg px-5 py-2 text-xs font-bold ${sheet === "discharge" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>出院报告 / 康复手册</button></div>
    </div>
    {sheet === "stage" ? <StageSheet sessions={availableSessions} selectedIds={selectedSessionIds} report={stageReport} role={role} onToggle={toggleSession} onGenerate={generateStageDraft} onConfirm={confirmStageReport} /> : <DischargeSheet report={report} setReport={setReport} role={role} missingMedical={missingMedical} onSave={saveDischarge} selectedSessionCount={selectedSessions.length} />}
  </section>;
}

function StageSheet({ sessions, selectedIds, report, role, onToggle, onGenerate, onConfirm }: { sessions: typeof stageReportData.sessions; selectedIds: string[]; report: StageReport; role: ReportRole; onToggle: (id: string) => void; onGenerate: () => void; onConfirm: () => void }) {
  const selected = sessions.filter((session) => selectedIds.includes(session.id));
  return <div className="space-y-4">
    <section className="card p-5"><SectionHeader title="选择联合分析的训练记录" description="默认最近4次；可勾选任意已完成记录，报告保存具体训练ID而不是只保存次数。" action={<StatusBadge tone={selectedIds.length >= 2 ? "blue" : "orange"}>已选 {selectedIds.length} 次</StatusBadge>} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{sessions.map((session, index) => <label key={session.id} className={`cursor-pointer rounded-xl border p-4 ${selectedIds.includes(session.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><input type="checkbox" checked={selectedIds.includes(session.id)} onChange={() => onToggle(session.id)} /><span className="font-mono text-[9px] text-slate-400">{session.id}</span></div><p className="mt-3 text-xs font-bold text-slate-900">第{index + 1}次 · {session.date}</p><p className="mt-2 text-[10px] leading-5 text-slate-500">平均/峰值心率 {session.avgHr}/{session.peakHr} bpm<br />血氧最低 {session.minSpo2 ?? "未采集"}% · RPE {session.rpe}<br />训练前后血压 {session.preBp ?? "未采集"} → {session.postBp ?? "未采集"}</p></label>)}</div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={selectedIds.length < 2} onClick={onGenerate} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300"><Sparkles className="h-4 w-4" />生成AI阶段草稿</button>{role === "DOCTOR" && <button type="button" disabled={report.status !== "pending_doctor_review"} onClick={onConfirm} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300"><CheckCircle2 className="h-4 w-4" />医生确认</button>}</div>
    </section>
    <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="所选训练记录对比" description="血压为间歇测量点，不绘制连续曲线；缺失值不参与均值。" /></div><div className="grid grid-cols-8 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>日期</span><span>平均心率</span><span>峰值心率</span><span>血压测量点</span><span>最低/平均血氧</span><span>功率</span><span>RPE</span><span>完整率</span></div>{selected.map((session) => <div key={session.id} className="grid grid-cols-8 items-center border-t border-slate-100 px-5 py-3 text-xs"><span>{session.date}</span><b>{session.avgHr} bpm</b><span>{session.peakHr} bpm</span><span>{session.preBp ?? "未采集"} → {session.postBp ?? "未采集"}</span><span>{session.minSpo2 ?? "未采集"}% / {session.avgSpo2 ?? "未采集"}%</span><span>{session.avgPower}/{session.peakPower} W</span><span>{session.rpe}</span><span>{session.dataCompleteness}%</span></div>)}</section>
    <section className={`card p-5 ${report.status === "confirmed" ? "border-emerald-200 bg-emerald-50" : ""}`}><SectionHeader title="阶段摘要" action={<StatusBadge tone={report.status === "confirmed" ? "green" : report.status === "pending_doctor_review" ? "orange" : "gray"}>{report.status === "confirmed" ? "医生已确认" : report.status === "pending_doctor_review" ? "待医生确认" : "尚未生成"}</StatusBadge>} /><p className="mt-3 text-sm leading-7 text-slate-700">{report.generatedSummary || "选择至少2次训练记录后生成草稿。AI不诊断、不调方，所有结论均需医生核对来源。"}</p>{report.confirmedBy && <p className="mt-3 text-xs font-bold text-emerald-700">{report.confirmedBy} · {report.confirmedAt}</p>}</section>
  </div>;
}

function DischargeSheet({ report, setReport, role, missingMedical, onSave, selectedSessionCount }: { report: RehabReport; setReport: (report: RehabReport) => void; role: ReportRole; missingMedical: boolean; onSave: (status: RehabReport["status"]) => void; selectedSessionCount: number }) {
  const disabled = role !== "DOCTOR" || report.status === "published";
  const fields: [keyof RehabReport["medicalSection"], string][] = [["diagnosis", "诊断摘要"], ["treatmentCourse", "治疗经过"], ["procedure", "手术/介入情况"], ["medications", "用药及注意事项"], ["followUpRequirements", "复查与随访要求"], ["clinicalConclusion", "医生结论"]];
  return <div className="space-y-4">
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-emerald-700">患者康复旅程</p><h2 className="mt-1 text-lg font-bold text-slate-950">网页预览可动画化，打印/PDF保持静态医疗文书</h2></div><StatusBadge tone={report.status === "published" ? "green" : report.status === "doctor_confirmed" ? "blue" : "orange"}>{report.status === "published" ? "已发布给患者" : report.status === "doctor_confirmed" ? "医生已确认" : "草稿"}</StatusBadge></div><div className="mt-4 grid grid-cols-4 gap-3">{[["纳入训练", `${selectedSessionCount}次`], ["数据来源", `${report.sourceRefs.length}条`], ["康复周期", `第${report.episodeNo ?? 1}周期`], ["患者手册", report.status === "published" ? "已同步" : "未发布"]].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-3 shadow-sm"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-emerald-800">{value}</p></div>)}</div></section>
    <div className="grid gap-4 xl:grid-cols-3"><section className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><SectionHeader title="医生治疗信息" description="仅用于出院总结，不在本系统开具正式医嘱。" />{fields.map(([key, label]) => <label key={key} className="mt-3 block"><span className="field-label">{label}</span><textarea disabled={disabled} value={report.medicalSection[key]} onChange={(event) => setReport({ ...report, medicalSection: { ...report.medicalSection, [key]: event.target.value } })} className="text-field min-h-16 py-2 disabled:bg-slate-50" /></label>)}</section><section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><SectionHeader title="系统康复数据" description="只汇总已确认来源。" />{Object.values(report.rehabSection).map((value, index) => <p key={index} className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">{value}</p>)}</section><section className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><SectionHeader title="患者可读建议" description="医生确认发布后同步到我的康复手册。" /><textarea disabled={disabled} value={report.recommendationDraft} onChange={(event) => setReport({ ...report, recommendationDraft: event.target.value })} className="text-field min-h-[310px] bg-white py-3 disabled:bg-slate-50" /><p className="mt-3 text-[10px] leading-5 text-violet-800">包含居家运动、饮食、用药提醒、停止条件和复查计划。</p></section></div>
    <section className="card p-4"><SectionHeader title="发布检查" description="医生信息、数据来源和医生确认全部满足后才允许发布。" /><div className="mt-3 grid gap-2 sm:grid-cols-3"><CheckItem label="医生治疗部分完整" ok={!missingMedical} /><CheckItem label="已关联训练与评估来源" ok={report.sourceRefs.length > 0} /><CheckItem label="医生已确认" ok={report.status === "doctor_confirmed" || report.status === "published"} /></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" />打印/PDF预览</button>{role === "DOCTOR" && report.status !== "published" && <><button type="button" onClick={() => onSave("draft")} className="btn-secondary"><Save className="h-4 w-4" />保存草稿</button><button type="button" disabled={missingMedical} onClick={() => onSave("doctor_confirmed")} className="btn-primary disabled:bg-slate-300"><CheckCircle2 className="h-4 w-4" />医生确认</button><button type="button" disabled={missingMedical || report.status !== "doctor_confirmed"} onClick={() => onSave("published")} className="btn-primary disabled:bg-slate-300"><Send className="h-4 w-4" />发布并生成康复手册</button></>}</div></section>
  </div>;
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) { return <div className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span>{ok ? "✓" : "·"}</span><b>{label}</b></div>; }
