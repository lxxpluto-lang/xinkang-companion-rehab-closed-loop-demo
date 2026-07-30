import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  ClipboardCheck,
  FileClock,
  HeartPulse,
  PenTool,
  Printer,
  Search,
  Sparkles,
  X
} from "lucide-react";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels } from "../prescriptionData";
import { Notice, SectionHeader, StatusBadge } from "../components/UI";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, minimalSafetyEvents } from "../clinicalSharedData";

export function PrescriptionReviewPage({
  task,
  onBack,
  onConfirm,
  onOpenPatient
}: {
  task: PrescriptionTask;
  onBack: () => void;
  onConfirm: (taskId: string) => void;
  onOpenPatient: (patientId: string) => void;
}) {
  const readonly = task.status === "completed";
  const [height, setHeight] = useState("162");
  const [contact, setContact] = useState("138****2688");
  const [identityNo, setIdentityNo] = useState("3702************26");
  const [rehabGoals, setRehabGoals] = useState(["改善症状", "提高体能", "改善心功能", "预防支架内再狭窄"]);
  const [breathingModes, setBreathingModes] = useState(["腹式呼吸练习"]);
  const [breathingIntensity, setBreathingIntensity] = useState("吸气时鼓起肚子，呼气时缩紧肚子，呼气/吸气时间比≥3:1");
  const [breathingFrequency, setBreathingFrequency] = useState("每天2次");
  const [breathingTime, setBreathingTime] = useState("每次10分钟");
  const [warmupModes, setWarmupModes] = useState(["原地踏步", "肩部热身运动", "扩胸运动", "四肢伸展运动", "手腕踝关节"]);
  const [warmupFrequency, setWarmupFrequency] = useState("每次训练前");
  const [warmupTime, setWarmupTime] = useState("5分钟");
  const [aerobicModes, setAerobicModes] = useState(["骑自行车", "健身器械（踏车、椭圆机）"]);
  const [aerobicIntensity, setAerobicIntensity] = useState("靶心率100-116次/分钟；功率起始50W，目标4周70W；运动时可正常语速交流但不能轻松唱歌");
  const [aerobicFrequency, setAerobicFrequency] = useState("每周3次");
  const [aerobicTime, setAerobicTime] = useState("30分钟/次");
  const [resistanceModes, setResistanceModes] = useState(["哑铃", "弹力带"]);
  const [resistanceIntensity, setResistanceIntensity] = useState("每种动作2组，每组10个；配合呼吸：吸气放松，呼气发力");
  const [resistanceFrequency, setResistanceFrequency] = useState("每周2次");
  const [resistanceTime, setResistanceTime] = useState("每次4种动作");
  const [flexibilityModes, setFlexibilityModes] = useState(["颈部肌肉牵伸", "躯干肌肉牵伸", "上肢肌肉牵伸", "下肢肌肉牵伸"]);
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
    rehabGoal: rehabGoals.join("、"),
    breathingMode: breathingModes.join("、"),
    breathingIntensity,
    breathingFrequency,
    breathingTime,
    warmupMode: warmupModes.join("、"),
    warmupFrequency,
    warmupTime,
    aerobicMode: aerobicModes.join("、"),
    aerobicIntensity,
    aerobicFrequency,
    aerobicTime,
    resistanceMode: resistanceModes.join("、"),
    resistanceIntensity,
    resistanceFrequency,
    resistanceTime,
    flexibilityMode: flexibilityModes.join("、"),
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
    <section className="prescription-review-page" data-testid="page-VIEW-PRESCRIPTION-REVIEW">
      <header className="prescription-detail-hero">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="prescription-hero-back" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              返回处方列表
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="prescription-hero-chip"><FileClock className="h-3.5 w-3.5" />{task.version}</span>
              <span className="prescription-hero-chip"><ClipboardCheck className="h-3.5 w-3.5" />{task.kind === "initial" ? "初始处方" : "调整处方"}</span>
              <StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>
            </div>
          </div>

          <div className="mt-5">
            <p className="prescription-hero-kicker">处方管理 / 处方审核</p>
            <h1 className="prescription-hero-title">患者处方详情</h1>
            <p className="prescription-hero-description">
              {task.kind === "initial"
                ? "核对患者临床信息并完成首次运动处方录入。"
                : "结合阶段报告、上一版处方及安全事件，完成本次处方复核。"}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section id="printable-prescription" className="card prescription-editor-card overflow-hidden">
          <div className="print-only"><h1>心脏康复中心运动处方</h1><p>处方编号：{task.id}　患者编码：{task.patientId}　患者：{task.patientName}　性别：{task.sex}　年龄：{task.age}岁　BMI：{clinicalSnapshotChen.bmi}</p><p>处方依据：{task.sourceLabel}</p></div>
          <div className="border-b border-slate-100 bg-white px-5 py-5">
            <SectionHeader title="心脏康复中心运动处方" description={readonly ? "该处方已完成签署，当前为只读状态。" : "请按临床判断逐项核对并完善处方内容。"} action={<span className="hidden text-[10px] text-slate-400 sm:inline">处方编号 {task.id}</span>} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PrescriptionField label="身高（cm）" value={height} setValue={setHeight} disabled={readonly} />
              <PrescriptionField label="联系方式" value={contact} setValue={setContact} disabled={readonly} />
              <PrescriptionField label="身份证号" value={identityNo} setValue={setIdentityNo} disabled={readonly} />
            </div>
          </div>

          <div className="space-y-4 bg-slate-50/60 p-5">
            <CheckboxOptions title="康复目标" options={["降低血压", "降低血脂", "降低血糖", "改善症状", "提高缺血阈", "预防支架内再狭窄", "减重", "改善心功能", "改善睡眠", "提高体能", "改善神经功能", "其他"]} selected={rehabGoals} setSelected={setRehabGoals} disabled={readonly} />
            <TemplateRow title="呼吸训练" options={["吸气抬手", "吸气耸肩", "吸气跺脚", "腹式呼吸练习"]} selected={breathingModes} setSelected={setBreathingModes} intensity={breathingIntensity} setIntensity={setBreathingIntensity} frequency={breathingFrequency} setFrequency={setBreathingFrequency} time={breathingTime} setTime={setBreathingTime} disabled={readonly} />
            <TemplateRow title="热身运动" options={["原地踏步", "肩部热身运动", "扩胸运动", "四肢伸展运动", "手腕踝关节"]} selected={warmupModes} setSelected={setWarmupModes} intensity="养成良好的运动习惯，避免久坐" setIntensity={() => undefined} frequency={warmupFrequency} setFrequency={setWarmupFrequency} time={warmupTime} setTime={setWarmupTime} disabled={readonly} />
            <TemplateRow title="有氧运动" options={["步行", "慢跑", "游泳", "骑自行车", "健身操", "八段锦", "太极拳", "五禽戏", "健身器械（踏车、椭圆机）", "其他"]} selected={aerobicModes} setSelected={setAerobicModes} intensity={aerobicIntensity} setIntensity={setAerobicIntensity} frequency={aerobicFrequency} setFrequency={setAerobicFrequency} time={aerobicTime} setTime={setAerobicTime} disabled={readonly} />
            <TemplateRow title="抗阻训练" options={["哑铃", "弹力带", "绑腿沙袋", "下肢静蹲"]} selected={resistanceModes} setSelected={setResistanceModes} intensity={resistanceIntensity} setIntensity={setResistanceIntensity} frequency={resistanceFrequency} setFrequency={setResistanceFrequency} time={resistanceTime} setTime={setResistanceTime} disabled={readonly} />
            <TemplateRow title="柔韧性训练" options={["颈部肌肉牵伸", "躯干肌肉牵伸", "上肢肌肉牵伸", "下肢肌肉牵伸"]} selected={flexibilityModes} setSelected={setFlexibilityModes} intensity={flexibilityIntensity} setIntensity={setFlexibilityIntensity} frequency={flexibilityFrequency} setFrequency={setFlexibilityFrequency} time={flexibilityTime} setTime={setFlexibilityTime} disabled={readonly} />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <AdviceField label="备注与注意事项" value={remark} setValue={setRemark} disabled={readonly} />
            </div>
          </div>

          <div className="prescription-action-bar">
            <label className="flex max-w-xl items-start gap-3">
              <input type="checkbox" checked={confirmChecked || readonly} onChange={(event) => setConfirmChecked(event.target.checked)} disabled={readonly} className="mt-0.5 h-4 w-4 accent-blue-600" />
              <span className="text-[10px] leading-5 text-slate-600">我已核对评估依据、安全事件和处方内容，并确认当前内容由医生作出临床判断。</span>
            </label>
            <div className="text-xs text-slate-500">{readonly ? <span className="flex items-center gap-2 font-bold text-emerald-700"><BadgeCheck className="h-4 w-4" />已签署归档，只能查看</span> : "未完成处方可编辑和保存；确认完成后自动数字签名"}</div>
            <div className="flex shrink-0 gap-2">
              {!readonly && <button type="button" className="btn-secondary" onClick={saveDraft}><PenTool className="h-4 w-4" />保存草稿</button>}
              {!readonly && <button type="button" className="btn-primary" disabled={!confirmChecked || hasBlockingMissing} onClick={confirmAndSign}><Check className="h-4 w-4" />确认完成并签署</button>}
              {readonly && <button type="button" className="btn-primary" onClick={() => setShowFinalPrescription(true)}><Printer className="h-4 w-4" />查看/打印正式处方</button>}
            </div>
          </div>
          <FinalPrescriptionPrintContent task={task} document={prescriptionDocument} signed={readonly || showFinalPrescription} />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-4">
              <SectionHeader title="患者临床摘要" description="签署前请核对关键信息" action={<HeartPulse className="h-4 w-4 text-blue-600" />} />
              <button type="button" onClick={() => onOpenPatient(task.patientId)} className="btn-secondary w-full"><Search className="h-4 w-4" />查看完整患者档案</button>
            </div>
            <div className="space-y-2 p-4">
              <Evidence label="患者" value={`${task.patientName} · ${task.sex} · ${task.age}岁`} />
              <Evidence label="患者编码" value={task.patientId} />
              <Evidence label="危险分组" value={task.risk} warning={task.risk === "高危"} />
              <Evidence label="病史" value={clinicalSnapshotChen.medicalHistory} stacked />
              <Evidence label="诊断" value={clinicalSnapshotChen.diagnosis} stacked />
              <Evidence label="特殊用药" value={clinicalSnapshotChen.specialMedications.join("、")} stacked />
            </div>
          </section>

          {hasBlockingMissing && <Notice tone="orange" title="关键评估缺失">{task.missingFields?.join("、")}。当前可保存草稿，补齐前不可确认签署。</Notice>}

          <section className="card overflow-hidden">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="rounded-lg bg-blue-600 p-2 text-white"><Bot className="h-4 w-4" /></span><div><p className="text-sm font-bold text-slate-900">AI 复核建议</p><p className="mt-0.5 text-[10px] text-slate-500">辅助信息，不替代医生判断</p></div></div>
                <Sparkles className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="space-y-3 p-4 text-xs leading-5 text-slate-600">
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="font-bold text-blue-900">建议参数</p>
                <p className="mt-1">维持功率车训练，靶心率 100–116 次/分钟，训练 30 分钟/次。</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[10px] font-bold text-slate-400">上一版参考</p>
                <p className="mt-1 font-semibold text-slate-800">{previousVersion.version} · {previousVersion.targetHr.join("–")} 次/分钟 · {previousVersion.targetPower.join("–")} W</p>
              </div>
              {linkedSafetyEvents.map((event) => <div key={event.id} className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-800"><b>{event.type}</b><p className="mt-1">{event.metricSnapshot}；{event.doctorReview}；{event.prescriptionImpact}</p></div>)}
              <p className="rounded-xl bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">正式处方以医生核对、修改和签署后的内容为准。</p>
            </div>
          </section>
        </aside>
      </div>
      {showFinalPrescription && <FinalPrescriptionPage task={task} document={prescriptionDocument} signed onClose={() => setShowFinalPrescription(false)} onPrint={printPrescription} />}
    </section>
  );
}

function Evidence({ label, value, warning = false, stacked = false }: { label: string; value: string; warning?: boolean; stacked?: boolean }) {
  return <div className={`${stacked ? "block" : "flex items-center justify-between gap-3"} rounded-xl border px-3 py-2.5 ${warning ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}><span className="text-[10px] text-slate-500">{label}</span><b className={`${stacked ? "mt-1 block text-xs leading-5" : "text-right text-xs"} ${warning ? "text-amber-800" : "text-slate-800"}`}>{value}</b></div>;
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

function CheckboxOptions({ title, options, selected, setSelected, disabled }: { title: string; options: string[]; selected: string[]; setSelected: (value: string[]) => void; disabled: boolean }) {
  function toggle(option: string) {
    setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }
  return (
    <section className="prescription-form-section">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">{title}</p><span className="text-[10px] text-slate-400">已选 {selected.length} 项</span></div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => <label key={option} className={`prescription-option ${selected.includes(option) ? "prescription-option-selected" : ""}`}><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} disabled={disabled} className="sr-only" />{selected.includes(option) && <Check className="h-3 w-3" />}{option}</label>)}
      </div>
    </section>
  );
}

function TemplateRow({ title, options, selected, setSelected, intensity, setIntensity, frequency, setFrequency, time, setTime, disabled }: { title: string; options: string[]; selected: string[]; setSelected: (value: string[]) => void; intensity: string; setIntensity: (value: string) => void; frequency: string; setFrequency: (value: string) => void; time: string; setTime: (value: string) => void; disabled: boolean }) {
  return (
    <section className="prescription-form-section">
      <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Activity className="h-3.5 w-3.5" /></span><p className="text-sm font-bold text-slate-900">{title}</p></div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-[1.2fr_1fr_0.68fr_0.68fr]">
        <div><span className="field-label">运动方式</span><div className="min-h-[56px] rounded-[10px] border border-[#d5e1e7] bg-white p-3"><div className="flex flex-wrap gap-x-4 gap-y-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={selected.includes(option)} onChange={() => setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} disabled={disabled} className="accent-blue-600" />{option}</label>)}</div></div></div>
        <PrescriptionField label="运动强度" value={intensity} setValue={setIntensity} disabled={disabled || title === "热身运动"} />
        <PrescriptionField label="运动频率" value={frequency} setValue={setFrequency} disabled={disabled} />
        <PrescriptionField label="运动时间" value={time} setValue={setTime} disabled={disabled} />
      </div>
    </section>
  );
}

function FinalPrescriptionPrintContent({ task, document, signed }: { task: PrescriptionTask; document: PrescriptionDocument; signed: boolean }) {
  return (
    <div className="print-only">
      <h2>处方内容</h2>
      <p>患者编码：{task.patientId}　姓名：{task.patientName}　性别：{task.sex}　年龄：{task.age}　身高：{document.height}cm　体重：{clinicalSnapshotChen.weightKg}kg　BMI：{clinicalSnapshotChen.bmi}　联系方式：{document.contact}　身份证号：{document.identityNo}</p>
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
              <span>患者编码：{task.patientId}</span><span>姓名：{task.patientName}</span><span>性别：{task.sex}</span><span>年龄：{task.age}</span>
              <span>身高：{document.height}cm</span><span>体重：{clinicalSnapshotChen.weightKg}kg</span><span>BMI：{clinicalSnapshotChen.bmi}</span><span>联系方式：{document.contact}</span><span className="col-span-2">身份证号：{document.identityNo}</span>
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
