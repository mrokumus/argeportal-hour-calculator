import type { CalcMode } from '../../types';
import { getMondayOfWeek, getSundayOfWeek } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './WeekNav.module.css';

interface Props {
  calcMode: CalcMode;
  onCalcModeToggle: () => void;
}

function formatRange(offset: number): string {
  const monday = getMondayOfWeek(offset);
  const sunday = getSundayOfWeek(offset);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(monday)}-${fmt(sunday)}`;
}

export function WeekNav({ calcMode, onCalcModeToggle }: Props) {
  return (
    <div className={styles.nav}>
      <span className={styles.label}>{t('thisWeekNav', { r: formatRange(0) })}</span>
        <div className={styles.modeField}>
          <button
            className={`${styles.modeBtn} ${calcMode === 'span' ? styles.modeBtnActive : ''}`}
            onClick={onCalcModeToggle}
          >
            {t(calcMode === 'span' ? 'calcModeSpanLabel' : 'calcModeSessionsLabel')}
          </button>
          <div className={styles.modeTooltip}>
            {t(calcMode === 'span' ? 'calcModeSpanTip' : 'calcModeSessionsTip')}
          </div>
        </div>
    </div>
  );
}
