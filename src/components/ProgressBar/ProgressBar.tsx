import { t } from '../../lib/i18n';
import styles from './ProgressBar.module.css';

interface Props {
  percent: number;
  targetH: number;
}

export function ProgressBar({ percent, targetH }: Props) {
  const p = Math.min(100, Math.round(percent));
  const color = p >= 100 ? '#10b981' : p >= 70 ? '#3b82f6' : '#f59e0b';

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${p}%`, background: color }} />
      </div>
      <div className={styles.labels}>
        <span className={styles.labelText}>0</span>
        <span className={styles.labelText}>
          {p}% / {parseFloat(targetH.toFixed(2))}{t('hoursUnit')}
        </span>
      </div>
    </div>
  );
}
