import { runAdvancedStudy } from "./advancedStudy";
self.onmessage = (event: MessageEvent) => {
  try {
    self.postMessage({
      ok: true,
      value: runAdvancedStudy(event.data.request, event.data.context),
    });
  } catch (e) {
    self.postMessage({ ok: false, error: String(e) });
  }
};
