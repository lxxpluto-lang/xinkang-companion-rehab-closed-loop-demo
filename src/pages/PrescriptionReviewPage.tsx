import { useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarRange, Check, FileText, PenTool, Printer, ShieldAlert, Signature, Sparkles } from "lucide-react";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels } from "../prescriptionData";
import { AiBadge, Notice, PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, minimalSafetyEvents } from "../clinicalSharedData";

export function PrescriptionReviewPage({
  task,
  onBack,
  onConfirm,
  onSign,
  onOpenReport
}: {
  task: PrescriptionTask;
  onBack: () => void;
  onConfirm: (taskId: string) => void;
  onSign: (taskId: string) => void;
  onOpenReport: () => void;
}) {
  const locked = task.status === "pending_signature" || task.status === "completed";
  const [reportTab, setReportTab] = useState<"stage" | "single">(task.sourceType === "single_report" ? "single" : "stage");
  const [exercise, setExercise] = useState("功率车连续训练");
  const [frequency, setFrequency] = useState("每周 3 次");
  const [warmup, setWarmup] = useState("5");
  const [training, setTraining] = useState("22");
  const [cooldown, setCooldown] = useState("5");
  const [targetHr, setTargetHr] = useState("100–116 bpm");
  const [power, setPower] = useState(task.kind === "initial" ? "30–45 W" : "50–70 W");
  const [rpe, setRpe] = useState("11–13");
  const [notes, setNotes] = useState("训练期间如出现持续胸闷、胸痛、明显气促、头晕或心悸，应立即停止并通知现场医护。");
  const [rehabGoal, setRehabGoal] = useState("改善症状、提高体能、改善心功能、预防支架内再狭窄");
  const [breathingPlan, setBreathingPlan] = useState("腹式呼吸练习；吸气时鼓起肚子，呼气时缩紧肚子，呼气/吸气时间比≥3:1；每天2次，每次10分钟。");
  const [warmupPlan, setWarmupPlan] = useState("原地踏步、肩部热身、扩胸运动、四肢伸展、手腕踝关节活动；每次5分钟。");
  const [aerobicPlan, setAerobicPlan] = useState("功率车连续训练；运动时可正常语速交流但不能轻松唱歌。");
  const [resistancePlan, setResistancePlan] = useState("弹力带/哑铃低阻力训练；每周2次，每次4种动作，每种动作2组，每组10个；呼气发力、吸气放松。");
  const [flexibilityPlan, setFlexibilityPlan] = useState("颈部、躯干、上肢、下肢肌肉牵伸；每组肌肉拉伸3次，每次15-30秒；有氧或抗阻训练后进行。");
  const [planRemark, setPlanRemark] = useState("此方案为4-8周计划，应根据训练反馈适时进阶；心脏康复需在病情允许且医学监测或家庭监护下安全进行，如出现任何不适请立即停止并就近就医。");
  const previousVersionKey = task.previousVersionId?.match(/V[1-4]/)?.[0] ?? (task.kind === "initial" ? "V1" : "V4");
  const previousVersion = getPrescriptionVersionDetail(previousVersionKey);
  const linkedSafetyEvents = minimalSafetyEvents.filter((event) => event.patientId === task.patientId);
  const [rehabContraindications, setRehabContraindications] = useState(previousVersion.advice.rehabContraindications);
  const [dietCautions, setDietCautions] = useState(previousVersion.advice.dietCautions);
  const [exerciseCautions, setExerciseCautions] = useState(previousVersion.advice.exerciseCautions);
  const [stopConditions, setStopConditions] = useState(previousVersion.advice.stopConditions);
  const [medicationAdvice, setMedicationAdvice] = useState(previousVersion.advice.medicationAdvice);
  const [patientInstruction, setPatientInstruction] = useState(previousVersion.advice.patientInstruction);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const hasBlockingMissing = Boolean(task.missingFields?.length);

  function printPrescription() {
    document.body.classList.add("printing-prescription");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-prescription"), 300);
  }

  return (
    <section data-testid="page-VIEW-PRESCRIPTION-REVIEW">
      <PageHeader eyebrow={task.kind === "initial" ? "初始处方录入" : "报告驱动调整处方"} title={`${task.patientName} · ${task.version}`} description={task.kind === "initial" ? "基于首次基线评估由康复医生人工录入，不强制使用AI。" : "先核对报告、上一版处方与安全事件，再复核AI处方草稿。"} action={<button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回处方列表</button>} />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {["报告/评估依据", "医生复核处方", "确认参数", "数字签名"].map((label, index) => {
          const current = task.status === "pending_review" ? 1 : task.status === "pending_signature" ? 3 : task.status === "completed" ? 4 : 0;
          const done = index < current;
          return <div key={label} className="flex flex-1 items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : index === current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={done || index === current ? "font-bold text-slate-700" : "text-slate-400"}>{label}</span>{index < 3 && <span className="ml-auto h-px flex-1 bg-slate-200" />}</div>;
        })}
      </div>

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-5">
        <div className="space-y-4">
          <section className="card p-5">
            <SectionHeader title="病人报告列表" description="处方必须能追溯到单次报告、阶段性报告或首次基线评估。" action={task.kind === "adjustment" ? <AiBadge /> : <StatusBadge tone="blue">医生录入</StatusBadge>} />
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={onOpenReport} className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-left hover:border-blue-200"><CalendarRange className="h-4 w-4 text-blue-700" /><p className="mt-2 text-xs font-bold text-blue-900">阶段性报告列表</p><p className="mt-1 text-[10px] leading-4 text-blue-700">{task.sourceType === "stage_report" ? task.sourceLabel : "查看历史阶段报告"}</p></button>
              <button type="button" onClick={onOpenReport} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-left hover:border-emerald-200"><FileText className="h-4 w-4 text-emerald-700" /><p className="mt-2 text-xs font-bold text-emerald-900">单次报告列表</p><p className="mt-1 text-[10px] leading-4 text-emerald-700">{task.sourceType === "single_report" ? task.sourceLabel : "查看功率车单次报告"}</p></button>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-3">
              <Evidence label="病史记录" value={clinicalSnapshotChen.medicalHistory} />
              <Evidence label="诊断内容" value={clinicalSnapshotChen.diagnosis} />
              <Evidence label="特殊用药" value={clinicalSnapshotChen.specialMedications.join("、")} />
            </div>
            {task.kind === "adjustment" ? (
              <>
                <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
                  <button type="button" onClick={() => setReportTab("stage")} className={`flex-1 rounded-md px-3 py-2 font-bold ${reportTab === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段性报告</button>
                  <button type="button" onClick={() => setReportTab("single")} className={`flex-1 rounded-md px-3 py-2 font-bold ${reportTab === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>单次报告</button>
                </div>
                {reportTab === "stage" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-blue-50 p-4"><p className="font-bold text-blue-900">阶段结论</p><p className="mt-2 leading-6 text-slate-600">运动耐量提高，生命体征总体平稳；相同心率下平均功率较V1提高20W，建议小幅增加主训练功率。</p></div>
                    <Evidence label="计划完成" value="11 / 12 次 · 92%" />
                    <Evidence label="靶区达标" value="84% · 较上阶段 +6%" />
                    <Evidence label="平均 RPE" value="11.2 · 可耐受" />
                    <Evidence label="安全事件" value="1次胸闷 · 复核后无持续症状" warning />
                  </div>
                ) : (
                  <div className="space-y-3"><div className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-800">最近一次 · 07-28功率车</p><p className="mt-2 leading-6 text-slate-600">完成32分钟，靶区时间22分18秒，平均心率106 bpm，RPE 11，无提前终止。</p></div><Evidence label="训练后血压" value="128 / 76 mmHg" /><Evidence label="最低血氧" value="96%" /><Evidence label="数据完整度" value="96%" /></div>
                )}
                <div className="mt-4 border-t border-slate-100 pt-4"><p className="font-bold text-slate-700">上一版本 · {task.previousVersionId}</p><p className="mt-2 text-xs leading-5 text-slate-500">功率车连续训练 · 45–65W · 靶心率98–114 bpm · 每周3次 · 总时长30分钟</p></div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Evidence label="上次诊断建议" value={previousVersion.advice.diagnosisAdvice} />
                  <Evidence label="上次用药建议" value={previousVersion.advice.medicationAdvice} />
                  <Evidence label="上次注意事项" value={previousVersion.advice.patientInstruction} />
                </div>
                {linkedSafetyEvents.length > 0 && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800">
                  <p className="font-bold">安全事件与处方影响</p>
                  {linkedSafetyEvents.map((event) => <p key={event.id} className="mt-2">{event.type} · {event.metricSnapshot}；现场处置：{event.fieldAction}；医生复核：{event.doctorReview}；{event.prescriptionImpact}</p>)}
                </div>}
              </>
            ) : (
              <div className="space-y-3">
                <Evidence label="诊断摘要" value="冠心病 PCI 术后，Ⅱ期院内康复" />
                <Evidence label="静息心率" value="79 bpm" />
                <Evidence label="6分钟步行" value={hasBlockingMissing ? "待补充" : "418 m"} warning={hasBlockingMissing} />
                <Evidence label="CPET" value={hasBlockingMissing ? "未完成" : "峰值 VO₂ 17.8 mL/kg/min"} warning={hasBlockingMissing} />
                <Evidence label="危险分组" value={`${task.risk} · 需医生人工判断`} warning={task.risk === "高危"} />
              </div>
            )}
          </section>
          {hasBlockingMissing && <Notice tone="orange" title="关键评估缺失">{task.missingFields?.join("、")}。允许保存处方草稿，但补充并复核前不能确认或签名。</Notice>}
          {task.kind === "adjustment" && <section className="card p-5"><SectionHeader title="AI生成建议和提示" action={<Sparkles className="h-4 w-4 text-blue-600" />} /><p className="leading-6 text-slate-600">建议主训练功率由45–65W调整至50–70W，靶心率上限增加2 bpm，训练时间增加2分钟；频次保持不变。</p><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><Evidence label="为什么需要开方" value="阶段报告已完成且上一版本需复核/调整" /><Evidence label="AI依据" value="阶段报告、上一处方、安全事件、主诉和缺失数据" warning /></div><p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">AI仅生成可编辑草稿，不自动形成医嘱。医生必须核对安全事件、用药变化和患者主诉。</p></section>}
        </div>

        <section id="printable-prescription" className="card p-5">
          <div className="print-only"><h1>心脏康复中心运动处方</h1><p>处方编号：{task.id}　患者：{task.patientName}　性别：{task.sex}　年龄：{task.age}岁　BMI：{clinicalSnapshotChen.bmi}</p><p>处方依据：{task.sourceLabel}</p></div>
          <SectionHeader title="心脏康复中心运动处方模板" description={locked ? "参数已确认锁定，如需调整必须创建新版本。" : "参考附件模板，AI自动填入后由医生逐项调整。"} action={<StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>} />
          <label className="mb-4 block"><span className="field-label">康复目标</span><input className="text-field disabled:bg-slate-50" value={rehabGoal} onChange={(event) => setRehabGoal(event.target.value)} disabled={locked} /></label>
          <div className="grid grid-cols-2 gap-4">
            <PrescriptionField label="运动项目" value={exercise} setValue={setExercise} disabled={locked} />
            <PrescriptionField label="每周频次" value={frequency} setValue={setFrequency} disabled={locked} />
            <PrescriptionField label="热身时间（分钟）" value={warmup} setValue={setWarmup} disabled={locked} />
            <PrescriptionField label="主训练时间（分钟）" value={training} setValue={setTraining} disabled={locked} />
            <PrescriptionField label="放松时间（分钟）" value={cooldown} setValue={setCooldown} disabled={locked} />
            <PrescriptionField label="靶心率区间" value={targetHr} setValue={setTargetHr} disabled={locked} />
            <PrescriptionField label="目标功率" value={power} setValue={setPower} disabled={locked} />
            <PrescriptionField label="RPE目标" value={rpe} setValue={setRpe} disabled={locked} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <AdviceField label="呼吸训练" value={breathingPlan} setValue={setBreathingPlan} disabled={locked} />
            <AdviceField label="热身运动" value={warmupPlan} setValue={setWarmupPlan} disabled={locked} />
            <AdviceField label="有氧运动" value={aerobicPlan} setValue={setAerobicPlan} disabled={locked} />
            <AdviceField label="抗阻训练" value={resistancePlan} setValue={setResistancePlan} disabled={locked} />
            <AdviceField label="柔韧性训练" value={flexibilityPlan} setValue={setFlexibilityPlan} disabled={locked} />
            <AdviceField label="4-8周计划备注" value={planRemark} setValue={setPlanRemark} disabled={locked} />
          </div>
          <label className="mt-4 block"><span className="field-label">注意事项与停止条件</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={locked} className="text-field min-h-20 resize-none disabled:bg-slate-50" /></label>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <SectionHeader title="患者可读建议" description="这些内容会同步到患者端处方确认与报告页，用通俗语言说明康复忌讳、饮食和运动注意。" />
            <div className="grid grid-cols-2 gap-4">
              <AdviceField label="康复期间忌讳" value={rehabContraindications} setValue={setRehabContraindications} disabled={locked} />
              <AdviceField label="饮食注意" value={dietCautions} setValue={setDietCautions} disabled={locked} />
              <AdviceField label="运动注意" value={exerciseCautions} setValue={setExerciseCautions} disabled={locked} />
              <AdviceField label="停止运动/联系医护条件" value={stopConditions} setValue={setStopConditions} disabled={locked} />
              <AdviceField label="用药相关提醒" value={medicationAdvice} setValue={setMedicationAdvice} disabled={locked} />
              <AdviceField label="写给患者的话" value={patientInstruction} setValue={setPatientInstruction} disabled={locked} />
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <label className="flex items-start gap-3"><input type="checkbox" checked={confirmChecked || locked} onChange={(event) => setConfirmChecked(event.target.checked)} disabled={locked} className="mt-0.5 accent-blue-600" /><span className="text-xs leading-5 text-slate-600">我已核对报告/评估依据、危险分组、运动强度、时长、频次及安全注意事项，确认当前内容由医生作出临床判断。</span></label>
          </div>
          {(task.status === "pending_signature" || task.status === "completed") && <PrescriptionPdfPreview task={task} rehabGoal={rehabGoal} exercise={exercise} frequency={frequency} warmup={warmup} training={training} cooldown={cooldown} targetHr={targetHr} power={power} rpe={rpe} breathingPlan={breathingPlan} aerobicPlan={aerobicPlan} resistancePlan={resistancePlan} flexibilityPlan={flexibilityPlan} notes={notes} signed={task.status === "completed"} />}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="text-xs text-slate-500">{task.status === "completed" ? <span className="flex items-center gap-2 font-bold text-emerald-700"><BadgeCheck className="h-4 w-4" />{task.signedBy ?? task.confirmedBy ?? "签署医生"} · CA签名有效</span> : task.status === "pending_signature" ? `处方参数已锁定，等待数字签名${task.confirmedBy ? ` · 复核人：${task.confirmedBy}` : ""}` : "确认后生成下一正式版本"}</div>
            <div className="flex gap-2">
              {task.status === "pending_review" && <button type="button" className="btn-primary" disabled={!confirmChecked || hasBlockingMissing} onClick={() => onConfirm(task.id)}><PenTool className="h-4 w-4" />确认处方参数</button>}
              {task.status === "pending_signature" && <button type="button" className="btn-primary" onClick={() => onSign(task.id)}><Signature className="h-4 w-4" />完成数字签名</button>}
              {task.status === "completed" && <button type="button" className="btn-primary" onClick={printPrescription}><Printer className="h-4 w-4" />打印正式处方</button>}
            </div>
          </div>
          <div className="print-only"><h2>处方内容</h2><p>康复目标：{rehabGoal}</p><p>呼吸训练：{breathingPlan}</p><p>热身运动：{warmupPlan}</p><p>有氧运动：{aerobicPlan}；{frequency}；{warmup}+{training}+{cooldown}分钟；靶心率 {targetHr}；功率 {power}；RPE {rpe}</p><p>抗阻训练：{resistancePlan}</p><p>柔韧性训练：{flexibilityPlan}</p><p>备注：{planRemark}</p></div>
          <div className="print-only prescription-sign-line"><span>制定者：{task.signedBy ?? task.confirmedBy ?? "待签署"}</span><span>数字签名：{task.signatureStatus === "signed" ? "已签名（CA验证有效）" : "未签名"}</span><span className="signature-script">王医生</span><span>制定日期：2026.07.29</span></div>
          <div className="print-only"><h2>患者注意事项</h2><p>康复忌讳：{rehabContraindications}</p><p>饮食注意：{dietCautions}</p><p>运动注意：{exerciseCautions}</p><p>停止条件：{stopConditions}</p><p>用药提醒：{medicationAdvice}</p><p>患者说明：{patientInstruction}</p></div>
        </section>
      </div>
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

function PrescriptionPdfPreview({
  task,
  rehabGoal,
  exercise,
  frequency,
  warmup,
  training,
  cooldown,
  targetHr,
  power,
  rpe,
  breathingPlan,
  aerobicPlan,
  resistancePlan,
  flexibilityPlan,
  notes,
  signed
}: {
  task: PrescriptionTask;
  rehabGoal: string;
  exercise: string;
  frequency: string;
  warmup: string;
  training: string;
  cooldown: string;
  targetHr: string;
  power: string;
  rpe: string;
  breathingPlan: string;
  aerobicPlan: string;
  resistancePlan: string;
  flexibilityPlan: string;
  notes: string;
  signed: boolean;
}) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-xs font-bold text-blue-700">PDF预览</p><p className="mt-1 text-[10px] text-slate-500">签名完成后生成正式版，可直接打印。</p></div>
        <StatusBadge tone={signed ? "green" : "orange"}>{signed ? "已签名，可打印" : "待数字签名"}</StatusBadge>
      </div>
      <div className="rounded-lg bg-white p-5 text-xs leading-6 text-slate-700 shadow-sm">
        <h3 className="text-center text-lg font-bold text-slate-950">心脏康复中心运动处方</h3>
        <div className="mt-4 grid grid-cols-4 gap-2 border-y border-slate-200 py-3">
          <span>姓名：{task.patientName}</span><span>性别：{task.sex}</span><span>年龄：{task.age}岁</span><span>BMI：{clinicalSnapshotChen.bmi}</span>
        </div>
        <p className="mt-3"><b>康复目标：</b>{rehabGoal}</p>
        <p><b>呼吸训练：</b>{breathingPlan}</p>
        <p><b>有氧运动：</b>{exercise}；{aerobicPlan}；{frequency}；{warmup}+{training}+{cooldown}分钟；靶心率 {targetHr}；功率 {power}；RPE {rpe}</p>
        <p><b>抗阻训练：</b>{resistancePlan}</p>
        <p><b>柔韧性训练：</b>{flexibilityPlan}</p>
        <p><b>注意事项：</b>{notes}</p>
        <div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-4">
          <span>制定者：{task.signedBy ?? task.confirmedBy ?? "待签署"}</span>
          <span>数字签名：{signed ? "已签名（CA验证有效）" : "未签名"}</span>
          <span className={`signature-script text-2xl ${signed ? "text-slate-950" : "text-slate-300"}`}>王医生</span>
          <span>制定日期：2026.07.29</span>
        </div>
      </div>
    </section>
  );
}
