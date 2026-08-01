const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

function parseClinicalDateTime(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value?: string) {
  const parsed = parseClinicalDateTime(value);
  if (!parsed) return value ?? "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed).replace(/\//g, "-");
}

export function formatTime(value?: string) {
  const parsed = parseClinicalDateTime(value);
  if (!parsed) return value ?? "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

export function formatDate(value?: string) {
  const parsed = parseClinicalDateTime(value);
  if (!parsed) return value ?? "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed).replace(/\//g, "-");
}

export function formatSignedDateTime(value?: string) {
  return value ? `${formatDateTime(value)}（北京时间）` : "待签署";
}
