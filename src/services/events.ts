export type ServiceEvent = {
  type: string;
  payload?: Record<string, unknown>;
  timestamp: number;
};

type Listener = (event: ServiceEvent) => void;

const listeners = new Set<Listener>();

export const serviceEvents = {
  emit: (type: string, payload?: Record<string, unknown>) => {
    const event: ServiceEvent = { type, payload, timestamp: Date.now() };
    listeners.forEach((listener) => listener(event));
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
