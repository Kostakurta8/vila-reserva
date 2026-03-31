/* ─── Per-reservation Excel (.xlsx) export using SheetJS ─────────────────── */
import * as XLSX from 'xlsx';
import { nightsBetween } from './dateHelpers';

/**
 * Download a single reservation as a formatted .xlsx file.
 */
export function downloadReservationExcel(res, t, rooms) {
  const room = rooms.find((r) => r.id === res.roomId);
  const n = nightsBetween(res.checkIn, res.checkOut);

  const data = [
    [t.appName, '', '', ''],
    ['', '', '', ''],
    [t.room, room?.name ?? '—', t.roomType[room?.type] ?? '', ''],
    [t.guestName, res.guestName, '', ''],
    [t.contact, res.guestContact || '—', '', ''],
    [t.checkIn, res.checkIn, '', ''],
    [t.checkOut, res.checkOut, '', ''],
    [`${n === 1 ? t.night : t.nights}`, n, '', ''],
    [t.price, `${res.price} лв`, '', ''],
    [t.payStatus, t[res.paymentStatus.toLowerCase()] ?? res.paymentStatus, '', ''],
    [t.notes, res.notes || '—', '', ''],
    ['', '', '', ''],
    [t.exportGenerated, new Date().toLocaleDateString(), '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  /* Column widths */
  ws['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 18 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.nav?.reservations ?? 'Reservation');

  const safeName = (res.guestName || 'reservation')
    .replace(/[^a-zA-Z0-9а-яА-Я ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 30);

  XLSX.writeFile(wb, `${safeName}_${res.checkIn}.xlsx`);
}
