import { PAY_COLORS } from '../data/theme';

export default function PayBadge({ res, t, onCycle }) {
  const c = PAY_COLORS[res.paymentStatus] ?? PAY_COLORS.Unpaid;

  return (
    <span
      className="pay-badge"
      title={t.clickToChange}
      onClick={(e) => {
        e.stopPropagation();
        onCycle(res.id);
      }}
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {t[res.paymentStatus.toLowerCase()] ?? res.paymentStatus}
    </span>
  );
}
