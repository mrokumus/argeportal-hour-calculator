import type { ParseResult } from '../types';
import { t } from './i18n';

/**
 * Ask the active tab to parse ARGEPORTAL. Injects the parser content script
 * (activeTab grant) then messages it. Any failure — a non-scriptable page
 * (chrome://, store pages) or a page that isn't ARGEPORTAL — comes back as
 * { ok: false } so the popup can fall back to cached data.
 */
export async function requestParse(): Promise<ParseResult> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { ok: false, reason: t('notFoundEmpty') };

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['/content-scripts/content.js'],
    });

    const res = (await browser.tabs.sendMessage(tab.id, { type: 'PDKS_PARSE' })) as
      | ParseResult
      | undefined;
    return res ?? { ok: false, reason: t('notFoundEmpty') };
  } catch {
    return { ok: false, reason: t('notFoundEmpty') };
  }
}
