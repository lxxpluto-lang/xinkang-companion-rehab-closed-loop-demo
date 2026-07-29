import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  FileText,
  HeartPulse,
  Pill,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  X
} from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import {
  getPrescriptionVersionDetail,
  getSingleTrainingReportDetail,
  minimalSafetyEvents,
  prescriptionVersionDetails,
  singleTrainingReportDetails,
  type PrescriptionVersionDetail
} from "../clinicalSharedData";
import { stageReportData } from "../patient/stageReportData";

const stageReports = [
  { id: "STAGE-202607", taskId: "RX-TASK-001", patientId: "P-DEMO-001", patient: "陈女士", date: "07-01 至 07-25", exercise: "功率车 V1–V4", duration: "11/12次", target: "84%", risk: "1项已复核", status: "处方待复核" },
  { id: "STAGE-202607-003", taskId: "RX-TASK-003", patientId: "P-DEMO-003", patient: "王先生", date: "07-05 至 07-28", exercise: "功率车 V1–V3", duration: "9/10次", target: "78%", risk: "无重大异常", status: "处方待签名" },
  { id: "STAGE-202607-005", taskId: "RX-TASK-005", patientId: "P-DEMO-005", patient: "周先生", date: "06-20 至 07-25", exercise: "综合运动 V1–V4", duration: "12/12次", target: "88%", risk: "无异常", status: "处方已完成" }
];

