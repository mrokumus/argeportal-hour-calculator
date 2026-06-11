import { useRef } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { CalcMode } from '../../types';
import { getMondayOfWeek, getSundayOfWeek } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './WeekNav.module.css';

interface Props {
  weekOffset: number;
  monthStart: Dayjs;
  disabled: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
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

export function WeekNav({ weekOffset, monthStart, disabled, panelRef, calcMode, onPrev, onNext, onCalcModeToggle }: Props) {
  const navRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, left: 0, top: 0 });

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;
    dragging.current = true;
    const panel = panelRef.current;
    start.current = {
      x: e.clientX,
      y: e.clientY,
      left: parseInt(panel?.style.left ?? '24') || 24,
      top: parseInt(panel?.style.top ?? '618') || 618,
    };
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!dragging.current || !panel) return;
      panel.style.left = `${start.current.left + ev.clientX - start.current.x}px`;
      panel.style.top = `${start.current.top + ev.clientY - start.current.y}px`;
    }

    function onUp() {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const prevSunday = dayjs(getSundayOfWeek(weekOffset - 1));
  const canGoPrev = !prevSunday.isBefore(monthStart, 'day');
  const canGoNext = weekOffset < 0;

  return (
    <div ref={navRef} className={styles.nav} onMouseDown={handleMouseDown}>
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
