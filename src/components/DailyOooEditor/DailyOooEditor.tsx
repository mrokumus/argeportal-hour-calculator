import { useEffect, useState } from 'react';
import type { LeaveData } from '../../types';
import { getDailyOoo, getDailyCap, getUnassignedOoo, setDailyOoo, assignUnassignedOoo } from '../../lib/ooo';
import { formatOOO } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './DailyOooEditor.module.css';

interface Props {
  date: string;
  data: LeaveData;
  baseCap: number;
  disabled: boolean;
  onChange: (data: LeaveData) => void;
  onClose: () => void;
}

export function DailyOooEditor({ date, data, baseCap, disabled, onChange, onClose }: Props) {
  const minutes = getDailyOoo(data, date);
  const [draft, setDraft] = useState(formatOOO(minutes));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(formatOOO(minutes)); setInvalid(false); }, [date, minutes]);
  function commit(value: number) {
    if (disabled) return;
    onChange(setDailyOoo(data, date, value));
    setDraft(formatOOO(Math.min(1440, Math.max(0, value))));
    setInvalid(false);
  }
  const unassigned = getUnassignedOoo(data);
  return (
    <form className={styles.editor} onSubmit={event => {
      event.preventDefault();
      const match = /^(\d{1,2}):([0-5]\d)$/.exec(draft);
      const value = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
      if (value < 0 || value > 1440) { setInvalid(true); return; }
      commit(value);
      if (!disabled) onClose();
    }}>
      <div className={styles.header}>
        <label htmlFor="daily-ooo">{t('oooLabel')} · {date.split('-').reverse().join('.')}</label>
        <button type="button" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
      <div className={styles.controls}>
        <button type="button" disabled={disabled || minutes === 0} onClick={() => commit(minutes - 15)} aria-label={t('decreaseTime')}>−</button>
        <input id="daily-ooo" type="text" inputMode="numeric" value={draft} disabled={disabled}
          aria-invalid={invalid} aria-describedby="daily-ooo-hint" onChange={event => { setDraft(event.target.value); setInvalid(false); }} />
        <button type="button" disabled={disabled || minutes >= 1440} onClick={() => commit(minutes + 15)} aria-label={t('increaseTime')}>+</button>
        <button type="submit" disabled={disabled}>{t('save')}</button>
      </div>
      <small id="daily-ooo-hint">{t('dailyOooLimit', { h: formatOOO(getDailyCap(baseCap, data, date)) })}</small>
      {invalid && <small role="alert">{t('invalidDailyOoo')}</small>}
      {unassigned > 0 && (
        <div className={styles.legacy}>
          <small>{t('unassignedOoo', { h: formatOOO(unassigned) })}</small>
          <button type="button" disabled={disabled || minutes >= 1440} onClick={() => onChange(assignUnassignedOoo(data, date))}>{t('assignOooHere')}</button>
          <button type="button" disabled={disabled} onClick={() => onChange({ ...data, ooo: data.ooo - unassigned })}>{t('clearUnassignedOoo')}</button>
        </div>
      )}
    </form>
  );
}
