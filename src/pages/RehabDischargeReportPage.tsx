import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Printer, Save, Send, Sparkles } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { AssessmentRecord } from "../assessmentData";
import type { RehabReport } from "../dischargeHandbookData";
import type { FollowUpRecord, FollowUpTask } from "../followUpData";
import { effectiveFollowUpStatus } from "../followUpData";
import type { PrescriptionTask } from "../prescriptionData";
import type { ManagedPatient } from "./PatientArchivePage";

type ReportRole = "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";

function createReport(patient: ManagedPatient, assessments: AssessmentRecord[], tasks: PrescriptionTask[], followUps: FollowUpTask[], followUpRecords: FollowUpRecord[]): RehabReport {
  const reviewed = assessments.filter((record) => record.status === "doctor_reviewed");
  const completedFollowUps = followUps.filter((task) => effectiveFollowUpStatus(task) === "completed").length;
  const patientTasks = tasks.filter((task) => task.patientId === patient.patient_demo_id);
  const patientRecords = followUpRecords.filter((record) => record.patientId === patient.patient_demo_id);
  const latest = reviewed[0];
  return {
    reportId: `CRH-RR-${patient.patient_demo_id}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    patientId: patient.patient_demo_id,
    generatedAt: new Date().toISOString(),
    status: "draft",
    medicalSection: { diagnosis: patient.diagnosis_summary, treatmentCourse: "", procedure: patient.procedure_history || "", medications: patient.current_medications || "", followUpRequirements: "", clinicalConclusion: "" },
    rehabSection: {
      assessmentSummary: latest ? `已复核 ${reviewed.length} 次 SPPB；最近一次总分 ${latest.sppb.totalScore}/12，测试日期 ${latest.assessedAt.slice(0, 10)}。` : "暂无已复核 SPPB 评估，待医生复核后汇总。",
      trainingSummary: patientTasks.length ? `已有 ${patientTasks.length} 条处方任务/训练依据记录，训练数据需以实际训练记录为准。` : "暂无训练记录。",
      adherenceSummary: patientRecords.length ? `最近随访：用药依从性${patientRecords.at(-1)?.medicationAdherence ?? "待确认"}，运动依从性${patientRecords.at(-1)?.exerciseAdherence ?? "待确认"}；训练频率${patientRecords.at(-1)?.trainingFrequency || "待记录"}，单次时长${patientRecords.at(-1)?.trainingDuration || "待记录"}。` : "待随访数据确认患者用药和运动执行情况。",
      followUpSummary: `当前 ${followUps.length} 个随访节点，已完成 ${completedFollowUps} 个。`,
      improvementSummary: "待补充基线与阶段末评估后形成改善趋势。"
    },
    recommendationDraft: "建议按医生确认的居家康复处方执行，继续记录训练时长、心率、血压和症状；出院后按 1/3/6 个月节点完成随访。若出现持续胸痛、晕厥或急诊/再住院，应及时联系医生或就医。",
    sourceRefs: [...reviewed.map((record) => record.assessmentId), ...patientTasks.map((task) => task.id), ...followUps.map((task) => task.id), ...patientRecords.map((record) => record.recordId)]
  };
}

export function RehabDischargeReportPage({ role, currentAccount, patients, assessments, tasks, followUps, followUpRecords, reports, onSave }: { role: ReportRole; currentAccount: string; patients: ManagedPatient[]; assessments: AssessmentRecord[]; tasks: PrescriptionTask[]; followUps: FollowUpTask[]; followUpRecords: FollowUpRecord[]; reports: RehabReport[]; onSave: (report: RehabReport) => void }) {
  const scopedPatients = role === "DOCTOR" ? patients.filter((patient) => patient.assigned_doctor === currentAccount) : patients;
  const [patientId, setPatientId] = useState(scopedPatients[0]?.patient_demo_id ?? "");
  const patient = scopedPatients.find((item) => item.patient_demo_id === patientId) ?? scopedPatients[0];
  const existing = reports.find((report) => report.patientId === patient?.patient_demo_id);
  const [report, setReport] = useState<RehabReport | null>(existing ?? (patient ? createReport(patient, assessments, tasks, followUps.filter((task) => task.patientId === patient.patient_demo_id), followUpRecords) : null));
  const readOnly = role !== "DOCTOR" || report?.status === "published";
  const patientFollowUps = useMemo(() => followUps.filter((task) => task.patientId === patient?.patient_demo_id), [followUps, patient?.patient_demo_id]);

  function switchPatient(nextId: string) {
    const nextPatient = scopedPatients.find((item) => item.patient_demo_id === nextId);
    if (!nextPatient) return;
    setPatientId(nextId);
    setReport(reports.find((item) => item.patientId === nextId) ?? createReport(nextPatient, assessments.filter((item) => item.patientId === nextId), tasks, followUps.filter((item) => item.patientId === nextId), followUpRecords));
  }

  function save(status: RehabReport["status"]) {
    if (!report || readOnly || !patient) return;
    const now = new Date().toISOString();
    const next = { ...report, status, confirmedBy: status === "doctor_confirmed" || status === "published" ? currentAccount : report.confirmedBy, confirmedAt: status === "doctor_confirmed" ? now : report.confirmedAt, publishedAt: status === "published" ? now : report.publishedAt };
    setReport(next);
    onSave(next);
  }

  if (!patient || !report) return <section className="card p-8 text-center">暂无可用患者</section>;
  const missingMedical = Object.values(report.medicalSection).some((value) => !value.trim());
  return <section data-testid="page-VIEW-REHAB-DISCHARGE-REPORT"><PageHeader eyebrow="康复报告中心" title="康复出院报告" description="医生填写治疗部分，系统汇总已确认康复数据，后续建议仅生成草稿；医生确认后才能发布给患者。网页预览使用轻量动画，打印/PDF保持静态医疗文书格式。" action={<StatusBadge tone={report.status === "published" ? "green" : report.status === "doctor_confirmed" ? "blue" : "orange"}>{report.status === "published" ? "已发布" : report.status === "doctor_confirmed" ? "医生已确认" : "草稿"}</StatusBadge>} /><div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><label className="flex items-center gap-2 text-xs font-bold text-slate-600">患者<select value={patient.patient_demo_id} onChange={(event) => switchPatient(event.target.value)} className="text-field min-w-64"><option value="">选择患者</option>{scopedPatients.map((item) => <option key={item.patient_demo_id} value={item.patient_demo_id}>{item.name} · {item.patient_code}</option>)}</select></label><span className="text-[10px] text-slate-400">数据来源 {report.sourceRefs.length} 条 · {patientFollowUps.length} 个随访节点</span></div><ReportJourney report={report} /><div className="grid gap-4 xl:grid-cols-3"><MedicalSection report={report} disabled={readOnly} onChange={(medicalSection) => setReport({ ...report, medicalSection })} /><RehabSection report={report} /><RecommendationSection report={report} disabled={readOnly} onChange={(recommendationDraft) => setReport({ ...report, recommendationDraft })} /></div><section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><SectionHeader title="发布检查" description="医生治疗部分和康复数据确认完成后，才允许发布。" /><div className="grid gap-2 text-xs sm:grid-cols-3"><CheckItem label="医生治疗部分完整" ok={!missingMedical} /><CheckItem label="康复数据有来源" ok={report.sourceRefs.length > 0} /><CheckItem label="医生已确认" ok={report.status === "doctor_confirmed" || report.status === "published"} /></div>{missingMedical && <p className="mt-3 text-xs font-semibold text-amber-700">请先补充医生治疗部分的所有字段。</p>}</section><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" />打印预览</button>{role === "DOCTOR" && report.status !== "published" && <><button type="button" onClick={() => save("draft")} className="btn-secondary"><Save className="h-4 w-4" />保存草稿</button><button type="button" onClick={() => save("doctor_confirmed")} disabled={missingMedical} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300"><CheckCircle2 className="h-4 w-4" />确认报告</button><button type="button" onClick={() => save("published")} disabled={missingMedical || report.status !== "doctor_confirmed"} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300"><Send className="h-4 w-4" />发布给患者</button></>}</div></section>;
}

function ReportJourney({ report }: { report: RehabReport }) {
  const stages = ["入院治疗", "基线评估", "处方训练", "阶段复盘", "出院建议"];
  const completed = report.status === "published" ? 5 : report.status === "doctor_confirmed" ? 4 : 3;
  return <section className="report-journey mb-4 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-wide text-emerald-700">康复旅程预览</p><h2 className="mt-1 text-lg font-bold text-slate-950">把复杂数据变成患者看得懂的成长记录</h2></div><div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm"><p className="text-[9px] text-slate-400">报告完成度</p><p className="mt-1 text-2xl font-bold text-emerald-700">{completed * 20}%</p></div></div><div className="mt-5 flex items-center">{stages.map((stage, index) => <div className="flex flex-1 items-center" key={stage}><div className={`report-stage ${index < completed ? "is-complete" : ""}`}><span>{index < completed ? "✓" : index + 1}</span><b>{stage}</b></div>{index < stages.length - 1 && <div className={`report-line ${index < completed - 1 ? "is-complete" : ""}`} />}</div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="report-stat"><span>已确认数据</span><b>{report.sourceRefs.length} 条</b></div><div className="report-stat"><span>患者可读建议</span><b>{report.recommendationDraft ? "已生成草稿" : "待补充"}</b></div><div className="report-stat"><span>发布状态</span><b>{report.status === "published" ? "患者可见" : "医生确认后可见"}</b></div></div></section>;
}

function MedicalSection({ report, disabled, onChange }: { report: RehabReport; disabled: boolean; onChange: (value: RehabReport["medicalSection"]) => void }) {
  const field = (key: keyof RehabReport["medicalSection"], label: string, area = true) => <label key={key}><span className="field-label">{label}（医生填写）</span>{area ? <textarea disabled={disabled} value={report.medicalSection[key]} onChange={(event) => onChange({ ...report.medicalSection, [key]: event.target.value })} className="text-field min-h-16 py-2 disabled:bg-slate-50" /> : <input disabled={disabled} value={report.medicalSection[key]} onChange={(event) => onChange({ ...report.medicalSection, [key]: event.target.value })} className="text-field disabled:bg-slate-50" />}</label>;
  return <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><SectionHeader title="医生治疗部分" description="没有 HIS 数据，以下信息由医生手工填写或确认。" />{(["diagnosis", "treatmentCourse", "procedure", "medications", "followUpRequirements", "clinicalConclusion"] as const).map((key) => field(key, { diagnosis: "入院诊断", treatmentCourse: "住院治疗经过", procedure: "手术/介入情况", medications: "药物及注意事项", followUpRequirements: "医学复诊要求", clinicalConclusion: "临床结论" }[key]))}</section>;
}

function RehabSection({ report }: { report: RehabReport }) {
  return <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><SectionHeader title="系统康复部分" description="仅汇总已确认的评估、训练和随访数据。" /><div className="space-y-3">{Object.entries(report.rehabSection).map(([key, value]) => <div key={key} className="rounded-xl border border-emerald-100 bg-white p-3"><p className="text-[10px] font-bold text-emerald-700">{{ assessmentSummary: "评估结果", trainingSummary: "训练数据", adherenceSummary: "依从性", followUpSummary: "随访", improvementSummary: "改善趋势" }[key as keyof RehabReport["rehabSection"]]}</p><p className="mt-1 text-xs leading-5 text-slate-700">{value}</p></div>)}</div><p className="mt-3 text-[10px] text-emerald-800">来源记录：{report.sourceRefs.length ? report.sourceRefs.join("、") : "暂无"}</p></section>;
}

function RecommendationSection({ report, disabled, onChange }: { report: RehabReport; disabled: boolean; onChange: (value: string) => void }) {
  return <section className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><SectionHeader title="后续建议草稿" description="AI/规则只生成草稿，医生可以修改，确认后才可发布。" action={<StatusBadge tone="blue"><Sparkles className="h-3.5 w-3.5" />草稿</StatusBadge>} /><textarea disabled={disabled} value={report.recommendationDraft} onChange={(event) => onChange(event.target.value)} className="text-field min-h-[260px] bg-white py-3 disabled:bg-slate-50" /><p className="mt-3 text-[10px] leading-5 text-violet-800">不自动诊断、不自动调方；持续胸痛、晕厥、急诊/再住院等情况必须按医院流程处理。</p></section>;
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) { return <div className={`flex items-center gap-2 rounded-lg border p-3 ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span>{ok ? "✓" : "·"}</span><b>{label}</b></div>; }
