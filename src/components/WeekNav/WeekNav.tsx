import dayjs, { type Dayjs } from 'dayjs';
import type { CalcMode } from '../../types';
import { getMondayOfWeek, getSundayOfWeek } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './WeekNav.module.css';

interface Props {
  weekOffset: number;
  monthStart: Dayjs;
  disabled: boolean;
  calcMode: CalcMode;
  onPrev: () => void;
  onNext: () => void;
  onCalcModeToggle: () => void;
}

function formatRange(offset: number): string {
  const monday = getMondayOfWeek(offset);
  const sunday = getSundayOfWeek(offset);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(monday)}-${fmt(sunday)}`;
}

function getLabel(weekOffset: number): string {
  const r = formatRange(weekOffset);
  if (weekOffset === 0) return t('thisWeekNav', { r });
  if (weekOffset === -1) return t('lastWeekNav', { r });
  return t('weeksAgoNav', { n: Math.abs(weekOffset), r });
}

export function WeekNav({ weekOffset, monthStart, disabled, calcMode, onPrev, onNext, onCalcModeToggle }: Props) {
  const prevSunday = dayjs(getSundayOfWeek(weekOffset - 1));
  const canGoPrev = !prevSunday.isBefore(monthStart, 'day');
  const canGoNext = weekOffset < 0;

  return (
    <div className={styles.nav}>
      <button
        className={styles.btn}
        onClick={onPrev}
        disabled={disabled || !canGoPrev}
        style={{ visibility: canGoPrev ? 'visible' : 'hidden' }}
      >
        {t('prevBtn')}
      </button>
      <span className={styles.label}>{getLabel(weekOffset)}</span>
      <div className={styles.rightSlot}>
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
        <button
          className={styles.btn}
          onClick={onNext}
          disabled={disabled || !canGoNext}
          style={{ visibility: canGoNext ? 'visible' : 'hidden' }}
        >
          {t('nextBtn')}
        </button>
      </div>
    </div>
  );
}
