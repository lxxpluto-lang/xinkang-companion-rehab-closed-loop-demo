export type TrainingPhase = "warmup" | "training" | "cooldown";

export const phaseAnnouncements: Record<TrainingPhase, string> = {
  warmup: "现在进入热身阶段，可以开始加快了",
  training: "现在进入训练阶段，努力加油吧",
  cooldown: "现在进入放松阶段，可以放松运动了"
};

const HEART_RATE_ALERT = "警报，心率过高，请放慢运动速度，并等待医护人员确认。";
const RECOVERY_NOTICE = "太棒了，所有指标均已恢复正常，请继续保持。";

let audioContext: AudioContext | null = null;

function getChineseVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith("zh"));
}

export function speak(text: string, interrupt = true) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  if (interrupt) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  const chineseVoice = getChineseVoice();
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }
  window.speechSynthesis.speak(utterance);
}

export function announcePhase(phase: TrainingPhase) {
  speak(phaseAnnouncements[phase]);
}

function playAlertTone() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;

  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  const startAt = audioContext.currentTime;
  [0, 0.24, 0.48].forEach((offset) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880, startAt + offset);
    gain.gain.setValueAtTime(0.0001, startAt + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext!.destination);
    oscillator.start(startAt + offset);
    oscillator.stop(startAt + offset + 0.18);
  });
}

export function announceHeartRateAlert() {
  playAlertTone();
  speak(HEART_RATE_ALERT);
}

export function announceRecovery() {
  speak(RECOVERY_NOTICE);
}

export function stopAudioGuidance() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
