import { GITHUB_REPO } from '../config';

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`,
    );
    const { version } = (await res.json()) as { version: string };
    return version;
  } catch {
    return null;
  }
}

export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}
