import { createCliRenderer, type CliRenderer, type CliRendererConfig } from '@opentui/core';
import { arcaneEventBus } from '../events/ArcaneEventBus';
import type { TabId } from '../components/TabBar';

export type ArcaneRenderer = CliRenderer & {
  eventBus: typeof arcaneEventBus;
};

const TAB_ORDER: TabId[] = ['chat', 'memory', 'swd'];

export async function createArcaneRenderer(config?: Partial<CliRendererConfig>): Promise<ArcaneRenderer> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    screenMode: 'alternate-screen',
    useMouse: true,
    enableMouseMovement: true,
    targetFps: 30,
    ...config,
  }) as ArcaneRenderer;

  renderer.eventBus = arcaneEventBus;

  let currentTabIndex = 0;

  arcaneEventBus.on('tab:change', (tab) => {
    const idx = TAB_ORDER.indexOf(tab);
    if (idx !== -1) currentTabIndex = idx;
  });

  renderer.keyInput.on('keypress', (key) => {
    // Ctrl+B — toggle console panel
    if (key.ctrl && key.name === 'b') {
      arcaneEventBus.emit('console:toggle', undefined);
      return;
    }

    // Tab — cycle through tabs (chat → memory → swd → chat)
    if (key.name === 'tab' && !key.ctrl && !key.shift) {
      currentTabIndex = (currentTabIndex + 1) % TAB_ORDER.length;
      arcaneEventBus.emit('tab:change', TAB_ORDER[currentTabIndex]);
      return;
    }

    // Shift+Tab — cycle backwards
    if (key.name === 'tab' && key.shift) {
      currentTabIndex = (currentTabIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      arcaneEventBus.emit('tab:change', TAB_ORDER[currentTabIndex]);
      return;
    }
  });

  return renderer;
}