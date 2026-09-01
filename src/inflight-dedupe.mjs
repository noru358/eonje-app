export function createInflightDeduper() {
  const inflight = new Map();

  return function runInflight(key, task) {
    const existing = inflight.get(key);
    if (existing) return existing;

    let promise;
    promise = Promise.resolve()
      .then(task)
      .finally(() => {
        if (inflight.get(key) === promise) inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  };
}
