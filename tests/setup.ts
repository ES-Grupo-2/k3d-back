import diagnostics from "node:diagnostics_channel";

const channel = {
  hasSubscribers: false,
  publish: () => undefined,
  subscribe: () => undefined,
  unsubscribe: () => undefined,
};

if (typeof diagnostics.tracingChannel !== "function") {
  diagnostics.tracingChannel = (() => ({
    start: {
      ...channel,
      runStores: (
        _store: unknown,
        callback: (...args: unknown[]) => unknown,
        _thisArg?: unknown,
        ...args: unknown[]
      ) => {
        return callback(...args);
      },
    },
    end: channel,
    asyncStart: channel,
    asyncEnd: channel,
    error: channel,
  })) as unknown as typeof diagnostics.tracingChannel;
}
