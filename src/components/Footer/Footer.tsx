import { useEffect, useState } from 'react';
import { fetchLatestVersion, RELEASES_URL } from '../../lib/network';
import { t } from '../../lib/i18n';
import styles from './Footer.module.css';

export function Footer() {
  const version = browser.runtime.getManifest().version;
  const [linkText, setLinkText] = useState(t('checking'));
  const [linkHref, setLinkHref] = useState<string | undefined>(undefined);
  const [linkColor, setLinkColor] = useState('#bbb');

  useEffect(() => {
    fetchLatestVersion().then((latest) => {
      if (!latest) {
        setLinkText(t('releases'));
        setLinkHref(RELEASES_URL);
        return;
      }
      if (latest === version) {
        setLinkText(t('upToDate'));
        setLinkColor('#10b981');
        setLinkHref(undefined);
      } else {
        setLinkText(t('updateAvailable', { v: latest }));
        setLinkColor('#ef4444');
        setLinkHref(RELEASES_URL);
      }
    });
  }, [version]);

  return (
    <div className={styles.footer}>
      <span className={styles.version}>v{version.replace(/^v/, '')}</span>
      <a
        className={styles.link}
        href={linkHref}
        target="_blank"
        rel="noreferrer"
        style={{ color: linkColor, cursor: linkHref ? 'pointer' : 'default' }}
      >
        {linkText}
      </a>
    </div>
  );
}
