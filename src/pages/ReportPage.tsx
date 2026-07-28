import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { aiReports } from "../mockData";
import { AiBadge, Notice, PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { Workflow } from "../components/Workflow";

export function ReportPage() {
  const report = aiReports[0];
  const [editedText, setEditedText] = useState(report.content);
  const [reviewReason, setReviewReason] = useState("");
  const [returned, setReturned] = useState(false);
  const [published, setPublished] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const canPublish = reviewReason.trim().length > 0 && !published;

  function publish() {
    setPublished(true);
    setConfirming(false);
  }

  return (
    <section data-testid="page-VIEW-REPORT" data-state={published ? "published" : returned ? "returned" : "pending_review"}>
      <PageHeader
        eyebrow="医生最终把关"
        title="AI 报告审核"
        description="结构化事实不依赖 AI；AI 负责整理草稿，医生核对证据、修改并决定是否发布。"
        action={<StatusBadge tone={published ? "green" : returned ? "red" : "orange"}>{published ? "已发布 V1.0" : returned ? "已退回修改" : "待医生审核"}</StatusBadge>}
      />
      <Workflow current={published ? 6 : 5} />

      {published && (
        <div className="mb-5">
          <Notice tone="green" title="报告已由医生审核并发布">
            报告版本 V1.0 · 发布时间 2026-07-28 10:46 · 发布人：当前康复医生。该版本已锁定，不可静默覆盖。
          </Notice>
        </div>
      )}

      <section className="card mb-5 p-5" data-testid="region-REG-REPORT-SUMMARY">
        <SectionHeader title="训练事实小结" description="由结构化记录聚合，不依赖 AI 生成。" action={<StatusBadge tone="blue">SESSION-DEMO-20260728-001</StatusBadge>} />
        <div className="grid grid-cols-8 gap-3">
          {[
            ["有效训练时长", "24:36"],
            ["完成度", "86%"],
            ["心率达标", "78%"],
            ["功率范围", "46–58 W"],
            ["RPE", "12 → 14"],
            ["主诉", "胸闷"],
            ["异常事件", "1 项"],
            ["数据完整度", "92%"]
          ].map(([label, value], index) => (
            <div className={`rounded-xl border p-3 ${index === 5 || index === 6 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`} key={label} data-metric={`METRIC-REPORT-${label}`}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`mt-2 text-lg font-bold ${index === 5 || index === 6 ? "text-red-700" : "text-slate-900"}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-5 grid grid-cols-[0.9fr_1.1fr] gap-5">
        <section className="card border-t-4 border-t-medical-500 p-5" data-testid="region-REG-REPORT-AI-DRAFT">
          <SectionHeader title="AI 生成阶段报告草稿" description={`草稿版本 ${report.version}`} action={<AiBadge />} />
          <div className="rounded-xl bg-medical-50 p-4">
            <p className="text-sm leading-7 text-slate-700">{report.content}</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-medical-200 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-medical-800"><FileText className="h-4 w-4" />依据引用</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                {report.evidence_refs.map((reference) => <li key={reference}>• {reference}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle className="h-4 w-4" />缺失字段提醒</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">
                {report.missing_information.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-bold text-orange-800">数据质量警告</p>
              <p className="mt-2 text-xs leading-5 text-orange-700">{report.data_quality_warning}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4" />
            仅供医生审核参考 · 不包含自动诊断结论
          </div>
        </section>

        <section className="card p-5" data-testid="region-REG-REPORT-REVIEW">
          <SectionHeader title="医生审核区" description="修改后的文本与原因将作为当前报告版本的审核证据。" action={published && <LockKeyhole className="h-5 w-5 text-emerald-600" />} />
          <div className="mb-4">
            <label className="field-label" htmlFor="ai-original">AI 原文（只读）</label>
            <textarea id="ai-original" className="text-field min-h-28 resize-none bg-slate-50 text-slate-500" value={report.content} readOnly />
          </div>
          <div className="mb-4">
            <label className="field-label" htmlFor="doctor-edited">医生修改后文本</label>
            <textarea
              id="doctor-edited"
              className="text-field min-h-44 resize-none"
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
              disabled={published}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="review-reason">
              修改 / 审核意见 <span className="text-red-600">*</span>
            </label>
            <textarea
              id="review-reason"
              className="text-field min-h-24 resize-none"
              placeholder="必填：请记录核对结论、修改原因或发布依据……"
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              disabled={published}
            />
            {!reviewReason.trim() && !published && <p className="mt-2 text-xs font-medium text-amber-700">未填写医生审核意见时，发布按钮不可用。</p>}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              className="btn-secondary border-red-200 text-red-700"
              type="button"
              onClick={() => setReturned(true)}
              disabled={published}
              data-action="ACT-REPORT-RETURN"
            >
              <RotateCcw className="h-4 w-4" />退回修改
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!canPublish}
              onClick={() => setConfirming(true)}
              data-action="ACT-REPORT-PUBLISH"
              data-ac="AC-08"
            >
              <Send className="h-4 w-4" />审核通过并发布
            </button>
          </div>
        </section>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-8" role="dialog" aria-modal="true" aria-labelledby="publish-title">
          <div className="w-[520px] rounded-2xl bg-white p-6 shadow-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-100 text-medical-700"><FileCheck2 className="h-6 w-6" /></span>
            <h2 id="publish-title" className="mt-4 text-xl font-bold text-slate-950">确认发布报告 V1.0？</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">发布人为当前康复医生。发布后本版本只读，如需更正必须创建新版本并说明原因。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-secondary" type="button" onClick={() => setConfirming(false)}>取消</button>
              <button className="btn-primary" type="button" onClick={publish}><CheckCircle2 className="h-4 w-4" />确认发布</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
