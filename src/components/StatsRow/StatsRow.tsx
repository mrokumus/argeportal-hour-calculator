import styles from './StatsRow.module.css';

interface Props {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}

export function StatsRow({ label, value, color = '#111', small = false }: Props) {
  return (
    <div className={`${styles.row}${small ? ' ' + styles.small : ''}`}>
      <span className={`${styles.label}${small ? ' ' + styles.small : ''}`}>{label}</span>
      <span className={`${styles.value}${small ? ' ' + styles.small : ''}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
