import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

type ContentScriptContext = Parameters<typeof createShadowRootUi>[0];
import ReactDOM from 'react-dom/client';
import { Panel } from '../../components/Panel/Panel';
import { PANEL_HOST_ID } from '../../config';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  cssInjectionMode: 'ui',
  async main(ctx: ContentScriptContext) {
    if (document.getElementById(PANEL_HOST_ID)) return;

    const ui = await createShadowRootUi(ctx, {
      name: PANEL_HOST_ID,
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<Panel />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
