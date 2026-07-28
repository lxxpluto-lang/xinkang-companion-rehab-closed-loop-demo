import { useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  CircleStop,
  Clock3,
  RefreshCcw,
  Save,
  ShieldAlert,
  Siren
} from "lucide-react";
import { abnormalEvents } from "../mockData";
import type { TrainingState } from "../types";
import { Notice, PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { Workflow } from "../components/Workflow";

export function AbnormalPage({
  trainingState,
  setTrainingState
}: {
  trainingState: TrainingState;
  setTrainingState: (state: TrainingState) => void;
}) {
  const event = abnormalEvents[0];
  const [commandStatus, setCommandStatus] = useState<"已发送" | "成功" | "超时">(
    trainingState === "disconnected" ? "超时" : "已发送"
  );
  const [nurseNote, setNurseNote] = useState("");
  const [doctorNote, setDoctorNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [decision, setDecision] = useState<"none" | "terminated" | "resume">("none");

  const urgent = commandStatus === "超时";
  const canDecide = doctorNote.trim().length > 0;

  return (
    <section data-testid="page-VIEW-ABNORMAL" data-state={decision}>
      <PageHeader
        eyebrow="异常安全闭环"
        title="异常处置"
        description="异常报警、设备动作、现场处置和医生复核分别留痕；异常后系统不能自动恢复训练。"
        action={<StatusBadge tone={decision === "none" ? "red" : "green"}>{decision === "none" ? "待医生复核" : decision === "terminated" ? "医生确认终止" : "医生确认可恢复"}</StatusBadge>}
      />
      <Workflow current={4} />

      {urgent && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border-2 border-red-500 bg-red-600 p-5 text-white shadow-lg">
          <Siren className="h-8 w-8" />
          <div className="flex-1">
            <p className="text-lg font-bold">设备停止未确认，请立即执行物理急停</p>
            <p className="mt-1 text-sm text-red-50">停止请求已超时，系统不得显示“设备已停止”。请按现场急停流程处理并记录。</p>
          </div>
          <StatusBadge tone="orange">需人工处置</StatusBadge>
        </div>
      )}

      <div className="mb-5 grid grid-cols-[1fr_0.85fr] gap-5">
        <section className="card p-5" data-testid="region-REG-ABNORMAL-EVENT">
          <SectionHeader title="异常事件 EVENT-DEMO-001" action={<StatusBadge tone="red">患者主诉</StatusBadge>} />
          <div className="grid grid-cols-2 gap-3">
            {[
              ["异常触发时间", event.triggered_at],
              ["异常类型", "患者主诉 / 生理指标异常"],
              ["触发源", "模拟按钮 · 演示规则"],
              ["当前状态", decision === "none" ? "待医生复核" : "已形成医生决定"]
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-4" key={label}>
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertOctagon className="h-4 w-4" />异常描述</p>
            <p className="mt-2 text-sm leading-6 text-red-700">患者于主训练阶段主诉胸闷，模拟心率记录升至 124 bpm。该触发仅为演示，不构成临床判断。</p>
          </div>
          <div className="mt-4">
            <p className="mb-3 text-sm font-bold text-slate-800">当时指标快照</p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(event.snapshot).map(([key, value]) => (
                <div className="rounded-xl border border-slate-200 p-3 text-center" key={key}>
                  <p className="text-xs text-slate-400">{key}</p>
                  <p className="mt-1 font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card p-5" data-testid="region-REG-ABNORMAL-COMMAND">
          <SectionHeader title="停止指令状态" description="报警结果与设备回执分开显示。" />
          <div className="space-y-3">
            {[
              ["1", "已触发异常报警", "10:18:42", "done"],
              ["2", "停止指令已发送", "10:18:43", "done"],
              ["3", commandStatus === "已发送" ? "等待设备回执" : commandStatus === "成功" ? "设备回执成功" : "设备回执超时", commandStatus === "已发送" ? "等待中" : "10:18:48", commandStatus === "成功" ? "done" : commandStatus === "超时" ? "error" : "current"],
              ["4", "医生复核决定", decision === "none" ? "未完成" : "已完成", decision === "none" ? "pending" : "done"]
            ].map(([index, label, time, status]) => (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3" key={index}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${status === "done" ? "bg-emerald-100 text-emerald-700" : status === "error" ? "bg-red-100 text-red-700" : status === "current" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>{status === "done" ? <CheckCircle2 className="h-4 w-4" /> : index}</span>
                <p className="flex-1 text-sm font-semibold text-slate-800">{label}</p>
                <span className="text-xs text-slate-400">{time}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-secondary flex-1" type="button" onClick={() => setCommandStatus("成功")}><CheckCircle2 className="h-4 w-4" />模拟成功回执</button>
            <button className="btn-secondary flex-1 border-red-200 text-red-700" type="button" onClick={() => setCommandStatus("超时")}><Clock3 className="h-4 w-4" />模拟超时</button>
          </div>
        </section>
      </div>

      <section className="card mb-5 p-5" data-testid="region-REG-ABNORMAL-DISPOSITION">
        <SectionHeader title="医护处置记录" description="请记录现场事实与医生决定；不得由 AI 自动填写临床结论。" />
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="field-label" htmlFor="nurse-note">护士 / 治疗师处置记录</label>
            <textarea
              id="nurse-note"
              className="text-field min-h-28 resize-none"
              placeholder="例如：已暂停踩踏，协助患者坐位休息，现场复测生命体征……"
              value={nurseNote}
              onChange={(event) => setNurseNote(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="doctor-note">医生复核意见（决定前必填）</label>
            <textarea
              id="doctor-note"
              className="text-field min-h-28 resize-none"
              placeholder="请输入复核意见、判断依据及后续安排……"
              value={doctorNote}
              onChange={(event) => setDoctorNote(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button className="btn-secondary" type="button" onClick={() => setSaved(true)}>
            <Save className="h-4 w-4" />{saved ? "处置记录已保存" : "保存处置"}
          </button>
          <div className="flex gap-3">
            <button
              className="btn-danger"
              type="button"
              disabled={!canDecide}
              onClick={() => { setDecision("terminated"); setTrainingState("stopped"); }}
              data-action="ACT-ABNORMAL-TERMINATE"
            >
              <CircleStop className="h-4 w-4" />医生确认终止训练
            </button>
            <button
              className="btn-primary bg-emerald-700 hover:bg-emerald-800"
              type="button"
              disabled={!canDecide || commandStatus !== "成功"}
              onClick={() => { setDecision("resume"); setTrainingState("paused"); }}
              data-action="ACT-ABNORMAL-ALLOW-RESUME"
              data-ac="AC-05"
            >
              <RefreshCcw className="h-4 w-4" />医生确认可恢复
            </button>
          </div>
        </div>
      </section>

      {decision === "none" ? (
        <Notice tone="orange" title="安全互锁生效">
          异常停止后，未经医生填写复核意见并明确确认，系统不能自动恢复训练。即使设备已恢复连接，也保持停止 / 暂停状态。
        </Notice>
      ) : (
        <Notice tone="green" title="医生决定已记录">
          {decision === "terminated" ? "本次训练已由医生确认终止，后续进入结构化小结与报告审核。" : "医生已确认可恢复，但仍需治疗师在训练页执行“继续”，系统不会自动启动设备。"}
        </Notice>
      )}
    </section>
  );
}
