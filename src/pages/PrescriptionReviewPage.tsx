import { useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarRange, Check, FileText, PenTool, Printer, Sparkles, X } from "lucide-react";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels } from "../prescriptionData";
import { Notice, PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, minimalSafetyEvents } from "../clinicalSharedData";

export function PrescriptionReviewPage({
  task,
  onBack,
  onConfirm,
  onOpenReport
}: {
  task: PrescriptionTask;
  onBack: () => void;
  onConfirm: (taskId: string) => void;
  onOpenReport: () => void;
}) {
  const readonly = task.status === "completed";
  const [selectedReport, setSelectedReport] = useState<"stage" | "single">(task.sourceType === "single_report" ? "single" : "stage");
  const [height, setHeight] = useState("162");
  const [contact, setContact] = useState("138****2688");
  const [identityNo, setIdentityNo] = useState("3702************26");
  const [rehabGoal, setRehabGoal] = useState("改善症状、提高体能、改善心功能、预防支架内再狭窄");
  const [breathingMode, setBreathingMode] = useState("腹式呼吸练习");
  const [breathingIntensity, setBreathingIntensity] = useState("吸气时鼓起肚子，呼气时缩紧肚子，呼气/吸气时间比≥3:1");
  const [breathingFrequency, setBreathingFrequency] = useState("每天2次");
  const [breathingTime, setBreathingTime] = useState("每次10分钟");
  const [warmupMode, setWarmupMode] = useState("原地踏步、肩部热身运动、扩胸运动、四肢伸展运动、手腕踝关节");
  const [warmupFrequency, setWarmupFrequency] = useState("每次训练前");
  const [warmupTime, setWarmupTime] = useState("5分钟");
  const [aerobicMode, setAerobicMode] = useState("骑自行车/健身器械（踏车）");
  const [aerobicIntensity, setAerobicIntensity] = useState("靶心率100-116次/分钟；功率起始50W，目标4周70W；运动时可正常语速交流但不能轻松唱歌");
  const [aerobicFrequency, setAerobicFrequency] = useState("每周3次");
  const [aerobicTime, setAerobicTime] = useState("30分钟/次");
  const [resistanceMode, setResistanceMode] = useState("哑铃、弹力带");
  const [resistanceIntensity, setResistanceIntensity] = useState("每种动作2组，每组10个；配合呼吸：吸气放松，呼气发力");
  const [resistanceFrequency, setResistanceFrequency] = useState("每周2次");
  const [resistanceTime, setResistanceTime] = useState("每次4种动作");
  const [flexibilityMode, setFlexibilityMode] = useState("颈部肌肉牵伸、躯干肌肉牵伸、上肢肌肉牵伸、下肢肌肉牵伸");
  const [flexibilityIntensity, setFlexibilityIntensity] = useState("每组肌肉拉伸3次");
  const [flexibilityFrequency, setFlexibilityFrequency] = useState("每次有氧或者抗阻训练后");
  const [flexibilityTime, setFlexibilityTime] = useState("每次拉伸15-30秒");
  const [remark, setRemark] = useState("此方案为4-8周计划，应根据训练反馈适时进阶；良好的运动习惯应持续终身；如若出现任何不适请立即停止并就近就医。");
  const [showFinalPrescription, setShowFinalPrescription] = useState(task.status === "completed");
  const previousVersionKey = task.previousVersionId?.match(/V[1-4]/)?.[0] ?? (task.kind === "initial" ? "V1" : "V4");
  const previousVersion = getPrescriptionVersionDetail(previousVersionKey);
  const linkedSafetyEvents = minimalSafetyEvents.filter((event) => event.patientId === task.patientId);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const hasBlockingMissing = Boolean(task.missingFields?.length);
  const prescriptionDocument = {
    height,
    contact,
    identityNo,
    rehabGoal,
    breathingMode,
    breathingIntensity,
    breathingFrequency,
    breathingTime,
    warmupMode,
    warmupFrequency,
    warmupTime,
    aerobicMode,
    aerobicIntensity,
    aerobicFrequency,
    aerobicTime,
    resistanceMode,
    resistanceIntensity,
    resistanceFrequency,
    resistanceTime,
    flexibilityMode,
    flexibilityIntensity,
    flexibilityFrequency,
    flexibilityTime,
    remark
  };

  function printPrescription() {
    document.body.classList.add("printing-prescription");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-prescription"), 300);
  }

  function confirmAndSign() {
    onConfirm(task.id);
    setShowFinalPrescription(true);
  }

  function saveDraft() {
    setConfirmChecked(true);
  }

  return (
    <section data-testid="page-VIEW-PRESCRIPTION-REVIEW">
      <PageHeader eyebrow={task.kind === "initial" ? "初始处方录入" : "报告驱动调整处方"} title={`${task.patientName} · ${task.version}`} description={task.kind === "initial" ? "基于首次基线评估由康复医生人工录入，不强制使用AI。" : "先核对报告、上一版处方与安全事件，再复核AI处方草稿。"} action={<button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回处方列表</button>} />

      <div className="space-y-4">
        <section className="card p-4">
          <SectionHeader title="病人基础信息" description="先核对病史、诊断和特殊用药；这些信息只作为处方复核依据，不混入处方模板字段。" />
          <div className="grid gap-3 md:grid-cols-5">
            <Evidence label="姓名 / 性别 / 年龄" value={`${task.patientName} · ${task.sex} · ${task.age}岁`} />
            <Evidence label="分组情况" value={task.risk} warning={task.risk === "高危"} />
            <Evidence label="病史" value={clinicalSnapshotChen.medicalHistory} />
            <Evidence label="诊断" value={clinicalSnapshotChen.diagnosis} />
            <Evidence label="特殊用药" value={clinicalSnapshotChen.specialMedications.join("、")} />
          </div>
          {hasBlockingMissing && <div className="mt-3"><Notice tone="orange" title="关键评估缺失">{task.missingFields?.join("、")}。可保存草稿，补齐前不要确认完成。</Notice></div>}
        </section>

        <section className="card p-4">
          <SectionHeader title="AI生成建议" action={<Sparkles className="h-4 w-4 text-blue-600" />} />
          <div className="grid gap-3 text-xs leading-5 text-slate-600 md:grid-cols-[1.15fr_0.9fr_0.95fr]">
            <div className="rounded-xl bg-blue-50 p-3"><p className="font-bold text-blue-900">建议</p><p className="mt-1">基于报告建议维持功率车为主，靶心率维持100-116次/分钟，训练总时间30分钟/次。</p></div>
            <Evidence label="为什么需要开方" value={task.kind === "initial" ? "首次基线评估后需形成初始处方" : "阶段/单次报告已就绪，上一版本需复核或调整"} />
            <Evidence label="上一版参考" value={`${previousVersion.version} · ${previousVersion.targetHr.join("-")}次/分钟 · ${previousVersion.targetPower.join("-")}W`} />
            {linkedSafetyEvents.map((event) => <div key={event.id} className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-800"><b>{event.type}</b><p className="mt-1">{event.metricSnapshot}；{event.doctorReview}；{event.prescriptionImpact}</p></div>)}
            <p className="rounded-xl bg-amber-50 p-3 text-amber-800 md:col-span-3">AI只生成建议和提示，不写入正式处方；下方处方内容以医生保存和确认为准。</p>
          </div>
        </section>

        <section className="card p-4">
          <SectionHeader title="报告列表" description="点击后在下方查看报告内容和数据项。" />
          <div className="grid gap-3 md:grid-cols-[0.72fr_0.72fr_0.56fr_1.4fr]">
            <button type="button" onClick={() => setSelectedReport("stage")} className={`rounded-xl border p-3 text-left ${selectedReport === "stage" ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}><CalendarRange className="h-4 w-4 text-blue-600" /><p className="mt-2 text-xs font-bold text-slate-900">阶段性报告</p><p className="mt-1 text-[10px] text-slate-500">{task.sourceType === "stage_report" ? task.sourceLabel : "历史阶段报告"}</p></button>
            <button type="button" onClick={() => setSelectedReport("single")} className={`rounded-xl border p-3 text-left ${selectedReport === "single" ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}><FileText className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs font-bold text-slate-900">单次报告</p><p className="mt-1 text-[10px] text-slate-500">{task.sourceType === "single_report" ? task.sourceLabel : "功率车单次报告"}</p></button>
            <button type="button" onClick={onOpenReport} className="rounded-xl border border-slate-100 bg-white p-3 text-left text-xs font-bold text-blue-700 hover:bg-blue-50">进入报告中心</button>
            <ReportPreviewCard selected={selectedReport} />
          </div>
        </section>

        <section id="printable-prescription" className="card p-5">
          <div className="print-only"><h1>心脏康复中心运动处方</h1><p>处方编号：{task.id}　患者：{task.patientName}　性别：{task.sex}　年龄：{task.age}岁　BMI：{clinicalSnapshotChen.bmi}</p><p>处方依据：{task.sourceLabel}</p></div>
          <SectionHeader title="心脏康复中心运动处方" description={readonly ? "已完成处方不可修改，只能查看和打印。" : "严格按PDF模板数据项编辑。"} action={<StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>} />
          <div className="grid grid-cols-2 gap-3">
            <PrescriptionField label="身高（cm）" value={height} setValue={setHeight} disabled={readonly} />
            <PrescriptionField label="联系方式" value={contact} setValue={setContact} disabled={readonly} />
            <PrescriptionField label="身份证号" value={identityNo} setValue={setIdentityNo} disabled={readonly} />
            <PrescriptionField label="康复目标" value={rehabGoal} setValue={setRehabGoal} disabled={readonly} />
          </div>
          <TemplateRow title="呼吸训练" mode={breathingMode} setMode={setBreathingMode} intensity={breathingIntensity} setIntensity={setBreathingIntensity} frequency={breathingFrequency} setFrequency={setBreathingFrequency} time={breathingTime} setTime={setBreathingTime} disabled={readonly} />
          <TemplateRow title="热身运动" mode={warmupMode} setMode={setWarmupMode} intensity="养成良好的运动习惯，避免久坐" setIntensity={() => undefined} frequency={warmupFrequency} setFrequency={setWarmupFrequency} time={warmupTime} setTime={setWarmupTime} disabled={readonly} />
          <TemplateRow title="有氧运动" mode={aerobicMode} setMode={setAerobicMode} intensity={aerobicIntensity} setIntensity={setAerobicIntensity} frequency={aerobicFrequency} setFrequency={setAerobicFrequency} time={aerobicTime} setTime={setAerobicTime} disabled={readonly} />
          <TemplateRow title="抗阻训练" mode={resistanceMode} setMode={setResistanceMode} intensity={resistanceIntensity} setIntensity={setResistanceIntensity} frequency={resistanceFrequency} setFrequency={setResistanceFrequency} time={resistanceTime} setTime={setResistanceTime} disabled={readonly} />
          <TemplateRow title="柔韧性训练" mode={flexibilityMode} setMode={setFlexibilityMode} intensity={flexibilityIntensity} setIntensity={setFlexibilityIntensity} frequency={flexibilityFrequency} setFrequency={setFlexibilityFrequency} time={flexibilityTime} setTime={setFlexibilityTime} disabled={readonly} />
          <AdviceField label="备注" value={remark} setValue={setRemark} disabled={readonly} />
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <label className="flex items-start gap-3"><input type="checkbox" checked={confirmChecked || readonly} onChange={(event) => setConfirmChecked(event.target.checked)} disabled={readonly} className="mt-0.5 accent-blue-600" /><span className="text-xs leading-5 text-slate-600">我已核对报告/评估依据和运动处方内容，确认当前内容由医生作出临床判断。</span></label>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="text-xs text-slate-500">{readonly ? <span className="flex items-center gap-2 font-bold text-emerald-700"><BadgeCheck className="h-4 w-4" />已签署归档，只能查看</span> : "未完成处方可编辑和保存；确认完成后自动数字签名"}</div>
            <div className="flex gap-2">
              {!readonly && <button type="button" className="btn-secondary" onClick={saveDraft}><PenTool className="h-4 w-4" />保存草稿</button>}
              {!readonly && <button type="button" className="btn-primary" disabled={!confirmChecked || hasBlockingMissing} onClick={confirmAndSign}><Check className="h-4 w-4" />确认完成并签署</button>}
              {readonly && <button type="button" className="btn-primary" onClick={() => setShowFinalPrescription(true)}><Printer className="h-4 w-4" />查看/打印正式处方</button>}
            </div>
          </div>
          <FinalPrescriptionPrintContent task={task} document={prescriptionDocument} signed={readonly || showFinalPrescription} />
        </section>
      </div>
      {showFinalPrescription && <FinalPrescriptionPage task={task} document={prescriptionDocument} signed onClose={() => setShowFinalPrescription(false)} onPrint={printPrescription} />}
    </section>
  );
}

function Evidence({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${warning ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}><span className="text-xs text-slate-500">{label}</span><b className={warning ? "text-amber-800" : "text-slate-800"}>{value}</b></div>;
}

function PrescriptionField({ label, value, setValue, disabled }: { label: string; value: string; setValue: (value: string) => void; disabled: boolean }) {
  return <label><span className="field-label">{label}</span><input className="text-field disabled:bg-slate-50" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} /></label>;
}

function AdviceField({ label, value, setValue, disabled }: { label: string; value: string; setValue: (value: string) => void; disabled: boolean }) {
  return <label><span className="field-label">{label}</span><textarea className="text-field min-h-20 resize-none bg-white py-2 disabled:bg-slate-50" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} /></label>;
}

type PrescriptionDocument = {
  height: string;
  contact: string;
  identityNo: string;
  rehabGoal: string;
  breathingMode: string;
  breathingIntensity: string;
  breathingFrequency: string;
  breathingTime: string;
  warmupMode: string;
  warmupFrequency: string;
  warmupTime: string;
  aerobicMode: string;
  aerobicIntensity: string;
  aerobicFrequency: string;
  aerobicTime: string;
  resistanceMode: string;
  resistanceIntensity: string;
  resistanceFrequency: string;
  resistanceTime: string;
  flexibilityMode: string;
  flexibilityIntensity: string;
  flexibilityFrequency: string;
  flexibilityTime: string;
  remark: string;
};

function TemplateRow({ title, mode, setMode, intensity, setIntensity, frequency, setFrequency, time, setTime, disabled }: { title: string; mode: string; setMode: (value: string) => void; intensity: string; setIntensity: (value: string) => void; frequency: string; setFrequency: (value: string) => void; time: string; setTime: (value: string) => void; disabled: boolean }) {
  return (
    <section className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-bold text-slate-800">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <PrescriptionField label="运动方式" value={mode} setValue={setMode} disabled={disabled} />
        <PrescriptionField label="运动强度" value={intensity} setValue={setIntensity} disabled={disabled || title === "热身运动"} />
        <PrescriptionField label="运动频率" value={frequency} setValue={setFrequency} disabled={disabled} />
        <PrescriptionField label="运动时间" value={time} setValue={setTime} disabled={disabled} />
      </div>
    </section>
  );
}

function ReportPreviewCard({ selected }: { selected: "stage" | "single" }) {
  if (selected === "stage") {
    return <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p className="font-bold text-slate-900">阶段性报告内容</p><p className="mt-1">完成11/12次；靶区达标84%；平均实际运动25.1分钟；异常事件1项已复核。</p><p className="mt-2 text-slate-400">数据项：完成率、靶区达标、平均功率、RPE、血压/血氧、心电事件。</p></div>;
  }
  return <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p className="font-bold text-slate-900">单次报告内容</p><p className="mt-1">功率车30分钟；平均心率106 bpm；靶区时间22分钟；训练后血压124/76 mmHg。</p><p className="mt-2 text-slate-400">数据项：运动项目、总时长、心率、血压测量点、血氧、心电摘要。</p></div>;
}

function FinalPrescriptionPrintContent({ task, document, signed }: { task: PrescriptionTask; document: PrescriptionDocument; signed: boolean }) {
  return (
    <div className="print-only">
      <h2>处方内容</h2>
      <p>姓名：{task.patientName}　性别：{task.sex}　年龄：{task.age}　身高：{document.height}cm　体重：{clinicalSnapshotChen.weightKg}kg　BMI：{clinicalSnapshotChen.bmi}　联系方式：{document.contact}　身份证号：{document.identityNo}</p>
      <p>康复目标：{document.rehabGoal}</p>
      <p>呼吸训练：{document.breathingMode}；{document.breathingIntensity}；{document.breathingFrequency}；{document.breathingTime}</p>
      <p>热身运动：{document.warmupMode}；{document.warmupFrequency}；{document.warmupTime}</p>
      <p>有氧运动：{document.aerobicMode}；{document.aerobicIntensity}；{document.aerobicFrequency}；{document.aerobicTime}</p>
      <p>抗阻训练：{document.resistanceMode}；{document.resistanceIntensity}；{document.resistanceFrequency}；{document.resistanceTime}</p>
      <p>柔韧性训练：{document.flexibilityMode}；{document.flexibilityIntensity}；{document.flexibilityFrequency}；{document.flexibilityTime}</p>
      <p>备注：{document.remark}</p>
      <div className="prescription-sign-line"><span>制定者：{task.signedBy ?? task.confirmedBy ?? "王医生"}</span><span>数字签名：{signed ? "已签名（CA验证有效）" : "未签名"}</span><span className="signature-script">王医生</span><span>制定日期：2026.07.29</span></div>
    </div>
  );
}

function FinalPrescriptionPage({ task, document, signed, onClose, onPrint }: { task: PrescriptionTask; document: PrescriptionDocument; signed: boolean; onClose: () => void; onPrint: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-6 backdrop-blur-sm">
      <section className="mx-auto flex max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div><p className="text-xs font-bold text-blue-700">正式处方页面</p><h2 className="mt-1 text-lg font-bold text-slate-950">心脏康复中心运动处方</h2></div>
          <div className="flex gap-2"><button type="button" className="btn-primary" onClick={onPrint}><Printer className="h-4 w-4" />打印</button><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="关闭正式处方"><X className="h-4 w-4" /></button></div>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-6">
          <div id="formal-prescription-page" className="mx-auto min-h-[820px] max-w-3xl bg-white p-8 text-xs leading-6 text-slate-800 shadow-sm">
            <h1 className="text-center text-2xl font-bold text-slate-950">心脏康复中心运动处方</h1>
            <div className="mt-5 grid grid-cols-4 gap-x-4 gap-y-2 border-y border-slate-300 py-3">
              <span>姓名：{task.patientName}</span><span>性别：{task.sex}</span><span>年龄：{task.age}</span><span>身高：{document.height}cm</span>
              <span>体重：{clinicalSnapshotChen.weightKg}kg</span><span>BMI：{clinicalSnapshotChen.bmi}</span><span>联系方式：{document.contact}</span><span>身份证号：{document.identityNo}</span>
            </div>
            <PrescriptionLine title="康复目标" value={document.rehabGoal} />
            <PrescriptionLine title="呼吸训练" value={`${document.breathingMode}；${document.breathingIntensity}；${document.breathingFrequency}；${document.breathingTime}`} />
            <PrescriptionLine title="热身运动" value={`${document.warmupMode}；${document.warmupFrequency}；${document.warmupTime}`} />
            <PrescriptionLine title="有氧运动" value={`${document.aerobicMode}；${document.aerobicIntensity}；${document.aerobicFrequency}；${document.aerobicTime}`} />
            <PrescriptionLine title="抗阻训练" value={`${document.resistanceMode}；${document.resistanceIntensity}；${document.resistanceFrequency}；${document.resistanceTime}`} />
            <PrescriptionLine title="柔韧性训练" value={`${document.flexibilityMode}；${document.flexibilityIntensity}；${document.flexibilityFrequency}；${document.flexibilityTime}`} />
            <PrescriptionLine title="备注" value={document.remark} />
            <div className="mt-8 flex items-end justify-between border-t border-slate-300 pt-5">
              <span>制定者：{task.signedBy ?? task.confirmedBy ?? "王医生"}</span>
              <span>数字签名：{signed ? "已签名（CA验证有效）" : "未签名"}</span>
              <span className="signature-script text-3xl font-bold text-slate-950">王医生</span>
              <span>制定日期：2026.07.29</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PrescriptionLine({ title, value }: { title: string; value: string }) {
  return <div className="mt-4 border-b border-slate-100 pb-3"><p className="font-bold text-slate-950">{title}</p><p className="mt-1">{value}</p></div>;
}
