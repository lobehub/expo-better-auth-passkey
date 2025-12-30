// Mock implementation of nanostores
export const atom = <T>(initialValue: T) => {
  let value = initialValue;
  const listeners: Array<() => void> = [];
  return {
    get: () => value,
    set: (newValue: T) => {
      value = newValue;
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};

export const readonlyType = Symbol("readonlyType");
