import type { QualityStatus } from "./types";
import { patientMasterChen } from "./clinicalSharedData";

export const demoPatients = [
  {
    patient_demo_id: patientMasterChen.patientId,
    age: patientMasterChen.age,
    gender: patientMasterChen.sex,
    diagnosis_summary: patientMasterChen.clinicalSnapshot.diagnosis,
    risk_level: patientMasterChen.clinicalSnapshot.riskLevel,
    assessment: {
      cpet: "峰值 VO₂ 18.6 mL/kg/min（模拟）",
      six_mwt: "6MWT 428 m（模拟）",
      resting_hr: patientMasterChen.restingHr
    },
    prescription_version: "第12次训练",
    training_status: "主训练中",
    latest_abnormal: "胸闷主诉待复核",
    report_status: "待审核"
  },
  {
    patient_demo_id: "P-DEMO-002",
    age: 58,
    gender: "女",
    diagnosis_summary: "稳定性冠心病，Ⅱ期院内康复",
    risk_level: "低危",
    assessment: { cpet: "待补充", six_mwt: "462 m（模拟）", resting_hr: 68 },
    prescription_version: "第8次训练",
    training_status: "等待核验",
    latest_abnormal: "无",
    report_status: "已发布"
  },
  {
    patient_demo_id: "P-DEMO-003",
    age: 66,
    gender: "男",
    diagnosis_summary: "冠心病 CABG 术后康复",
    risk_level: "中危",
    assessment: { cpet: "峰值 VO₂ 16.9 mL/kg/min（模拟）", six_mwt: "396 m（模拟）", resting_hr: 75 },
    prescription_version: "第10次训练",
    training_status: "已完成",
    latest_abnormal: "设备断连 1 次",
    report_status: "AI 草稿"
  },
  {
    patient_demo_id: "P-DEMO-004",
    age: 60,
    gender: "女",
    diagnosis_summary: "冠心病 PCI 术后康复评估",
    risk_level: "高危",
    assessment: { cpet: "未完成", six_mwt: "待补充", resting_hr: 79 },
    prescription_version: "待核对",
    training_status: "阻断",
    latest_abnormal: "处方未确认",
    report_status: "未生成"
  }
];

export const trainingSessions = [
  {
    session_id: "SESSION-DEMO-20260728-001",
    patient_demo_id: "P-DEMO-001",
    prescription_version: "V1.0",
    status: "training",
    data_completeness: 92,
    demo_mode: true
  },
  {
    session_id: "SESSION-DEMO-20260728-002",
    patient_demo_id: "P-DEMO-003",
    prescription_version: "V0.9",
    status: "completed",
    data_completeness: 78,
    demo_mode: true
  }
];

export type MetricCode =
  | "DURATION"
  | "DISTANCE"
  | "SPEED"
  | "POWER"
  | "CADENCE"
  | "RESISTANCE"
  | "HR"
  | "SPO2"
  | "NBP_SYS"
  | "NBP_DIA"
  | "RPE"
  | "REP_COUNT"
  | "RECOGNITION_CONF";

export type MetricRecord = {
  metric_code: MetricCode;
  value: number;
  unit: string;
  quality_status: QualityStatus;
  measured_at: string;
  received_at: string;
};

export const metricRecords: MetricRecord[] = [
  { metric_code: "DURATION", value: 1128, unit: "s", quality_status: "valid", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "DISTANCE", value: 6.4, unit: "km", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "SPEED", value: 20.4, unit: "km/h", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "POWER", value: 52, unit: "W", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "CADENCE", value: 61, unit: "rpm", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "RESISTANCE", value: 4, unit: "level", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "HR", value: 104, unit: "bpm", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:49+08:00" },
  { metric_code: "SPO2", value: 97, unit: "%", quality_status: "simulated", measured_at: "2026-07-28T10:18:48+08:00", received_at: "2026-07-28T10:18:50+08:00" },
  { metric_code: "NBP_SYS", value: 132, unit: "mmHg", quality_status: "valid", measured_at: "2026-07-28T10:10:00+08:00", received_at: "2026-07-28T10:10:03+08:00" },
  { metric_code: "NBP_DIA", value: 78, unit: "mmHg", quality_status: "valid", measured_at: "2026-07-28T10:10:00+08:00", received_at: "2026-07-28T10:10:03+08:00" },
  { metric_code: "RPE", value: 12, unit: "Borg", quality_status: "valid", measured_at: "2026-07-28T10:17:00+08:00", received_at: "2026-07-28T10:17:06+08:00" },
  { metric_code: "REP_COUNT", value: 8, unit: "次", quality_status: "simulated", measured_at: "2026-07-28T11:02:00+08:00", received_at: "2026-07-28T11:02:01+08:00" },
  { metric_code: "RECOGNITION_CONF", value: 0.71, unit: "%", quality_status: "simulated", measured_at: "2026-07-28T11:02:00+08:00", received_at: "2026-07-28T11:02:01+08:00" }
];

export const abnormalEvents = [
  {
    event_id: "EVENT-DEMO-001",
    session_id: "SESSION-DEMO-20260728-001",
    triggered_at: "2026-07-28 10:18:42",
    abnormal_type: "患者主诉",
    source: "演示按钮 / 模拟规则",
    description: "患者主诉胸闷，伴模拟心率升高",
    snapshot: { HR: "124 bpm", SPO2: "96%", POWER: "50 W", RPE: "14" },
    command_status: "已发送",
    doctor_review_status: "待复核"
  }
];

export const aiReports = [
  {
    report_id: "REPORT-DEMO-001",
    session_id: "SESSION-DEMO-20260728-001",
    version: "DRAFT-01",
    status: "pending_review",
    generated_by: "AI（演示）",
    generated_at: "2026-07-28 10:32",
    evidence_refs: ["训练会话 SESSION-DEMO-20260728-001", "处方 V1.0", "异常事件 EVENT-DEMO-001", "RPE 记录 12"],
    missing_information: ["训练结束后血压未录入", "主诉缓解时间待护士补录"],
    data_quality_warning: "心率、功率和踏频为模拟数据；血压为间歇测量，不代表实时血压。",
    content:
      "本次功率车训练按处方 V1.0 执行。记录显示患者完成热身及部分主训练阶段，训练期间心率多数时间位于演示靶区，功率维持在模拟目标范围内。患者于主训练阶段反馈胸闷，系统触发停止流程并转入人工处置。建议医生结合患者主诉、现场处置记录及训练结束后生命体征，对本次训练耐受情况进行复核。"
  }
];

export const visualTrainingRecords = [
  {
    record_id: "VISUAL-DEMO-001",
    patient_demo_id: "P-DEMO-001",
    activity_type: "八段锦",
    action_name: "双手托天理三焦",
    duration_sec: 286,
    rep_count: 8,
    recognition_conf: 0.71,
    quality_status: "simulated",
    raw_video_saved: false,
    manual_confirmation: "pending"
  }
];
