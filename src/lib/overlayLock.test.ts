import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Minimaler document-Stub: overlayLock läuft im Browser, die Vitest-Umgebung ist
 * aber `node` (kein DOM). Geprüft wird ausschließlich die Zähler-Semantik.
 */
function makeDocumentStub() {
  const classes = new Set<string>();
  return {
    body: { style: { overflow: '' } },
    documentElement: {
      style: { overflow: '' },
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
    },
  };
}

describe('overlayLock', () => {
  let stub: ReturnType<typeof makeDocumentStub>;

  beforeEach(() => {
    vi.resetModules();
    stub = makeDocumentStub();
    (globalThis as unknown as { document: unknown }).document = stub;
  });

  it('hält den Lock, solange ein Overlay offen ist', async () => {
    const { lockOverlay, unlockOverlay } = await import('./overlayLock');
    lockOverlay(); // Sessions-Sheet
    lockOverlay(); // Warm-up-Sheet darüber
    expect(stub.body.style.overflow).toBe('hidden');

    unlockOverlay(); // Warm-up schließt — Session bleibt offen
    expect(stub.body.style.overflow).toBe('hidden');
    expect(stub.documentElement.style.overflow).toBe('hidden');
    expect(stub.documentElement.classList.contains('overlay-open')).toBe(true);

    unlockOverlay(); // Session schließt
    expect(stub.body.style.overflow).toBe('');
    expect(stub.documentElement.style.overflow).toBe('');
    expect(stub.documentElement.classList.contains('overlay-open')).toBe(false);
  });

  it('gibt den Lock bei überzähligen unlock-Aufrufen nicht negativ frei', async () => {
    const { lockOverlay, unlockOverlay } = await import('./overlayLock');
    lockOverlay();
    unlockOverlay();
    unlockOverlay();
    expect(stub.body.style.overflow).toBe('');
    expect(stub.documentElement.classList.contains('overlay-open')).toBe(false);

    lockOverlay();
    expect(stub.body.style.overflow).toBe('hidden');
  });
});
