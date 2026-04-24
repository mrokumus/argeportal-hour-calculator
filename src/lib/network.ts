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