export function ReportPage({ onCreatePrescription, initialPatientId = "", standalone = false }: { onCreatePrescription: (taskId: string) => void; initialPatientId?: string; standalone?: boolean }) {
  const [tab, setTab] = useState<"stage" | "single">("stage");
  const [query, setQuery] = useState(initialPatientId);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedSingleId, setSelectedSingleId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PrescriptionVersionDetail | null>(null);
  const filteredStageReports = useMemo(() => stageReports.filter((report) => {
    const keyword = query.trim().toLowerCase();
    return !keyword || `${report.patient}${report.patientId}${report.id}`.toLowerCase().includes(keyword);
  }), [query]);
  const filteredSingleReports = useMemo(() => singleTrainingReportDetails.filter((report) => {
    const keyword = query.trim().toLowerCase();
    return !keyword || `${report.clinicalSnapshot.name}${report.patientId}${report.id}`.toLowerCase().includes(keyword);
  }), [query]);
  const selectedStage = selectedStageId ? stageReports.find((report) => report.id === selectedStageId) ?? null : null;
  const selectedSingle = selectedSingleId ? getSingleTrainingReportDetail(selectedSingleId) : null;

  function switchTab(next: "stage" | "single") {
    setTab(next);
    setSelectedSingleId(null);
  }

  return (
    <section data-testid="page-VIEW-REPORT-CENTER">
      <PageHeader eyebrow={standalone ? "患者报告独立查询页" : "报告中心"} title={standalone ? `患者 ${initialPatientId} · 报告查询` : "训练报告与处方依据"} description={standalone ? "本页面由处方复核页打开，仅展示该患者编码关联的报告。" : "阶段性报告与单次报告均先列表查询，再点击进入完整报告。"} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => switchTab("stage")} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold ${tab === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><CalendarRange className="h-4 w-4" />阶段性报告</button>
        <button type="button" onClick={() => switchTab("single")} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold ${tab === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><FileText className="h-4 w-4" />单次报告</button>
        </div>
        <label className="flex w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedStageId(null); setSelectedSingleId(null); }} placeholder="按患者姓名或患者编码查询" className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none" />
        </label>
      </div>

      {tab === "single" ? (
        selectedSingle ? <DoctorSingleReportDetail reportId={selectedSingle.id} onBack={() => setSelectedSingleId(null)} onCreatePrescription={onCreatePrescription} />
          : <DoctorSingleReportList reports={filteredSingleReports} onSelect={setSelectedSingleId} />
      ) : (
        selectedStage
          ? <StageReportPanel selected={selectedStage} onBack={() => setSelectedStageId(null)} onCreatePrescription={onCreatePrescription} onOpenVersion={setSelectedVersion} />
          : <DoctorStageReportList reports={filteredStageReports} onSelect={setSelectedStageId} />
      )}
      {selectedVersion && <PrescriptionVersionModal version={selectedVersion} onClose={() => setSelectedVersion(null)} />}
    </section>
  );
}

function DoctorStageReportList({ reports, onSelect }: { reports: typeof stageReports; onSelect: (reportId: string) => void }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionHeader title="阶段性报告列表" description="点击记录进入完整阶段报告，与单次报告采用一致的列表—详情方式。" /></div>
      <div className="grid grid-cols-[0.85fr_0.78fr_0.8fr_1fr_0.65fr_0.58fr_0.78fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
        <span>患者姓名</span><span>患者编码</span><span>报告编号</span><span>日期范围 / 运动</span><span>完成情况</span><span>靶区</span><span>状态 / 查看</span>
      </div>
      {reports.map((report) => (
        <button type="button" onClick={() => onSelect(report.id)} key={report.id} className="grid w-full grid-cols-[0.85fr_0.78fr_0.8fr_1fr_0.65fr_0.58fr_0.78fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50">
          <b className="text-slate-900">{report.patient}</b><span className="font-mono text-[10px] text-slate-500">{report.patientId}</span><span className="font-mono text-[10px] text-slate-500">{report.id}</span>
          <span className="text-slate-600">{report.date}<small className="mt-1 block text-[10px] text-slate-400">{report.exercise}</small></span><span>{report.duration}</span><b className="text-blue-700">{report.target}</b>
          <span className="font-bold text-blue-700">{report.status} <ArrowRight className="inline h-3.5 w-3.5" /></span>
        </button>
      ))}
      {reports.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">未查询到该患者的阶段性报告。</div>}
    </section>
  );
}

function DoctorSingleReportList({ reports, onSelect }: { reports: typeof singleTrainingReportDetails; onSelect: (reportId: string) => void }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionHeader title="单次训练报告列表" description="点击记录进入完整报告，查看实际心率、血压测量点与临床上下文。" /></div>
      <div className="grid grid-cols-[0.74fr_0.74fr_0.8fr_0.92fr_0.62fr_0.68fr_0.58fr_0.7fr_0.72fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
        <span>患者姓名</span><span>患者编码</span><span>报告编号</span><span>训练时间</span><span>运动项目</span><span>类型</span><span>总时长</span><span>平均心率</span><span>状态 / 查看</span>
      </div>
      {reports.map((report) => (
        <button type="button" onClick={() => onSelect(report.id)} key={report.id} className="grid w-full grid-cols-[0.74fr_0.74fr_0.8fr_0.92fr_0.62fr_0.68fr_0.58fr_0.7fr_0.72fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50">
          <b className="text-slate-900">{report.clinicalSnapshot.name}</b><span className="font-mono text-[10px] text-slate-500">{report.patientId}</span><span className="font-mono text-[10px] text-slate-500">{report.id}</span>
          <span>{report.dateTime}</span><span className="font-bold text-slate-700">{report.exercise}</span><span>{report.trainingType}</span><span>{report.totalMinutes}分钟</span><span>{report.hrStats.average} bpm</span>
          <span className="font-bold text-blue-700">{report.status} <ArrowRight className="inline h-3.5 w-3.5" /></span>
        </button>
      ))}
      {reports.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">未查询到该患者的单次报告。</div>}
    </section>
  );
}

function DoctorSingleReportDetail({ reportId, onBack, onCreatePrescription }: { reportId: string; onBack: () => void; onCreatePrescription: (taskId: string) => void }) {
  const report = getSingleTrainingReportDetail(reportId);
  const prescription = getPrescriptionVersionDetail(report.prescriptionVersionId);
  const linkedSafetyEvent = minimalSafetyEvents.find((event) => event.sessionId === report.id);
  const isDemoData = report.dataMode === "demo" || !report.sampleSeries?.length;
  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="返回单次报告列表"><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-bold text-blue-600">单次报告 · {report.id}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{report.clinicalSnapshot.name} · {report.exercise}训练详情</h2></div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={isDemoData ? "orange" : "blue"}>{isDemoData ? "Demo 数据" : "设备采样"}</StatusBadge>
            <StatusBadge tone={report.safetySummary.includes("无") ? "green" : "orange"}>{report.safetySummary}</StatusBadge>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">{report.dataSourceNote}</p>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            ["患者姓名", report.clinicalSnapshot.name],
            ["年龄 / 性别", `${report.clinicalSnapshot.age}岁 · ${report.clinicalSnapshot.sex}`],
            ["体重 / BMI", `${report.clinicalSnapshot.weightKg}kg · ${report.clinicalSnapshot.bmi}`],
            ["危险分组", report.clinicalSnapshot.riskLevel]
          ].map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <ClinicalContextCard icon={<Stethoscope className="h-4 w-4" />} label="病史" value={report.clinicalSnapshot.medicalHistory} />
          <ClinicalContextCard icon={<Activity className="h-4 w-4" />} label="诊断" value={report.clinicalSnapshot.diagnosis} />
          <ClinicalContextCard icon={<Pill className="h-4 w-4" />} label="特殊用药" value={report.clinicalSnapshot.specialMedications.join("、")} />
        </div>
      </section>

      <div className="grid grid-cols-[0.78fr_1.22fr] gap-5">
        <section className="card p-5">
          <SectionHeader title="实际心率指标" description="以设备采集心率为主，结合处方靶区判断运动剂量。" action={<HeartPulse className="h-4 w-4 text-rose-500" />} />
          <div className="grid grid-cols-2 gap-3">
            {[
              ["静息心率", `${report.hrStats.resting} bpm`],
              ["平均心率", `${report.hrStats.average} bpm`],
              ["峰值心率", `${report.hrStats.peak} bpm`],
              ["靶区范围", `${report.hrStats.targetRange[0]}–${report.hrStats.targetRange[1]} bpm`],
              ["靶区时间", `${report.hrStats.targetZoneMinutes} 分钟`],
              ["超靶区时间", `${report.hrStats.aboveTargetMinutes} 分钟`]
            ].map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">{report.executionSummary}</div>
        </section>
        <section className="card p-5">
          <SectionHeader title="实际血压测量" description="血压为间歇测量，必须展示测量时间，不按连续曲线解释。" />
          <div className="grid grid-cols-3 gap-3">
            {report.bpMeasurements.map((item) => (
              <div key={item.phase} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-bold text-slate-400">{item.phase} · {item.time}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-400"><span>分期指标</span><span>热身期</span><span>训练期</span><span>放松期</span></div>
            {report.phaseVitals.map((row) => <div key={row.metric} className="grid grid-cols-[1fr_1fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><b className="text-slate-800">{row.metric}</b><span>{row.warmup}</span><span>{row.training}</span><span>{row.cooldown}</span></div>)}
          </div>
          {linkedSafetyEvent && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800">
            <b>异常闭环：</b>{linkedSafetyEvent.type} · {linkedSafetyEvent.metricSnapshot}<br />
            <b>现场处置：</b>{linkedSafetyEvent.fieldAction}<br />
            <b>医生复核：</b>{linkedSafetyEvent.doctorReview}
          </div>}
        </section>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <section className="card p-5">
          <SectionHeader title="处方与执行" description={`关联处方：${prescription.version} · ${prescription.issuedAt}`} />
          <div className="grid grid-cols-4 gap-3">
            {[
              ["热身", `${prescription.warmupMinutes} 分钟`],
              ["训练", `${prescription.trainingMinutes} 分钟`],
              ["放松", `${prescription.cooldownMinutes} 分钟`],
              ["靶心率", `${prescription.targetHr[0]}–${prescription.targetHr[1]} bpm`]
            ].map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{prescription.advice.exerciseCautions}</p>
        </section>
        <section className="card p-5">
          <SectionHeader title="心电、血氧与处置摘要" description="心电展示事件与复核结果，不生成稳定度曲线。" />
          <div className="space-y-3">
            <ClinicalContextCard label="心电监测" value={report.ecgSummary} />
            <ClinicalContextCard label="血氧摘要" value={report.spo2Summary} />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[0.7fr_1.2fr_1.35fr_0.65fr] bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-400"><span>时间</span><span>事件</span><span>处置</span><span>复核</span></div>
            {(report.ecgEvents ?? []).map((event) => (
              <div key={`${event.time}-${event.event}`} className="grid grid-cols-[0.7fr_1.2fr_1.35fr_0.65fr] border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-600">
                <span className="font-bold text-slate-800">{event.time}</span><span>{event.event}</span><span>{event.action}</span><span className={event.reviewed ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{event.reviewed ? "已复核" : "待复核"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <button type="button" onClick={() => onCreatePrescription(report.taskId)} className="btn-primary w-full"><Sparkles className="h-4 w-4" />基于本次报告开具处方<ArrowRight className="h-4 w-4" /></button>
    </div>
  );
}

function StageReportPanel({ selected, onBack, onCreatePrescription, onOpenVersion }: { selected: typeof stageReports[number]; onBack: () => void; onCreatePrescription: (taskId: string) => void; onOpenVersion: (version: PrescriptionVersionDetail) => void }) {
  const stageSafetyEvents = minimalSafetyEvents.filter((event) => event.patientName === selected.patient);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="返回阶段性报告列表"><ArrowLeft className="h-4 w-4" /></button>
        <div className="flex-1"><p className="text-[10px] font-bold text-blue-600">阶段性报告 · {selected.id}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{selected.patient} · 阶段结论</h2><p className="mt-1 text-[10px] text-slate-400">患者编码：{selected.patientId}</p></div>
        <StatusBadge tone={selected.risk.includes("无") ? "green" : "orange"}>{selected.risk}</StatusBadge>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="flex items-center gap-2 font-bold text-blue-900"><Activity className="h-4 w-4" />医生摘要</p>
        <p className="mt-2 text-xs leading-6 text-slate-600">{stageReportData.clinicalConclusion.summary}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">{[["报告类型", "阶段性报告"], ["处方执行", selected.duration], ["靶区达标", selected.target], ["安全事件", selected.risk]].map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}</div>
      <div className="mt-5">
        <SectionHeader title="点击查看处方版本内容" description="每个版本记录当次开具的运动参数、诊断建议、用药建议和患者注意事项。" />
        <div className="grid grid-cols-2 gap-3">
          {prescriptionVersionDetails.map((version) => (
            <button type="button" key={version.id} onClick={() => onOpenVersion(version)} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50">
              <div className="flex items-center justify-between"><b className="text-slate-900">{version.version}</b><span className="text-[10px] text-slate-400">{version.issuedAt}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{version.exerciseProject} · {version.trainingMinutes}分钟 · {version.targetHr[0]}–{version.targetHr[1]} bpm</p>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><ShieldAlert className="mr-1.5 inline h-4 w-4" />AI会引用该报告、上一处方、病史、特殊用药和安全事件生成草稿，医生仍需复核。</div>
      {stageSafetyEvents.length > 0 && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800">
        <b>本阶段异常事件已纳入调方依据：</b>{stageSafetyEvents.map((event) => `${event.type}（${event.doctorReviewStatus}，${event.prescriptionImpact}）`).join("；")}
      </div>}
      <button type="button" onClick={() => onCreatePrescription(selected.taskId)} className="btn-primary mt-5 w-full"><Sparkles className="h-4 w-4" />基于此报告开具处方<ArrowRight className="h-4 w-4" /></button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />处方必须经医生复核和数字签名后生效</p>
    </section>
  );
}

function PrescriptionVersionModal({ version, onClose }: { version: PrescriptionVersionDetail; onClose: () => void }) {
  const items = [
    ["诊断建议", version.advice.diagnosisAdvice],
    ["用药建议", version.advice.medicationAdvice],
    ["康复忌讳", version.advice.rehabContraindications],
    ["饮食注意", version.advice.dietCautions],
    ["运动注意", version.advice.exerciseCautions],
    ["停止条件", version.advice.stopConditions]
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold text-blue-600">单次处方详情 · {version.issuedAt}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{version.clinicalSnapshot.name} · {version.version}</h2><p className="mt-2 text-xs text-slate-500">{version.physician}开具 · {version.exerciseProject} · {version.trainingType}</p></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="关闭处方详情"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            ["频次", `每周${version.weeklyFrequency}次`],
            ["阶段时长", `${version.warmupMinutes}+${version.trainingMinutes}+${version.cooldownMinutes} 分`],
            ["靶心率", `${version.targetHr[0]}–${version.targetHr[1]} bpm`],
            ["功率 / RPE", `${version.targetPower[0]}–${version.targetPower[1]}W · ${version.rpeTarget[0]}–${version.rpeTarget[1]}`]
          ].map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {items.map(([label, value]) => <ClinicalContextCard key={label} label={label} value={value} />)}
        </div>
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><b>患者可读说明：</b>{version.advice.patientInstruction}</div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold leading-5 text-slate-800">{value}</p></div>;
}

function ClinicalContextCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">{icon}{label}</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{value}</p></div>;
}
