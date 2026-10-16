// Bus de messages : la simulation annonce, l'affichage et l'interface réagissent.
const handlers = new Map();

export const bus = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name).add(fn);
    return () => handlers.get(name).delete(fn);
  },
  emit(name, data) {
    const set = handlers.get(name);
    if (!set) return;
    for (const fn of set) fn(data);
  }
};
