import { useMemo, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, FileImage, Files, PenLine, Printer, Save, ScanLine, X } from "lucide-react";
import { calculateSppb, createBlankSppb, hasSppbInput, normalizeAssessmentRecord, type AssessmentRecord } from "../assessmentData";
import { canActAs } from "../accessControl";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { StaffRole } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";

type Mode = "batch_ocr" | "single_ocr" | "manual";

export function AssessmentWorkspacePage({ role, currentAccount, patients, records, initialPatientId, initialRecordId, backLabel = "返回患者档案", onSave, onBack }: {
  role: StaffRole;
  currentAccount: string;
  patients: ManagedPatient[];
  records: AssessmentRecord[];
  initialPatientId?: string | null;
  initialRecordId?: string | null;
  backLabel?: string;
  onSave: (record: AssessmentRecord) => void;
  onBack: () => void;
}) {
  const patient = patients.find((item) => item.patient_demo_id === initialPatientId) ?? patients[0];
  const patientRecords = useMemo(() => records.filter((item) => item.patientId === patient.patient_demo_id).sort((a, b) => String(b.assessedAt ?? "").localeCompare(String(a.assessedAt ?? ""))), [patient.patient_demo_id, records]);
  const initialRecord = patientRecords.find((item) => item.assessmentId === initialRecordId);
  const [mode, setMode] = useState<Mode>(initialRecord?.source === "ocr_batch" ? "batch_ocr" : initialRecord?.source === "ocr_single" ? "single_ocr" : "manual");
  const [draft, setDraft] = useState<AssessmentRecord>(() => normalizeAssessmentRecord(initialRecord ?? {}, createBlankSppb(patient, patientRecords.length + 1, currentAccount)));
  const [ruleOpen, setRuleOpen] = useState(false);
  const [message, setMessage] = useState("");
  const canEnterAssessment = canActAs(role, "REHAB_EXECUTION");
  const disabled = !canEnterAssessment || draft.status === "completed";

  function selectMode(next: Mode) {
    setMode(next);
    if (next === "manual") {
      setDraft(createBlankSppb(patient, patientRecords.length + 1, currentAccount));
      setMessage("已打开空白表格，可直接录入。");
    }
  }

  function simulateOcr(files: File[]) {
    if (!files.length || !canEnterAssessment) return;
    const base = createBlankSppb(patient, patientRecords.length + 1, currentAccount);
    const scored = calculateSppb({
      balance: { sideBySideSec: 10, semiTandemSec: 10, tandemSec: 8.2, score: 0 },
      walk4m: { trial1Sec: 6.4, trial2Sec: 6.1, fastestSec: null, score: 0 },
      chairStand: { trial1Sec: 14.2, trial2Sec: 13.8, fastestSec: null, score: 0 },
      maxWalkingSpeedMs: { trial1: 0.62, trial2: 0.66, fastest: 0.66 }
    });
    setDraft({ ...base, source: mode === "batch_ocr" ? "ocr_batch" : "ocr_single", sourceNote: `OCR草稿：${files.map((file) => file.name).join("、")}`, ocrConfidence: 86, preVitals: { bloodPressure: "128/78", pulse: 72 }, postVitals: { bloodPressure: "136/82", pulse: 88 }, sppb: { ...base.sppb, ...scored } });
    setMessage(`已识别 ${files.length} 份资料。黄色字段为低置信度示意，请逐项核对。`);
  }

  function save(status: AssessmentRecord["status"]) {
    if (!canEnterAssessment) return;
    const scored = calculateSppb(draft.sppb);
    const now = new Date().toISOString();
    const next: AssessmentRecord = { ...draft, sppb: { ...draft.sppb, ...scored }, status, therapist: currentAccount, enteredBy: currentAccount, completedAt: status === "completed" ? now : undefined };
    onSave(next);
    setDraft(next);
    setMessage(status === "completed" ? "评估已完成并锁定。" : "草稿已保存。" );
  }

  return <section data-testid="page-VIEW-ASSESSMENTS" className="assessment-workspace">
    <PageHeader eyebrow={backLabel === "返回患者档案" ? "患者档案 · 体能评估" : "处方管理 · 相关报告"} title={`${patient.name} · SPPB体能评估`} description="三种录入方式共用同一张表；OCR只辅助填充，最终结果由康复师核对。" action={<div className="flex gap-2"><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />{backLabel}</button><button type="button" onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" />打印</button></div>} />
    <div className="grid gap-4 2xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="card p-4">
          <SectionHeader title="选择录入方式" description="当前患者已锁定" />
          <div className="rounded-xl bg-blue-50 p-3 text-xs"><b>{patient.name}</b><p className="mt-1 text-slate-500">{patient.patient_no} · {patient.gender} · {patient.age}岁</p></div>
          <div className="mt-3 space-y-2">
            <ModeButton active={mode === "batch_ocr"} icon={Files} title="批量OCR" note="同一患者多份报告" onClick={() => selectMode("batch_ocr")} />
            <ModeButton active={mode === "single_ocr"} icon={ScanLine} title="单张OCR" note="一张图片或PDF" onClick={() => selectMode("single_ocr")} />
            <ModeButton active={mode === "manual"} icon={PenLine} title="手工录入" note="打开空白评估表" onClick={() => selectMode("manual")} />
          </div>
          {mode !== "manual" && <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-3 text-xs font-bold text-violet-800"><FileImage className="h-4 w-4" />{mode === "batch_ocr" ? "选择多份文件" : "选择一份文件"}<input className="sr-only" type="file" multiple={mode === "batch_ocr"} accept="image/*,.pdf" disabled={!canEnterAssessment} onChange={(event) => simulateOcr(Array.from(event.target.files ?? []))} /></label>}
          {message && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">{message}</p>}
        </section>
        <section className="card p-4"><SectionHeader title="历史评估" />
          <div className="space-y-2">{patientRecords.map((record) => <button key={record.assessmentId} type="button" onClick={() => setDraft(normalizeAssessmentRecord(record, createBlankSppb(patient, record.attemptNo || 1, currentAccount)))} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300"><div className="flex justify-between"><b className="text-xs">第{record.attemptNo || 1}次 SPPB</b><StatusBadge tone={record.status === "completed" ? "green" : "gray"}>{record.status === "completed" ? "已完成" : "草稿"}</StatusBadge></div><p className="mt-1 text-[10px] text-slate-500">{String(record.assessedAt ?? "").slice(0, 10) || "未提供日期"} · {record.sppb && hasSppbInput(record.sppb) ? `${record.sppb.totalScore}/12分` : "未采集"}</p></button>)}</div>
        </section>
      </aside>
      <AssessmentForm draft={draft} disabled={disabled} onChange={setDraft} onSave={save} ruleOpen={ruleOpen} setRuleOpen={setRuleOpen} />
    </div>
  </section>;
}

function AssessmentForm({ draft, disabled, onChange, onSave, ruleOpen, setRuleOpen }: { draft: AssessmentRecord; disabled: boolean; onChange: (value: AssessmentRecord) => void; onSave: (status: AssessmentRecord["status"]) => void; ruleOpen: boolean; setRuleOpen: (value: boolean) => void }) {
  const calculated = calculateSppb(draft.sppb);
  const setSppb = (next: Partial<AssessmentRecord["sppb"]>) => onChange({ ...draft, sppb: { ...draft.sppb, ...next } });
  const num = (label: string, value: number | null, update: (value: number | null) => void) => (
    <input
      aria-label={label}
      disabled={disabled}
      type="number"
      step="0.01"
      value={value ?? ""}
      onChange={(event) => update(event.target.value === "" ? null : Number(event.target.value))}
      className="assessment-cell"
      placeholder="—"
    />
  );
  const assessmentDate = draft.assessedAt.slice(0, 10);
  const assessmentTime = draft.assessedAt.includes("T") ? draft.assessedAt.slice(11, 16) : "";
  const setAssessmentDateTime = (date: string, time: string) => {
    onChange({ ...draft, assessedAt: `${date || assessmentDate}T${time || assessmentTime || "00:00"}:00+08:00` });
  };
  const tableHeader = "border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700";
  const tableCell = "border border-slate-300 px-2 py-2 text-xs text-slate-600";
  return <section className="card overflow-hidden print:shadow-none" data-testid="region-REG-SPPB-PAPER">
    <div className="flex items-center justify-between border-b border-slate-100 p-5 print:hidden">
      <div><p className="text-[10px] font-bold text-blue-600">体能测试（SPPB）记录表</p><h2 className="mt-1 text-lg font-bold">第{draft.attemptNo}次评估</h2></div>
      <div className="flex gap-2"><button type="button" onClick={() => setRuleOpen(!ruleOpen)} className="btn-secondary"><Calculator className="h-4 w-4" />评分依据</button>{draft.ocrConfidence && <StatusBadge tone="orange">OCR {draft.ocrConfidence}% · 待核对</StatusBadge>}</div>
    </div>
    <div className="overflow-x-auto bg-white p-5 print:p-0">
      <div className="mx-auto min-w-[880px] max-w-5xl border border-slate-300 bg-white p-7 text-slate-800 print:min-w-0 print:border-0">
        <header className="mb-7 text-center font-serif">
          <p className="text-lg">北京市丰台康复医院</p>
          <h2 className="mt-3 text-2xl font-semibold">体能测试（SPPB）记录表</h2>
        </header>

        <div className="grid grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <PaperStatic label="姓名" value={draft.patientSnapshot.name} />
          <PaperStatic label="性别" value={draft.patientSnapshot.gender} />
          <PaperStatic label="年龄" value={`${draft.patientSnapshot.age}`} />
          <PaperStatic label="病案号" value={draft.patientSnapshot.hospitalPatientNo} />
          <label className="col-span-4 flex items-center gap-3"><span className="shrink-0">诊断：</span><input aria-label="诊断" disabled={disabled} value={draft.patientSnapshot.diagnosis} onChange={(event) => onChange({ ...draft, patientSnapshot: { ...draft.patientSnapshot, diagnosis: event.target.value } })} className="w-full border-0 border-b border-slate-400 bg-transparent px-1 py-1 outline-none" /></label>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
          <label><span className="field-label">第几次评估</span><input aria-label="第几次评估" disabled={disabled} min="1" type="number" value={draft.attemptNo} onChange={(event) => onChange({ ...draft, attemptNo: Math.max(1, Number(event.target.value) || 1) })} className="assessment-cell" /></label>
          <label><span className="field-label">体重（kg）</span><input aria-label="体重（kg）" disabled={disabled} type="number" step="0.1" value={draft.weightKg ?? ""} onChange={(event) => onChange({ ...draft, weightKg: event.target.value === "" ? null : Number(event.target.value) })} className="assessment-cell" /></label>
          <label><span className="field-label">日期</span><input aria-label="日期" disabled={disabled} type="date" value={assessmentDate} onChange={(event) => setAssessmentDateTime(event.target.value, assessmentTime)} className="assessment-cell" /></label>
          <label><span className="field-label">时间</span><input aria-label="时间" disabled={disabled} type="time" value={assessmentTime} onChange={(event) => setAssessmentDateTime(assessmentDate, event.target.value)} className="assessment-cell" /></label>
        </div>

        <table className="mt-5 w-full table-fixed border-collapse">
          <tbody>
            <tr>
              <th colSpan={2} className={tableHeader}>血压（mmHg）</th><th className={tableHeader}>前</th>
              <td colSpan={2} className={tableCell}><input aria-label="评估前血压" disabled={disabled} value={draft.preVitals.bloodPressure} onChange={(event) => onChange({ ...draft, preVitals: { ...draft.preVitals, bloodPressure: event.target.value } })} className="assessment-cell" placeholder="收缩压/舒张压" /></td>
              <th className={tableHeader}>后</th><td className={tableCell}><input aria-label="评估后血压" disabled={disabled} value={draft.postVitals.bloodPressure} onChange={(event) => onChange({ ...draft, postVitals: { ...draft.postVitals, bloodPressure: event.target.value } })} className="assessment-cell" placeholder="收缩压/舒张压" /></td>
              <th className={tableHeader}>得分</th>
            </tr>
            <tr>
              <th colSpan={2} className={tableHeader}>脉搏（次/分）</th><th className={tableHeader}>前</th>
              <td colSpan={2} className={tableCell}>{num("评估前脉搏", draft.preVitals.pulse, (value) => onChange({ ...draft, preVitals: { ...draft.preVitals, pulse: value } }))}</td>
              <th className={tableHeader}>后</th><td className={tableCell}>{num("评估后脉搏", draft.postVitals.pulse, (value) => onChange({ ...draft, postVitals: { ...draft.postVitals, pulse: value } }))}</td>
              <td className={tableCell} />
            </tr>
            <tr>
              <th rowSpan={3} colSpan={2} className={tableHeader}>平衡测试（s）</th><th colSpan={2} className={tableHeader}>双脚合并站立</th>
              <td colSpan={3} className={tableCell}>{num("双脚合并站立秒数", draft.sppb.balance.sideBySideSec, (value) => setSppb({ balance: { ...draft.sppb.balance, sideBySideSec: value } }))}</td>
              <td rowSpan={3} className={tableCell}><Score value={calculated.balance.score} /></td>
            </tr>
            <tr><th colSpan={2} className={tableHeader}>半前后站立</th><td colSpan={3} className={tableCell}>{num("半前后站立秒数", draft.sppb.balance.semiTandemSec, (value) => setSppb({ balance: { ...draft.sppb.balance, semiTandemSec: value } }))}</td></tr>
            <tr><th colSpan={2} className={tableHeader}>双脚前后站立</th><td colSpan={3} className={tableCell}>{num("双脚前后站立秒数", draft.sppb.balance.tandemSec, (value) => setSppb({ balance: { ...draft.sppb.balance, tandemSec: value } }))}</td></tr>
            <MeasurementRow label="椅子坐立测试（s）" first={num("椅子坐立第1次", draft.sppb.chairStand.trial1Sec, (value) => setSppb({ chairStand: { ...draft.sppb.chairStand, trial1Sec: value } }))} second={num("椅子坐立第2次", draft.sppb.chairStand.trial2Sec, (value) => setSppb({ chairStand: { ...draft.sppb.chairStand, trial2Sec: value } }))} score={<Score value={calculated.chairStand.score} />} />
            <MeasurementRow label="4m步行（s）" first={num("4米步行第1次", draft.sppb.walk4m.trial1Sec, (value) => setSppb({ walk4m: { ...draft.sppb.walk4m, trial1Sec: value } }))} second={num("4米步行第2次", draft.sppb.walk4m.trial2Sec, (value) => setSppb({ walk4m: { ...draft.sppb.walk4m, trial2Sec: value } }))} score={<Score value={calculated.walk4m.score} />} />
            <MeasurementRow label="最大步行速度（m/s）" first={num("最大步行速度第1次", draft.sppb.maxWalkingSpeedMs.trial1, (value) => setSppb({ maxWalkingSpeedMs: { ...draft.sppb.maxWalkingSpeedMs, trial1: value } }))} second={num("最大步行速度第2次", draft.sppb.maxWalkingSpeedMs.trial2, (value) => setSppb({ maxWalkingSpeedMs: { ...draft.sppb.maxWalkingSpeedMs, trial2: value } }))} score={<Score value={calculated.totalScore} label="总分" />} />
            <tr>
              <th rowSpan={2} colSpan={2} className={tableHeader}>握力（kg）</th><th className={tableHeader}>左手</th><th className={tableHeader}>第1次</th><td className={tableCell}>{num("左手握力第1次", draft.sppb.grip.leftTrial1Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, leftTrial1Kg: value } }))}</td><th className={tableHeader}>第2次</th><td className={tableCell}>{num("左手握力第2次", draft.sppb.grip.leftTrial2Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, leftTrial2Kg: value } }))}</td><td rowSpan={2} className={tableCell} />
            </tr>
            <tr><th className={tableHeader}>右手</th><th className={tableHeader}>第1次</th><td className={tableCell}>{num("右手握力第1次", draft.sppb.grip.rightTrial1Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, rightTrial1Kg: value } }))}</td><th className={tableHeader}>第2次</th><td className={tableCell}>{num("右手握力第2次", draft.sppb.grip.rightTrial2Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, rightTrial2Kg: value } }))}</td></tr>
            <tr>
              <th colSpan={2} className={tableHeader}>可否步行100m</th>
              <td colSpan={2} className={tableCell}><select aria-label="可否步行100m" disabled={disabled} value={draft.sppb.canWalk100m} onChange={(event) => setSppb({ canWalk100m: event.target.value as AssessmentRecord["sppb"]["canWalk100m"] })} className="assessment-cell"><option value="unknown">未评估</option><option value="yes">可以</option><option value="no">不可以</option></select></td>
              <th className={tableHeader}>理由</th><td colSpan={3} className={tableCell}><input aria-label="不能步行100米原因" disabled={disabled || draft.sppb.canWalk100m !== "no"} value={draft.sppb.unableWalkReason} onChange={(event) => setSppb({ unableWalkReason: event.target.value })} className="assessment-cell" /></td>
            </tr>
            <tr>
              <th colSpan={2} className={tableHeader}>肌力分级</th><th className={tableHeader}>上肢</th>
              <td colSpan={2} className={tableCell}><MuscleStrengthSelect label="上肢肌力分级" value={draft.sppb.muscleStrength.upper} disabled={disabled} onChange={(upper) => setSppb({ muscleStrength: { ...draft.sppb.muscleStrength, upper } })} /></td>
              <th className={tableHeader}>下肢</th><td colSpan={2} className={tableCell}><MuscleStrengthSelect label="下肢肌力分级" value={draft.sppb.muscleStrength.lower} disabled={disabled} onChange={(lower) => setSppb({ muscleStrength: { ...draft.sppb.muscleStrength, lower } })} /></td>
            </tr>
            <tr><th colSpan={2} className={tableHeader}>备注</th><td colSpan={6} className={tableCell}><textarea aria-label="备注" disabled={disabled} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="assessment-cell min-h-24 resize-y" /></td></tr>
          </tbody>
        </table>

        <div className="mt-5 grid grid-cols-3 gap-5 text-sm">
          <label><span className="field-label">Dr</span><input aria-label="Dr" disabled={disabled} value={draft.doctor ?? ""} onChange={(event) => onChange({ ...draft, doctor: event.target.value })} className="assessment-cell" /></label>
          <label><span className="field-label">PT</span><input aria-label="PT" disabled={disabled} value={draft.therapist ?? ""} onChange={(event) => onChange({ ...draft, therapist: event.target.value })} className="assessment-cell" /></label>
          <label><span className="field-label">录入</span><input aria-label="录入" disabled value={draft.enteredBy} className="assessment-cell" /></label>
        </div>
      </div>
      {ruleOpen && <RulePanel onClose={() => setRuleOpen(false)} />}
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4 print:hidden"><p className="text-[10px] text-slate-500">缺失值保持为空，不按0参与判断。肌力分级按上肢、下肢分别记录。</p>{!disabled && <div className="flex gap-2"><button type="button" onClick={() => onSave("draft")} className="btn-secondary"><Save className="h-4 w-4" />保存草稿</button><button type="button" onClick={() => onSave("completed")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />完成评估</button></div>}</div>
  </section>;
}

function PaperStatic({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center gap-3"><span className="shrink-0">{label}：</span><span className="min-h-7 flex-1 border-b border-slate-400 px-1 py-1 font-semibold">{value || "未提供"}</span></div>;
}

function MeasurementRow({ label, first, second, score }: { label: string; first: React.ReactNode; second: React.ReactNode; score: React.ReactNode }) {
  const header = "border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700";
  const cell = "border border-slate-300 px-2 py-2 text-xs text-slate-600";
  return <tr><th colSpan={2} className={header}>{label}</th><th className={header}>第1次</th><td colSpan={2} className={cell}>{first}</td><th className={header}>第2次</th><td className={cell}>{second}</td><td className={cell}>{score}</td></tr>;
}

function MuscleStrengthSelect({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <select aria-label={label} data-field={label} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="assessment-cell"><option value="">未评估</option>{[0, 1, 2, 3, 4, 5].map((grade) => <option key={grade} value={`${grade}级`}>{grade}级</option>)}</select>;
}

function ModeButton({ active, icon: Icon, title, note, onClick }: { active: boolean; icon: typeof Files; title: string; note: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 hover:border-blue-200"}`}><Icon className="h-5 w-5" /><span><b className="block text-xs">{title}</b><span className="text-[10px] opacity-70">{note}</span></span></button>; }
function Score({ value, label = "得分" }: { value: number; label?: string }) { return <div className="rounded-lg bg-emerald-50 p-2 text-center font-bold text-emerald-700">{label} {value}</div>; }
function RulePanel({ onClose }: { onClose: () => void }) { const groups = [{title:"平衡测试",rows:[["双脚合并站立","≥10秒","1分"],["半前后站立","≥10秒","1分"],["双脚前后站立","≥10秒 / 3–9.99秒 / <3秒","2分 / 1分 / 0分"]]},{title:"4米步行",rows:[["最快用时","<4.82秒","4分"],["最快用时","4.82–6.20秒","3分"],["最快用时","6.21–8.70秒","2分"],["最快用时",">8.70秒","1分"],["完成情况","无法步行","0分"]]},{title:"椅子坐立",rows:[["完成用时","<11.19秒","4分"],["完成用时","11.20–13.69秒","3分"],["完成用时","13.70–16.69秒","2分"],["完成用时",">16.70秒","1分"],["完成情况",">60秒或不能完成","0分"]]}]; return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-6" onMouseDown={onClose}><section className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event)=>event.stopPropagation()}><header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4"><div><p className="text-[10px] font-bold text-amber-700">评分依据</p><h2 className="mt-1 text-xl font-bold">SPPB得分换算表</h2></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-6">{groups.map((group)=><section key={group.title} className="overflow-hidden rounded-xl border border-slate-200"><h3 className="bg-slate-50 px-4 py-3 text-sm font-bold">{group.title}</h3><div className="grid grid-cols-[1fr_1.4fr_0.6fr] bg-white px-4 py-2 text-[10px] font-bold text-slate-400"><span>项目</span><span>判定条件</span><span>得分</span></div>{group.rows.map((row,index)=><div key={`${group.title}-${index}`} className="grid grid-cols-[1fr_1.4fr_0.6fr] border-t border-slate-100 px-4 py-3 text-xs"><span>{row[0]}</span><span>{row[1]}</span><b>{row[2]}</b></div>)}</section>)}<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">演示换算规则，正式临床评分口径需由专业人员确认。缺失值保持为空，不按0参与换算。</p></div></section></div>; }
