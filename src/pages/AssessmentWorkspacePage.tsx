import { useMemo, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, FileImage, Files, PenLine, Printer, Save, ScanLine, X } from "lucide-react";
import { calculateSppb, createBlankSppb, hasSppbInput, type AssessmentRecord } from "../assessmentData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { StaffRole } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";

type Mode = "batch_ocr" | "single_ocr" | "manual";

export function AssessmentWorkspacePage({ role, currentAccount, patients, records, initialPatientId, initialRecordId, onSave, onBack }: {
  role: StaffRole;
  currentAccount: string;
  patients: ManagedPatient[];
  records: AssessmentRecord[];
  initialPatientId?: string | null;
  initialRecordId?: string | null;
  onSave: (record: AssessmentRecord) => void;
  onBack: () => void;
}) {
  const patient = patients.find((item) => item.patient_demo_id === initialPatientId) ?? patients[0];
  const patientRecords = useMemo(() => records.filter((item) => item.patientId === patient.patient_demo_id).sort((a, b) => b.assessedAt.localeCompare(a.assessedAt)), [patient.patient_demo_id, records]);
  const initialRecord = patientRecords.find((item) => item.assessmentId === initialRecordId);
  const [mode, setMode] = useState<Mode>(initialRecord?.source === "ocr_batch" ? "batch_ocr" : initialRecord?.source === "ocr_single" ? "single_ocr" : "manual");
  const [draft, setDraft] = useState<AssessmentRecord>(() => cloneRecord(initialRecord ?? createBlankSppb(patient, patientRecords.length + 1, currentAccount)));
  const [ruleOpen, setRuleOpen] = useState(false);
  const [message, setMessage] = useState("");
  const disabled = role === "DOCTOR" || draft.status === "completed";

  function selectMode(next: Mode) {
    setMode(next);
    if (next === "manual") {
      setDraft(createBlankSppb(patient, patientRecords.length + 1, currentAccount));
      setMessage("已打开空白表格，可直接录入。");
    }
  }

  function simulateOcr(files: File[]) {
    if (!files.length || role === "DOCTOR") return;
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
    if (role === "DOCTOR") return;
    const scored = calculateSppb(draft.sppb);
    const now = new Date().toISOString();
    const next: AssessmentRecord = { ...draft, sppb: { ...draft.sppb, ...scored }, status, therapist: currentAccount, enteredBy: currentAccount, completedAt: status === "completed" ? now : undefined };
    onSave(next);
    setDraft(next);
    setMessage(status === "completed" ? "评估已完成并锁定。" : "草稿已保存。" );
  }

  return <section data-testid="page-VIEW-ASSESSMENTS">
    <PageHeader eyebrow="患者档案 · 体能评估" title={`${patient.name} · SPPB体能评估`} description="三种录入方式共用同一张表；OCR只辅助填充，最终结果由康复师核对。" action={<div className="flex gap-2"><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />返回患者档案</button><button type="button" onClick={() => window.print()} className="btn-secondary"><Printer className="h-4 w-4" />打印</button></div>} />
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <section className="card p-4">
          <SectionHeader title="选择录入方式" description="当前患者已锁定" />
          <div className="rounded-xl bg-blue-50 p-3 text-xs"><b>{patient.name}</b><p className="mt-1 text-slate-500">{patient.patient_no} · {patient.gender} · {patient.age}岁</p></div>
          <div className="mt-3 space-y-2">
            <ModeButton active={mode === "batch_ocr"} icon={Files} title="批量OCR" note="同一患者多份报告" onClick={() => selectMode("batch_ocr")} />
            <ModeButton active={mode === "single_ocr"} icon={ScanLine} title="单张OCR" note="一张图片或PDF" onClick={() => selectMode("single_ocr")} />
            <ModeButton active={mode === "manual"} icon={PenLine} title="手工录入" note="打开空白评估表" onClick={() => selectMode("manual")} />
          </div>
          {mode !== "manual" && <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-3 text-xs font-bold text-violet-800"><FileImage className="h-4 w-4" />{mode === "batch_ocr" ? "选择多份文件" : "选择一份文件"}<input className="sr-only" type="file" multiple={mode === "batch_ocr"} accept="image/*,.pdf" disabled={role === "DOCTOR"} onChange={(event) => simulateOcr(Array.from(event.target.files ?? []))} /></label>}
          {message && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">{message}</p>}
        </section>
        <section className="card p-4"><SectionHeader title="历史评估" />
          <div className="space-y-2">{patientRecords.map((record) => <button key={record.assessmentId} type="button" onClick={() => setDraft(cloneRecord(record))} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300"><div className="flex justify-between"><b className="text-xs">第{record.attemptNo}次 SPPB</b><StatusBadge tone={record.status === "completed" ? "green" : "gray"}>{record.status === "completed" ? "已完成" : "草稿"}</StatusBadge></div><p className="mt-1 text-[10px] text-slate-500">{record.assessedAt.slice(0, 10)} · {hasSppbInput(record.sppb) ? `${record.sppb.totalScore}/12分` : "未采集"}</p></button>)}</div>
        </section>
      </aside>
      <AssessmentForm draft={draft} disabled={disabled} onChange={setDraft} onSave={save} ruleOpen={ruleOpen} setRuleOpen={setRuleOpen} />
    </div>
  </section>;
}

function AssessmentForm({ draft, disabled, onChange, onSave, ruleOpen, setRuleOpen }: { draft: AssessmentRecord; disabled: boolean; onChange: (value: AssessmentRecord) => void; onSave: (status: AssessmentRecord["status"]) => void; ruleOpen: boolean; setRuleOpen: (value: boolean) => void }) {
  const calculated = calculateSppb(draft.sppb);
  const setSppb = (next: Partial<AssessmentRecord["sppb"]>) => onChange({ ...draft, sppb: { ...draft.sppb, ...next } });
  const num = (value: number | null, update: (value: number | null) => void) => <input disabled={disabled} type="number" step="0.01" value={value ?? ""} onChange={(event) => update(event.target.value === "" ? null : Number(event.target.value))} className="assessment-cell" placeholder="—" />;
  return <section className="card overflow-hidden print:shadow-none">
    <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-[10px] font-bold text-blue-600">体能测试（SPPB）记录表</p><h2 className="mt-1 text-lg font-bold">第{draft.attemptNo}次评估</h2></div><div className="flex gap-2"><button type="button" onClick={() => setRuleOpen(!ruleOpen)} className="btn-secondary"><Calculator className="h-4 w-4" />评分依据</button>{draft.ocrConfidence && <StatusBadge tone="orange">OCR {draft.ocrConfidence}% · 待核对</StatusBadge>}</div></div>
    <div className="p-5">
      <div className="grid grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4"><Static label="姓名" value={draft.patientSnapshot.name} /><Static label="性别/年龄" value={`${draft.patientSnapshot.gender} / ${draft.patientSnapshot.age}岁`} /><Static label="患者编号" value={draft.patientSnapshot.hospitalPatientNo} /><Field label="诊断" value={draft.patientSnapshot.diagnosis} disabled={disabled} onChange={(value) => onChange({ ...draft, patientSnapshot: { ...draft.patientSnapshot, diagnosis: value } })} /><Field label="评估日期时间" type="datetime-local" value={draft.assessedAt.slice(0, 16)} disabled={disabled} onChange={(value) => onChange({ ...draft, assessedAt: value })} /><Field label="体重 kg" type="number" value={draft.weightKg?.toString() ?? ""} disabled={disabled} onChange={(value) => onChange({ ...draft, weightKg: value ? Number(value) : null })} /><Field label="评估前血压" value={draft.preVitals.bloodPressure} disabled={disabled} onChange={(value) => onChange({ ...draft, preVitals: { ...draft.preVitals, bloodPressure: value } })} /><Field label="评估后血压" value={draft.postVitals.bloodPressure} disabled={disabled} onChange={(value) => onChange({ ...draft, postVitals: { ...draft.postVitals, bloodPressure: value } })} /><Field label="评估前脉搏" type="number" value={draft.preVitals.pulse?.toString() ?? ""} disabled={disabled} onChange={(value) => onChange({ ...draft, preVitals: { ...draft.preVitals, pulse: value ? Number(value) : null } })} /><Field label="评估后脉搏" type="number" value={draft.postVitals.pulse?.toString() ?? ""} disabled={disabled} onChange={(value) => onChange({ ...draft, postVitals: { ...draft.postVitals, pulse: value ? Number(value) : null } })} /></div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <TableRow label="平衡测试（秒）" cells={[<>双脚合并{num(draft.sppb.balance.sideBySideSec, (value) => setSppb({ balance: { ...draft.sppb.balance, sideBySideSec: value } }))}</>, <>半前后站立{num(draft.sppb.balance.semiTandemSec, (value) => setSppb({ balance: { ...draft.sppb.balance, semiTandemSec: value } }))}</>, <>前后站立{num(draft.sppb.balance.tandemSec, (value) => setSppb({ balance: { ...draft.sppb.balance, tandemSec: value } }))}</>, <Score value={calculated.balance.score} />]} />
        <TableRow label="椅子坐立（秒）" cells={[<>第1次{num(draft.sppb.chairStand.trial1Sec, (value) => setSppb({ chairStand: { ...draft.sppb.chairStand, trial1Sec: value } }))}</>, <>第2次{num(draft.sppb.chairStand.trial2Sec, (value) => setSppb({ chairStand: { ...draft.sppb.chairStand, trial2Sec: value } }))}</>, <>最快 {calculated.chairStand.fastestSec ?? "—"}</>, <Score value={calculated.chairStand.score} />]} />
        <TableRow label="4米步行（秒）" cells={[<>第1次{num(draft.sppb.walk4m.trial1Sec, (value) => setSppb({ walk4m: { ...draft.sppb.walk4m, trial1Sec: value } }))}</>, <>第2次{num(draft.sppb.walk4m.trial2Sec, (value) => setSppb({ walk4m: { ...draft.sppb.walk4m, trial2Sec: value } }))}</>, <>最快 {calculated.walk4m.fastestSec ?? "—"}</>, <Score value={calculated.walk4m.score} />]} />
        <TableRow label="最大步行速度（m/s）" cells={[<>第1次{num(draft.sppb.maxWalkingSpeedMs.trial1, (value) => setSppb({ maxWalkingSpeedMs: { ...draft.sppb.maxWalkingSpeedMs, trial1: value } }))}</>, <>第2次{num(draft.sppb.maxWalkingSpeedMs.trial2, (value) => setSppb({ maxWalkingSpeedMs: { ...draft.sppb.maxWalkingSpeedMs, trial2: value } }))}</>, <>最快 {Math.max(draft.sppb.maxWalkingSpeedMs.trial1 ?? 0, draft.sppb.maxWalkingSpeedMs.trial2 ?? 0) || "—"}</>, <Score value={calculated.totalScore} label="总分" />]} />
        <TableRow label="握力（kg）" cells={[<>左手1{num(draft.sppb.grip.leftTrial1Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, leftTrial1Kg: value } }))}</>, <>左手2{num(draft.sppb.grip.leftTrial2Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, leftTrial2Kg: value } }))}</>, <>右手1{num(draft.sppb.grip.rightTrial1Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, rightTrial1Kg: value } }))}</>, <>右手2{num(draft.sppb.grip.rightTrial2Kg, (value) => setSppb({ grip: { ...draft.sppb.grip, rightTrial2Kg: value } }))}</>]} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3"><label><span className="field-label">可否步行100m</span><select disabled={disabled} value={draft.sppb.canWalk100m} onChange={(event) => setSppb({ canWalk100m: event.target.value as AssessmentRecord["sppb"]["canWalk100m"] })} className="text-field"><option value="unknown">未评估</option><option value="yes">可以</option><option value="no">不可以</option></select></label><Field label="不能步行原因" value={draft.sppb.unableWalkReason} disabled={disabled} onChange={(value) => setSppb({ unableWalkReason: value })} /><Field label="上/下肢肌力" value={`${draft.sppb.muscleStrength.upper}/${draft.sppb.muscleStrength.lower}`} disabled={disabled} onChange={(value) => { const [upper, lower] = value.split("/"); setSppb({ muscleStrength: { upper: upper ?? "", lower: lower ?? "" } }); }} /></div>
      <label className="mt-4 block"><span className="field-label">备注</span><textarea disabled={disabled} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="text-field min-h-20" /></label>
      {ruleOpen && <RulePanel onClose={() => setRuleOpen(false)} />}
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4"><p className="text-[10px] text-slate-500">缺失值保持为空，不按0参与判断。演示换算规则待专业确认。</p>{!disabled && <div className="flex gap-2"><button type="button" onClick={() => onSave("draft")} className="btn-secondary"><Save className="h-4 w-4" />保存草稿</button><button type="button" onClick={() => onSave("completed")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />完成评估</button></div>}</div>
  </section>;
}

function ModeButton({ active, icon: Icon, title, note, onClick }: { active: boolean; icon: typeof Files; title: string; note: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 hover:border-blue-200"}`}><Icon className="h-5 w-5" /><span><b className="block text-xs">{title}</b><span className="text-[10px] opacity-70">{note}</span></span></button>; }
function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; type?: string }) { return <label><span className="field-label">{label}</span><input type={type} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="text-field" /></label>; }
function Static({ label, value }: { label: string; value: string }) { return <div><span className="field-label">{label}</span><div className="text-field bg-white font-bold">{value || "未提供"}</div></div>; }
function TableRow({ label, cells }: { label: string; cells: React.ReactNode[] }) { return <div className="grid grid-cols-[1.05fr_repeat(4,1fr)] border-b border-slate-200 last:border-b-0"><div className="flex items-center bg-slate-50 p-3 text-xs font-bold">{label}</div>{cells.map((cell, index) => <div key={index} className="flex min-h-16 flex-col justify-center gap-1 border-l border-slate-200 p-2 text-[10px] text-slate-500">{cell}</div>)}</div>; }
function Score({ value, label = "得分" }: { value: number; label?: string }) { return <div className="rounded-lg bg-emerald-50 p-2 text-center font-bold text-emerald-700">{label} {value}</div>; }
function RulePanel({ onClose }: { onClose: () => void }) { const groups = [{title:"平衡测试",rows:[["双脚合并站立","≥10秒","1分"],["半前后站立","≥10秒","1分"],["双脚前后站立","≥10秒 / 3–9.99秒 / <3秒","2分 / 1分 / 0分"]]},{title:"4米步行",rows:[["最快用时","<4.82秒","4分"],["最快用时","4.82–6.20秒","3分"],["最快用时","6.21–8.70秒","2分"],["最快用时",">8.70秒","1分"],["完成情况","无法步行","0分"]]},{title:"椅子坐立",rows:[["完成用时","<11.19秒","4分"],["完成用时","11.20–13.69秒","3分"],["完成用时","13.70–16.69秒","2分"],["完成用时",">16.70秒","1分"],["完成情况",">60秒或不能完成","0分"]]}]; return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-6" onMouseDown={onClose}><section className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event)=>event.stopPropagation()}><header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4"><div><p className="text-[10px] font-bold text-amber-700">评分依据</p><h2 className="mt-1 text-xl font-bold">SPPB得分换算表</h2></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-6">{groups.map((group)=><section key={group.title} className="overflow-hidden rounded-xl border border-slate-200"><h3 className="bg-slate-50 px-4 py-3 text-sm font-bold">{group.title}</h3><div className="grid grid-cols-[1fr_1.4fr_0.6fr] bg-white px-4 py-2 text-[10px] font-bold text-slate-400"><span>项目</span><span>判定条件</span><span>得分</span></div>{group.rows.map((row,index)=><div key={`${group.title}-${index}`} className="grid grid-cols-[1fr_1.4fr_0.6fr] border-t border-slate-100 px-4 py-3 text-xs"><span>{row[0]}</span><span>{row[1]}</span><b>{row[2]}</b></div>)}</section>)}<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">演示换算规则，正式临床评分口径需由专业人员确认。缺失值保持为空，不按0参与换算。</p></div></section></div>; }
function cloneRecord(record: AssessmentRecord): AssessmentRecord { return JSON.parse(JSON.stringify(record)) as AssessmentRecord; }
