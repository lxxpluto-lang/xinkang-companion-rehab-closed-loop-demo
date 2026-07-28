import { useState } from "react";
import { AlertTriangle, ArrowRight, BadgeCheck, Check, FileLock2, PenLine, Printer, Quote, ShieldCheck, Signature, Sparkles, X } from "lucide-react";
import { demoPatients, prescriptions } from "../mockData";
import type { PageKey } from "../types";
import { AiBadge, Notice, PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { Workflow } from "../components/Workflow";

export function PatientPage({
  onNavigate,
  confirmed,
  onConfirm,
  signed,
  onSign
}: {
  onNavigate: (page: PageKey) => void;
  confirmed: boolean;
  onConfirm: () => void;
  signed: boolean;
  onSign: () => void;
}) {
  const patient = demoPatients[0];
  const prescription = prescriptions[0];
  const [editing, setEditing] = useState(false);
  const [power, setPower] = useState("40–60 W");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  function printPrescription() {
    document.body.classList.add("printing-prescription");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-prescription"), 300);
  }

  return (
    <section data-testid="page-VIEW-PATIENT">
      <PageHeader
        eyebrow="患者与处方"
        title="患者档案与运动处方"
        description="按“评估信息—处方参数—医生确认—数字签名/打印”的顺序完成处方闭环。"
        action={<StatusBadge tone="orange">中危 · Demo 患者</StatusBadge>}
      />
      <Workflow current={0} />

      <section className="card mb-5 p-5" data-testid="region-REG-PATIENT-SUMMARY">
        <div className="grid grid-cols-[1.1fr_1fr] gap-7">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-100 text-lg font-bold text-medical-700">P</span>
              <div>
                <p className="text-xl font-bold text-slate-950">{patient.patient_demo_id}</p>
                <p className="mt-1 text-sm text-slate-500">{patient.age} 岁 · {patient.gender} · 无真实身份信息</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400">诊断摘要</p>
              <p className="mt-2 font-semibold text-slate-800">{patient.diagnosis_summary}</p>
              <p className="mt-3 text-xs text-slate-500">此处仅展示脱敏摘要，不接 HIS / EMR，不形成真实患者建档。</p>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold text-slate-800">评估摘要（模拟）</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400">CPET</p><p className="mt-2 text-sm font-semibold text-slate-800">{patient.assessment.cpet}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400">6MWT</p><p className="mt-2 text-sm font-semibold text-slate-800">{patient.assessment.six_mwt}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400">静息心率</p><p className="mt-2 text-sm font-semibold text-slate-800">{patient.assessment.resting_hr} bpm</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[1.05fr_0.95fr] gap-5">
        <section id="printable-prescription" className="card p-5" data-testid="region-REG-PRESCRIPTION-CARD">
          <div className="print-only">
            <h1>心脏康复运动处方</h1>
            <p>处方编号：RX-20260729-001　患者：{patient.patient_demo_id}　年龄：{patient.age} 岁　危险分组：{patient.risk_level}</p>
          </div>
          <SectionHeader
            title="运动处方 V1.0"
            description="所有目标范围均为演示模拟值，非临床阈值。"
            action={<StatusBadge tone={confirmed ? "green" : "orange"}>{confirmed ? "医生已确认" : "待医生确认"}</StatusBadge>}
          />
          <div className="mb-5 grid grid-cols-3 gap-3">
            {prescription.phases.map((phase, index) => (
              <div className={`rounded-xl border p-4 ${index === 1 ? "border-medical-200 bg-medical-50" : "border-slate-200 bg-slate-50"}`} key={phase.name}>
                <p className="text-xs font-semibold text-slate-400">阶段 {index + 1}</p>
                <p className="mt-2 font-bold text-slate-900">{phase.name} {phase.duration_min} 分钟</p>
                <p className="mt-1 text-sm text-slate-500">{phase.power_w} W（模拟）</p>
              </div>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            {[
              ["训练方式", prescription.training_type],
              ["靶心率区间", prescription.target_hr],
              ["功率范围", editing ? power : prescription.power_range],
              ["RPE 目标", prescription.rpe_target],
              ["当前版本", prescription.version],
              ["版本状态", "确认后不可覆盖"]
            ].map(([term, value]) => (
              <div className="flex justify-between gap-4 border-b border-slate-100 py-2" key={term}>
                <dt className="text-slate-500">{term}</dt>
                <dd className="text-right font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {editing && (
            <div className="mt-4">
              <label className="field-label" htmlFor="powerRange">修改功率范围（演示值）</label>
              <input id="powerRange" className="text-field" value={power} onChange={(event) => setPower(event.target.value)} />
            </div>
          )}
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <strong>注意事项：</strong>{prescription.notes}
          </div>
          <div className="print-only prescription-sign-line">
            <span>处方医生：王医生</span><span>数字签名：{signed ? "已签名（CA 验证有效）" : "未签名"}</span><span>日期：2026-07-29</span>
          </div>
        </section>

        <section className="card border-t-4 border-t-medical-500 p-5" data-testid="region-REG-AI-PRESCRIPTION">
          <SectionHeader title="AI 处方建议草稿" description="AI 仅整理证据并提出可编辑建议。" action={<AiBadge />} />
          <div className="rounded-xl bg-medical-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-medical-800">
              <Sparkles className="h-4 w-4" />
              建议草稿
            </div>
            <p className="text-sm leading-7 text-slate-700">
              基于最近一次训练完成度与主观用力程度，建议维持当前主训练功率范围，暂不自动上调。下一次训练前请补充结束后血压，并由医生结合患者主诉复核是否调整。
            </p>
          </div>
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><Quote className="h-4 w-4 text-medical-500" />依据引用</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• 最近一次训练完成度：86%（模拟会话）</li>
              <li>• RPE：12，位于目标 11–13</li>
              <li>• 心率达标时间：主训练的 78%（模拟）</li>
            </ul>
          </div>
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>缺失字段：</strong>训练结束后血压、胸闷缓解时间尚未录入。</span>
          </div>
          <Notice tone="blue" title="临床边界">
            AI 不直接发布处方。医生确认前，处方不能进入训练执行。
          </Notice>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setEditing((value) => !value)}
              data-action="ACT-PRESCRIPTION-EDIT"
            >
              <PenLine className="h-4 w-4" />
              {editing ? "保存修改草稿" : "医生修改处方"}
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={onConfirm}
              disabled={confirmed}
              data-action="ACT-PRESCRIPTION-CONFIRM"
              data-ac="AC-03"
            >
              {confirmed ? <FileLock2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {confirmed ? "已确认并锁定" : "医生确认处方"}
            </button>
          </div>
          {confirmed && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-emerald-800">
                <Check className="h-4 w-4" />
                已确认并生成不可覆盖版本 V1.0
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-700">处方参数已锁定。完成数字签名后可作为正式执行版本，也可打印纸质处方留档。</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" className="btn-secondary bg-white" onClick={printPrescription}>
                  <Printer className="h-4 w-4" />打印处方
                </button>
                <button type="button" className={signed ? "btn-secondary bg-white text-emerald-700" : "btn-primary"} onClick={() => setSignatureOpen(true)}>
                  {signed ? <BadgeCheck className="h-4 w-4" /> : <Signature className="h-4 w-4" />}
                  {signed ? "查看签名凭证" : "数字签名"}
                </button>
              </div>
              {signed && <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800"><span className="flex items-center gap-2 font-bold"><BadgeCheck className="h-4 w-4" />王医生 · CA 数字签名有效</span><span>2026-07-29 10:42</span></div>}
            </div>
          )}
        </section>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" type="button" onClick={() => onNavigate("monitor")}>
          查看该患者训练概览
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {signatureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="处方数字签名">
          <article className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="eyebrow">处方数字签名</p><h2 className="mt-2 text-xl font-bold text-slate-950">{signed ? "签名凭证" : "确认签署运动处方 V1.0"}</h2></div>
              <button type="button" aria-label="关闭" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setSignatureOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-y-3">
                <span className="text-slate-500">签署医生</span><b className="text-right text-slate-800">王医生 · 康复医学科</b>
                <span className="text-slate-500">处方编号</span><b className="text-right text-slate-800">RX-20260729-001</b>
                <span className="text-slate-500">处方版本</span><b className="text-right text-slate-800">V1.0 · 已锁定</b>
                <span className="text-slate-500">证书状态</span><b className="text-right text-emerald-700">CA 证书有效</b>
              </div>
            </div>
            {signed ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><BadgeCheck className="h-8 w-8 shrink-0" /><div><p className="font-bold">数字签名验证通过</p><p className="mt-1 text-xs">签名时间：2026-07-29 10:42 · 文档摘要已留存</p></div></div>
            ) : (
              <>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-medical-200 bg-medical-50 p-4 text-sm text-slate-700">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-medical-600" checked={signatureConfirmed} onChange={(event) => setSignatureConfirmed(event.target.checked)} />
                  <span>我已核对患者评估、危险分组、运动方式、强度、时长、频次及注意事项，并确认签署当前处方版本。</span>
                </label>
                <p className="mt-3 text-xs leading-5 text-slate-500">Demo 中模拟 CA 签名交互；正式系统应连接医院统一身份认证、CA 证书与时间戳服务。</p>
              </>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSignatureOpen(false)}>{signed ? "关闭" : "取消"}</button>
              {!signed && <button type="button" className="btn-primary" disabled={!signatureConfirmed} onClick={() => { onSign(); setSignatureOpen(false); }}><Signature className="h-4 w-4" />确认数字签名</button>}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
