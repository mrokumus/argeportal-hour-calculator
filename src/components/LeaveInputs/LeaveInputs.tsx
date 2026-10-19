import { useEffect, useRef } from 'react';
import type { LeaveData } from '../../types';
import { formatOOO, clampLeaveDays } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './LeaveInputs.module.css';

interface Props {
  data: LeaveData;
  disabled: boolean;
  maxLeaveDays: number;
  onLeaveChange: (data: LeaveData) => void;
  onEditOoo: () => void;
  oooTotal: number;
}

export function LeaveInputs({ data, disabled, maxLeaveDays, onLeaveChange, onEditOoo, oooTotal }: Props) {
  const leaveRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (leaveRef.current && document.activeElement !== leaveRef.current) leaveRef.current.value = String(data.leave);
  }, [data.leave]);

  return (
    <div className={styles.section}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('leaveLabel')}</span>
        <input ref={leaveRef} id="pdks-leave" type="number" min={0} max={maxLeaveDays}
          defaultValue={data.leave} disabled={disabled} className={styles.input}
          onChange={() => {
            if (!disabled) onLeaveChange({ ...data,
              leave: clampLeaveDays(parseInt(leaveRef.current?.value ?? '0') || 0, maxLeaveDays), autoDetected: false });
          }}
          onBlur={() => { if (leaveRef.current) leaveRef.current.value = String(data.leave); }}
        />
        <span className={styles.unit}>{t('leaveDays')}</span>
      </div>
      <button type="button" className={styles.oooSummary} onClick={onEditOoo} disabled={disabled}>
        {t('oooLabel')} <b>{formatOOO(oooTotal)}</b>
      </button>
    </div>
  );
}
