/**
 * TTS “robotizado” via Web Speech API (speechSynthesis) — sem custo de API.
 * Em produção, pode substituir ou combinar com ElevenLabs (voiceId no tenant).
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickPtBrVoice(): SpeechSynthesisVoice | null {
  if (!isBrowser()) return null;
  const list = window.speechSynthesis.getVoices();
  const ptBr =
    list.find((v) => v.lang.toLowerCase().startsWith("pt-br")) ||
    list.find((v) => v.lang.toLowerCase().startsWith("pt")) ||
    null;
  return ptBr ?? null;
}

let voicesReady = false;

function ensureVoices(cb: () => void): void {
  if (!isBrowser()) return;
  const run = () => {
    voicesReady = true;
    cb();
  };
  if (voicesReady && window.speechSynthesis.getVoices().length) {
    run();
    return;
  }
  window.speechSynthesis.onvoiceschanged = () => run();
  if (window.speechSynthesis.getVoices().length) run();
}

export function cancelRobotSpeech(): void {
  if (!isBrowser()) return;
  window.speechSynthesis.cancel();
}

export function speakRobot(
  text: string,
  onEnd?: () => void
): void {
  if (!isBrowser()) {
    onEnd?.();
    return;
  }

  cancelRobotSpeech();

  const speak = (): void => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 0.92;
    u.pitch = 1;
    u.volume = 1;
    const v = pickPtBrVoice();
    if (v) u.voice = v;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  };

  ensureVoices(speak);
}
