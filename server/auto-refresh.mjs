export const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;
export const RETRY_INTERVAL = 30 * 60 * 1000;

// Tick against wall time so a laptop waking from sleep refreshes immediately.
export function startAutoRefresh({
  state,
  refresh,
  now = Date.now,
  interval = REFRESH_INTERVAL,
  setTimer = setInterval,
  clearTimer = clearInterval,
}) {
  const status = {
    intervalHours: interval / 3600000,
    lastAttemptAt: null,
    nextCheckAt: new Date(now()).toISOString(),
  };
  let busy = false,
    stopped = false;
  async function check() {
    if (
      stopped ||
      busy ||
      state.running ||
      now() < Date.parse(status.nextCheckAt)
    )
      return;
    busy = true;
    status.lastAttemptAt = new Date(now()).toISOString();
    try {
      await refresh(
        state.data?.config || {
          limit: 40,
          spreadLimit: 8,
          publishedLimit: 1000,
          followLatest: true,
        },
      );
    } catch (e) {
      state.error = e.message;
    } finally {
      status.nextCheckAt = new Date(
        now() + (state.error ? RETRY_INTERVAL : interval),
      ).toISOString();
      busy = false;
    }
  }
  const timer = setTimer(() => {
    void check();
  }, 60000);
  timer?.unref?.();
  return {
    status,
    check,
    stop() {
      stopped = true;
      clearTimer(timer);
    },
  };
}
