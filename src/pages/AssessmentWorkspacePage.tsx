import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, FileImage, FileText, Save, ScanLine } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { calculateSppb, createBlankSppb, hasSppbInput, type AssessmentRecord } from "../assessmentData";
import type { ManagedPatient } from "./PatientArchivePage";

type AssessmentRole = "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";
type BatchOcrRow = {
  id: string;
  fileName: string;
  status: "待识别" | "识别中" | "待人工核对";
  summary: string;
};

export function AssessmentWorkspacePage({
  role,
  currentAccount,
  patients,
  records,
  initialPatientId,
  onSave,
  onBack
}: {
  role: AssessmentRole;
  currentAccount: string;
  patients: ManagedPatient[];
  records: AssessmentRecord[];
  initialPatientId?: string | null;
  onSave: (record: AssessmentRecord) => void;
  onBack: () => void;
}) {
  const scopedPatients = role === "DOCTOR" ? patients.filter((patient) => patient.assigned_doctor === currentAccount) : patients;
  const [patientId, setPatientId] = useState(initialPatientId ?? scopedPatients[0]?.patient_demo_id ?? "");
  const [recordId, setRecordId] = useState<string | null>(null);
  const patient = scopedPatients.find((item) => item.patient_demo_id === patientId) ?? scopedPatients[0];
  const patientRecords = useMemo(
    () => records.filter((record) => record.patientId === patient?.patient_demo_id).sort((left, right) => right.assessedAt.localeCompare(left.assessedAt)),
    [patient?.patient_demo_id, records]
  );
  const selectedRecord = recordId ? patientRecords.find((record) => record.assessmentId === recordId) : undefined;
  const [draft, setDraft] = useState<AssessmentRecord | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchRows, setBatchRows] = useState<BatchOcrRow[]>([]);
  const [batchOcrStatus, setBatchOcrStatus] = useState<"idle" | "selected" | "recognizing" | "recognized">("idle");

  function runBatchOcr() {
    if (!batchFiles.length || role === "ADMIN") return;
    setBatchOcrStatus("recognizing");
    setBatchRows(batchFiles.map((file, index) => ({ id: `${file.name}-${index}`, fileName: file.name, status: "识别中", summary: "正在读取姓名、患者号、评估日期和 SPPB 原始值…" })));
    window.setTimeout(() => {
      setBatchRows(batchFiles.map((file, index) => ({
        id: `${file.name}-${index}`,
        fileName: file.name,
        status: "待人工核对",
        summary: `已识别基础字段与体能测试值；${index % 2 === 0 ? "生命体征部分字段待核对" : "SPPB 原始值待核对"}`
      })));
      setBatchOcrStatus("recognized");
    }, 650);
  }

  function openRecord(record?: AssessmentRecord) {
    if (!patient) return;
    setRecordId(record?.assessmentId ?? null);
    setDraft(record
      ? {
          ...record,
          sppb: {
            ...record.sppb,
            balance: { ...record.sppb.balance },
            walk4m: { ...record.sppb.walk4m },
            chairStand: { ...record.sppb.chairStand },
            grip: { ...record.sppb.grip },
            muscleStrength: { ...record.sppb.muscleStrength }
          }
        }
      : createBlankSppb(patient, patientRecords.length + 1, currentAccount));
  }

  function save(status: AssessmentRecord["status"]) {
    if (!draft || role === "ADMIN") return;
    const recalculated = calculateSppb(draft.sppb);
    const nextSppb: AssessmentRecord["sppb"] = { ...draft.sppb, ...recalculated };
    const now = new Date().toISOString();
    const next = {
      ...draft,
      sppb: nextSppb,
      status,
      sourceNote: draft.sourceNote || "已由工作人员确认",
      therapist: status === "therapist_confirmed" ? currentAccount : draft.therapist,
      doctor: status === "doctor_reviewed" ? currentAccount : draft.doctor,
      confirmedAt: status === "therapist_confirmed" ? now : draft.confirmedAt,
      reviewedAt: status === "doctor_reviewed" ? now : draft.reviewedAt
    };
    onSave(next);
    setDraft(next);
  }

  return (
    <section data-testid="page-VIEW-ASSESSMENTS">
      <PageHeader
        eyebrow="康复数据采集 · 患者档案子页面"
        title="OCR体能评估"
        description="支持扫描仪批量PDF、图片批量上传和单张拍照识别；所有结果先进入待核对草稿，确认后才进入训练记录与阶段报告。"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} className="btn-secondary">返回患者档案</button>
            <StatusBadge tone={role === "DOCTOR" ? "blue" : role === "REHAB_EXECUTION" ? "orange" : "gray"}>
              {role === "DOCTOR" ? "医生复核" : role === "REHAB_EXECUTION" ? "康复师现场采集" : "只读查看"}
            </StatusBadge>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="card p-4">
          <SectionHeader title="患者与评估记录" />
          <select
            value={patient?.patient_demo_id ?? ""}
            onChange={(event) => {
              setPatientId(event.target.value);
              setDraft(null);
              setRecordId(null);
            }}
            className="text-field"
          >
            <option value="">选择患者</option>
            {scopedPatients.map((item) => <option key={item.patient_demo_id} value={item.patient_demo_id}>{item.name} · {item.patient_code}</option>)}
          </select>
          <button type="button" disabled={!patient || role === "ADMIN"} onClick={() => openRecord()} className="btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:bg-slate-300">
            <ClipboardList className="h-4 w-4" />新建体能评估
          </button>
          <section className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
            <div className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-violet-600" /><p className="text-xs font-bold text-violet-900">历史资料批量 OCR</p></div>
            <p className="mt-1 text-[10px] leading-4 text-violet-700">支持扫描仪批量生成的PDF或多张图片。本地OCR仅生成草稿，建议先用10–20份脱敏样本验证模板。</p>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-white px-3 py-2 text-[11px] font-bold text-violet-800 hover:bg-violet-50"><FileImage className="h-3.5 w-3.5" />选择一批资料<input type="file" multiple accept="image/*,.pdf" className="sr-only" disabled={role === "ADMIN"} onChange={(event) => { const files = Array.from(event.target.files ?? []); setBatchFiles(files); setBatchRows([]); setBatchOcrStatus(files.length ? "selected" : "idle"); }} /></label>
            {batchFiles.length > 0 && <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-600"><span className="truncate">已选择 {batchFiles.length} 份资料</span><button type="button" onClick={runBatchOcr} disabled={role === "ADMIN" || batchOcrStatus === "recognizing"} className="rounded-lg bg-violet-600 px-2.5 py-1.5 font-bold text-white disabled:bg-slate-300">{batchOcrStatus === "recognizing" ? "识别中…" : "开始批量识别"}</button></div>}
            {batchRows.length > 0 && <div className="mt-3 space-y-1.5">{batchRows.map((row) => <div key={row.id} className="rounded-lg border border-violet-100 bg-white p-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold text-slate-700">{row.fileName}</span><StatusBadge tone={row.status === "待人工核对" ? "orange" : "blue"}>{row.status}</StatusBadge></div><p className="mt-1 text-[9px] leading-4 text-slate-500">{row.summary}</p>{row.status === "待人工核对" && <button type="button" onClick={() => openRecord()} className="mt-1 text-[9px] font-bold text-violet-700">打开当前患者逐条核对 →</button>}</div>)}</div>}
          </section>
          <div className="mt-5 space-y-2">
            {patientRecords.map((record) => (
              <button
                type="button"
                key={record.assessmentId}
                onClick={() => openRecord(record)}
                className={`w-full rounded-xl border p-3 text-left ${selectedRecord?.assessmentId === record.assessmentId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="text-xs">第{record.attemptNo}次 SPPB</b>
                  <StatusBadge tone={record.status === "doctor_reviewed" ? "green" : record.status === "therapist_confirmed" ? "orange" : "gray"}>
                    {record.status === "doctor_reviewed" ? "已复核" : record.status === "therapist_confirmed" ? "康复师已确认" : "草稿"}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{record.assessedAt.slice(0, 10)} · 总分 {hasSppbInput(record.sppb) ? `${record.sppb.totalScore}/12` : "未采集"} · {record.source === "ocr" ? "OCR辅助" : record.source === "device" ? "设备采集" : "现场人工"}</p>
              </button>
            ))}
          </div>
        </section>
        {draft
          ? <AssessmentEditor key={draft.assessmentId} draft={draft} role={role} onChange={setDraft} onSave={save} />
          : <section className="card flex min-h-[520px] items-center justify-center p-8 text-center"><div><ClipboardList className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-bold text-slate-700">请选择患者或新建体能评估</h2><p className="mt-2 text-xs leading-5 text-slate-400">评估由康复师现场采集，或上传纸质评估表进行 OCR 辅助录入；确认后的数据进入训练分析和阶段报告，不用于自动开方。</p></div></section>}
      </div>
    </section>
  );
}

function AssessmentEditor({ draft, role, onChange, onSave }: { draft: AssessmentRecord; role: AssessmentRole; onChange: (record: AssessmentRecord) => void; onSave: (status: AssessmentRecord["status"]) => void }) {
  const disabled = role === "ADMIN";
  const canReview = role === "DOCTOR" && draft.status === "therapist_confirmed";
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "selected" | "recognizing" | "recognized">("idle");
  const [ocrMessage, setOcrMessage] = useState("上传纸质 SPPB 评估表，系统将演示识别结构化数据。");
  const setSppb = (patch: Partial<AssessmentRecord["sppb"]>) => onChange({ ...draft, sppb: { ...draft.sppb, ...patch } });
  const setBalance = (key: string, value: string) => setSppb({ balance: { ...draft.sppb.balance, [key as keyof AssessmentRecord["sppb"]["balance"]]: value === "" ? null : Number(value) } });
  const setWalk = (key: string, value: string) => setSppb({ walk4m: { ...draft.sppb.walk4m, [key as "trial1Sec" | "trial2Sec"]: value === "" ? null : Number(value) } });
  const setChair = (key: string, value: string) => setSppb({ chairStand: { ...draft.sppb.chairStand, [key as "trial1Sec" | "trial2Sec"]: value === "" ? null : Number(value) } });
  const setSpeed = (key: "trial1" | "trial2", value: string) => setSppb({ maxWalkingSpeedMs: { ...draft.sppb.maxWalkingSpeedMs, [key]: value === "" ? null : Number(value), fastest: Math.max(key === "trial1" ? Number(value) || 0 : draft.sppb.maxWalkingSpeedMs.trial1 ?? 0, key === "trial2" ? Number(value) || 0 : draft.sppb.maxWalkingSpeedMs.trial2 ?? 0) || null } });
  const setGrip = (key: keyof AssessmentRecord["sppb"]["grip"], value: string) => onChange({ ...draft, sppb: { ...draft.sppb, grip: { ...draft.sppb.grip, [key]: value === "" ? null : Number(value) } } });
  const setMuscleStrength = (key: "upper" | "lower", value: string) => onChange({ ...draft, sppb: { ...draft.sppb, muscleStrength: { ...draft.sppb.muscleStrength, [key]: value } } });

  function selectOcrFile(file?: File) {
    if (!file) return;
    setOcrFile(file);
    setOcrStatus("selected");
    setOcrMessage("文件已选择，请点击“开始识别”；识别后仍需逐项人工核对。");
  }

  function runOcr() {
    if (!ocrFile || disabled) return;
    setOcrStatus("recognizing");
    setOcrMessage("正在识别评估表中的姓名、测试时间、生命体征和 SPPB 原始值…");
    window.setTimeout(() => {
      const recognizedSppb = calculateSppb({
        balance: { sideBySideSec: 10, semiTandemSec: 10, tandemSec: 8.2, score: 0 },
        walk4m: { trial1Sec: 6.4, trial2Sec: 6.1, fastestSec: null, score: 0 },
        chairStand: { trial1Sec: 14.2, trial2Sec: 13.8, fastestSec: null, score: 0 }
      });
      onChange({
        ...draft,
        source: "ocr",
        status: "draft",
        sourceNote: `OCR 识别草稿：${ocrFile.name}；待人工核对`,
        weightKg: draft.weightKg ?? 62.4,
        preVitals: { bloodPressure: "128/78", pulse: 72 },
        postVitals: { bloodPressure: "136/82", pulse: 88 },
        sppb: { ...recognizedSppb, grip: draft.sppb.grip, canWalk100m: "yes", unableWalkReason: "", muscleStrength: draft.sppb.muscleStrength },
        notes: draft.notes ? `${draft.notes}；OCR导入后待人工核对` : "OCR导入后待人工核对"
      });
      setOcrStatus("recognized");
      setOcrMessage("已完成演示识别，字段已回填；请核对原始表格后再保存或提交复核。");
    }, 450);
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold text-blue-600">评估记录 · {draft.assessmentId}</p><h2 className="mt-1 text-lg font-bold">{draft.patientSnapshot.name} · 第{draft.attemptNo}次 SPPB</h2><p className="mt-1 text-xs text-slate-500">{draft.patientSnapshot.gender} / {draft.patientSnapshot.age}岁 · 病案号 {draft.patientSnapshot.hospitalPatientNo} · {draft.patientSnapshot.diagnosis}</p></div>
        <StatusBadge tone={draft.status === "doctor_reviewed" ? "green" : draft.status === "therapist_confirmed" ? "orange" : "gray"}>{draft.status === "doctor_reviewed" ? "医生已复核" : draft.status === "therapist_confirmed" ? "康复师已确认" : "草稿"}</StatusBadge>
      </div>

      <section className="mt-5 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ScanLine className="h-5 w-5" /></span><div><SectionHeader title="OCR 快速获取数据" description="上传纸质评估表图片或 PDF，演示识别姓名、测试日期、生命体征和 SPPB 原始值。" /><p className="mt-2 text-[10px] leading-5 text-violet-700">OCR 仅用于减少录入工作，不能替代康复师现场确认或医生临床复核。</p></div></div>
          <StatusBadge tone={ocrStatus === "recognized" ? "green" : ocrStatus === "recognizing" ? "orange" : "blue"}>{ocrStatus === "recognized" ? "已识别待核对" : ocrStatus === "recognizing" ? "识别中" : "OCR 辅助"}</StatusBadge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-50"><FileImage className="h-4 w-4" />选择评估表<input type="file" accept="image/*,.pdf" className="sr-only" disabled={disabled} onChange={(event) => selectOcrFile(event.target.files?.[0])} /></label>
          <button type="button" onClick={runOcr} disabled={!ocrFile || disabled || ocrStatus === "recognizing"} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300"><ScanLine className="h-4 w-4" />开始 OCR 识别</button>
          {ocrFile && <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] text-slate-600"><FileText className="h-3.5 w-3.5 text-violet-500" />{ocrFile.name}</span>}
        </div>
        <p className="mt-3 rounded-lg border border-violet-100 bg-white/80 p-3 text-[10px] leading-5 text-slate-600">{ocrMessage}</p>
        {ocrStatus === "recognized" && <div className="mt-3 grid gap-2 sm:grid-cols-4"><OcrValue label="测试前血压" value={draft.preVitals.bloodPressure} /><OcrValue label="测试后血压" value={draft.postVitals.bloodPressure} /><OcrValue label="SPPB" value={hasSppbInput(draft.sppb) ? `${draft.sppb.totalScore}/12` : "未采集"} /><OcrValue label="识别来源" value="本地演示结果" /></div>}
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><SectionHeader title="评估来源" description={draft.source === "ocr" ? "本次数据由 OCR 辅助带入，必须人工核对后提交。" : "本次数据由康复师现场人工采集，患者端不上传历史评估资料。"} /><div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><div>{draft.source === "ocr" ? <ScanLine className="mx-auto h-7 w-7 text-violet-500" /> : <ClipboardList className="mx-auto h-7 w-7 text-slate-300" />}<p className="mt-2 text-xs font-bold text-slate-600">{draft.source === "ocr" ? "OCR 辅助结构化录入" : "康复师现场结构化录入"}</p><p className="mt-1 text-[10px] text-slate-400">来源：{draft.source === "device" ? "设备采集" : draft.source === "ocr" ? "OCR识别 + 人工核对" : "人工录入"}</p></div></div><p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11px] leading-5 text-blue-900">评估结果保存后进入待复核状态，医生确认后才作为处方和康复报告依据。</p></section>
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><SectionHeader title="测试信息" /><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">测试次数</span><input disabled value={`第${draft.attemptNo}次`} className="text-field disabled:bg-white" /></label><label><span className="field-label">测试时间</span><input disabled={disabled} type="datetime-local" value={draft.assessedAt.slice(0, 16)} onChange={(event) => onChange({ ...draft, assessedAt: new Date(event.target.value).toISOString() })} className="text-field disabled:bg-white" /></label><label><span className="field-label">体重（Kg）</span><input disabled={disabled} type="number" value={draft.weightKg ?? ""} onChange={(event) => onChange({ ...draft, weightKg: event.target.value === "" ? null : Number(event.target.value) })} className="text-field disabled:bg-white" /></label><label><span className="field-label">测试前血压</span><input disabled={disabled} value={draft.preVitals.bloodPressure} onChange={(event) => onChange({ ...draft, preVitals: { ...draft.preVitals, bloodPressure: event.target.value } })} placeholder="128/78" className="text-field disabled:bg-white" /></label><label><span className="field-label">测试前脉搏</span><input disabled={disabled} type="number" value={draft.preVitals.pulse ?? ""} onChange={(event) => onChange({ ...draft, preVitals: { ...draft.preVitals, pulse: event.target.value === "" ? null : Number(event.target.value) } })} placeholder="72" className="text-field disabled:bg-white" /></label><label><span className="field-label">测试后血压</span><input disabled={disabled} value={draft.postVitals.bloodPressure} onChange={(event) => onChange({ ...draft, postVitals: { ...draft.postVitals, bloodPressure: event.target.value } })} placeholder="136/82" className="text-field disabled:bg-white" /></label><label><span className="field-label">测试后脉搏</span><input disabled={disabled} type="number" value={draft.postVitals.pulse ?? ""} onChange={(event) => onChange({ ...draft, postVitals: { ...draft.postVitals, pulse: event.target.value === "" ? null : Number(event.target.value) } })} placeholder="88" className="text-field disabled:bg-white" /></label></div></section>
      </div>

      <section className="mt-5"><SectionHeader title="SPPB 原始测试值" description="保存两次原始成绩，系统按 Demo 规则版本自动计算分数；OCR 回填后请优先核对这些字段。" /><div className="grid gap-3 md:grid-cols-3"><MeasureCard title="平衡测试（秒）" fields={[["双脚合并", "sideBySideSec"], ["半前后", "semiTandemSec"], ["双脚前后", "tandemSec"]]} values={draft.sppb.balance} onChange={setBalance} score={draft.sppb.balance.score} /><MeasureCard title="4米步行（秒）" fields={[["第1次", "trial1Sec"], ["第2次", "trial2Sec"]]} values={draft.sppb.walk4m} onChange={setWalk} score={draft.sppb.walk4m.score} /><MeasureCard title="椅子坐立（秒）" fields={[["第1次", "trial1Sec"], ["第2次", "trial2Sec"]]} values={draft.sppb.chairStand} onChange={setChair} score={draft.sppb.chairStand.score} /></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]"><div className="rounded-xl border border-sky-100 bg-sky-50 p-4"><p className="text-xs font-bold text-sky-900">最大步行速度（m/s）</p><div className="mt-3 grid grid-cols-2 gap-2"><label><span className="field-label">第1次</span><input disabled={disabled} type="number" step="0.01" value={draft.sppb.maxWalkingSpeedMs.trial1 ?? ""} onChange={(event) => setSpeed("trial1", event.target.value)} className="text-field disabled:bg-white" /></label><label><span className="field-label">第2次</span><input disabled={disabled} type="number" step="0.01" value={draft.sppb.maxWalkingSpeedMs.trial2 ?? ""} onChange={(event) => setSpeed("trial2", event.target.value)} className="text-field disabled:bg-white" /></label></div><p className="mt-2 text-[10px] text-sky-700">最快：{draft.sppb.maxWalkingSpeedMs.fastest ?? "未采集"} m/s</p></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">SPPB 换算依据 · {draft.ruleVersion}</p><p className="mt-2 text-[10px] leading-5 text-amber-800">平衡：双脚并拢/半前后各达 10 秒计 1 分，双脚前后按 ≥10 秒/3–9.99 秒/&lt;3 秒计 2/1/0 分；4 米步行和椅子坐立按当前 Demo 规则表换算。该规则仅用于演示，待专业确认，不作为临床分层标准。</p></div></div><div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-xs font-bold text-emerald-800">SPPB 总分（系统计算）</span><b className="text-3xl text-emerald-700">{hasSppbInput(draft.sppb) ? draft.sppb.totalScore : "未采集"}{hasSppbInput(draft.sppb) && <small className="ml-1 text-xs">/12</small>}</b></div></section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2"><div><span className="field-label">左手握力（Kg，第1/2次）</span><div className="grid grid-cols-2 gap-2"><input disabled={disabled} type="number" value={draft.sppb.grip.leftTrial1Kg ?? ""} onChange={(event) => setGrip("leftTrial1Kg", event.target.value)} className="text-field disabled:bg-slate-50" /><input disabled={disabled} type="number" value={draft.sppb.grip.leftTrial2Kg ?? ""} onChange={(event) => setGrip("leftTrial2Kg", event.target.value)} className="text-field disabled:bg-slate-50" /></div></div><div><span className="field-label">右手握力（Kg，第1/2次）</span><div className="grid grid-cols-2 gap-2"><input disabled={disabled} type="number" value={draft.sppb.grip.rightTrial1Kg ?? ""} onChange={(event) => setGrip("rightTrial1Kg", event.target.value)} className="text-field disabled:bg-slate-50" /><input disabled={disabled} type="number" value={draft.sppb.grip.rightTrial2Kg ?? ""} onChange={(event) => setGrip("rightTrial2Kg", event.target.value)} className="text-field disabled:bg-slate-50" /></div></div><label><span className="field-label">是否可以步行100米</span><select disabled={disabled} value={draft.sppb.canWalk100m} onChange={(event) => onChange({ ...draft, sppb: { ...draft.sppb, canWalk100m: event.target.value as AssessmentRecord["sppb"]["canWalk100m"] } })} className="text-field disabled:bg-slate-50"><option value="unknown">未记录</option><option value="yes">可以</option><option value="no">不可以</option></select></label><label><span className="field-label">不能步行原因</span><input disabled={disabled} value={draft.sppb.unableWalkReason} onChange={(event) => onChange({ ...draft, sppb: { ...draft.sppb, unableWalkReason: event.target.value } })} className="text-field disabled:bg-slate-50" /></label><div><span className="field-label">上肢 / 下肢肌力</span><div className="grid grid-cols-2 gap-2"><input disabled={disabled} value={draft.sppb.muscleStrength.upper} onChange={(event) => setMuscleStrength("upper", event.target.value)} placeholder="上肢" className="text-field disabled:bg-slate-50" /><input disabled={disabled} value={draft.sppb.muscleStrength.lower} onChange={(event) => setMuscleStrength("lower", event.target.value)} placeholder="下肢" className="text-field disabled:bg-slate-50" /></div></div><label><span className="field-label">备注</span><input disabled={disabled} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="text-field disabled:bg-slate-50" /></label></section>
      {draft.status !== "doctor_reviewed" && <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /><p>当前记录必须完成临床确认后才能作为处方或康复报告依据。系统计算结果不替代医生判断。</p></div>}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={disabled} onClick={() => onSave("draft")} className="btn-secondary disabled:opacity-50"><Save className="h-4 w-4" />保存草稿</button>{role === "REHAB_EXECUTION" && draft.status !== "doctor_reviewed" && <button type="button" onClick={() => onSave("therapist_confirmed")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />康复师确认并提交医生</button>}{canReview && <button type="button" onClick={() => onSave("doctor_reviewed")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />医生复核通过</button>}</div>
    </section>
  );
}

function OcrValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-violet-100 bg-violet-50/70 p-3"><p className="text-[10px] text-violet-600">{label}</p><b className="mt-1 block text-xs text-slate-800">{value || "未识别"}</b></div>;
}

function MeasureCard({ title, fields, values, onChange, score }: { title: string; fields: [string, string][]; values: Record<string, unknown>; onChange: (key: string, value: string) => void; score: number }) {
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><b className="text-xs">{title}</b><StatusBadge tone="blue">{score}分</StatusBadge></div><div className="mt-3 space-y-2">{fields.map(([label, key]) => <label key={`${title}-${label}`}><span className="field-label">{label}</span><input type="number" step="0.01" value={(values[key] as number | null) ?? ""} onChange={(event) => onChange(key, event.target.value)} className="text-field" /></label>)}</div></div>;
}
