/**
 * TTS “robotizado” via Web Speech API (speechSynthesis) — sem custo de API.
 * Em produção, pode substituir ou combinar com ElevenLabs (voiceId no tenant).
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const FEMALE_VOICE_NAMES = [
  "luciana", "francisca", "maria", "vitória", "vitoria",
  "google português do brasil", "google portuguese", "microsoft maria",
];

const MALE_VOICE_NAMES = [
  "daniel", "eddy", "reed", "rocko", "sandy", "microsoft daniel",
];

function pickPtBrVoice(): SpeechSynthesisVoice | null {
  if (!isBrowser()) return null;
  const list = window.speechSynthesis.getVoices();
  const ptBr = list.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("pt-br") ||
      v.lang.toLowerCase().startsWith("pt")
  );

  const female =
    ptBr.find((v) =>
      FEMALE_VOICE_NAMES.some((name) => v.name.toLowerCase().includes(name))
    ) ||
    ptBr.find(
      (v) => !MALE_VOICE_NAMES.some((name) => v.name.toLowerCase().includes(name))
    ) ||
    ptBr[0] ||
    null;

  return female;
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

function configureUtterance(text: string): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 1.08;
  u.pitch = 1.5;
  u.volume = 1;
  const v = pickPtBrVoice();
  if (v) u.voice = v;
  return u;
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
    const u = configureUtterance(text);
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  };

  ensureVoices(speak);
}

/** Várias frases em sequência (ex.: lista de manchetes) sem cancelar entre elas */
export function speakRobotParts(parts: string[], onEnd?: () => void): void {
  if (!isBrowser()) {
    onEnd?.();
    return;
  }
  if (parts.length === 0) {
    onEnd?.();
    return;
  }

  cancelRobotSpeech();

  const run = (i: number): void => {
    if (i >= parts.length) {
      onEnd?.();
      return;
    }
    const u = configureUtterance(parts[i]);
    u.onend = () => run(i + 1);
    u.onerror = () => run(i + 1);
    window.speechSynthesis.speak(u);
  };

  ensureVoices(() => run(0));
}
