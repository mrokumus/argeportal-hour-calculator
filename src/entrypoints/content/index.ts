import { parseSnapshot } from '../../lib/parser';

/**
 * The content script is now a thin, on-demand parser. The popup injects it into
 * the active tab (via scripting.executeScript) and asks it to scrape the page;
 * it renders no UI of its own.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main() {
    // The popup may inject this file more than once (each refresh). Guard so we
    // register the message listener exactly once per page.
    const w = window as unknown as { __pdksParserRegistered?: boolean };
    if (w.__pdksParserRegistered) return;
    w.__pdksParserRegistered = true;

    browser.runtime.onMessage.addListener((message: unknown) => {
      if ((message as { type?: string })?.type === 'PDKS_PARSE') {
        // Returning a Promise sends its resolved value back as the response —
        // reliable in both Chrome MV3 and Firefox MV2 via the webext polyfill.
        return parseSnapshot();
      }
      return undefined;
    });
  },
});
