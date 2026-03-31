import { useState } from 'react';
import { ROOM_TYPES, TYPE_ICONS, TYPE_COLORS } from '../data/rooms';
import { generateId } from '../utils/dateHelpers';

export default function RoomManagement({ t, rooms, onAdd, onUpdate, onDelete, showToast }) {
  const [form, setForm] = useState({ name: '', type: 'Single', basePrice: '' });
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setForm({ name: '', type: 'Single', basePrice: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.basePrice) return;
    try {
      if (editingId) {
        await onUpdate(editingId, {
          name: form.name.trim(),
          type: form.type,
          basePrice: Number(form.basePrice),
        });
        showToast('✅ ' + t.roomUpdated);
      } else {
        await onAdd({
          id: 'rm_' + generateId(),
          name: form.name.trim(),
          type: form.type,
          basePrice: Number(form.basePrice),
        });
        showToast('✅ ' + t.roomAdded);
      }
      resetForm();
    } catch (err) {
      showToast('❌ ' + err.message);
    }
  };

  const startEdit = (room) => {
    setForm({ name: room.name, type: room.type, basePrice: String(room.basePrice) });
    setEditingId(room.id);
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(t.confirmDeleteRoom)) return;
    try {
      await onDelete(room.id);
      showToast('🗑️ ' + t.roomDeleted);
    } catch (err) {
      showToast('❌ ' + err.message);
    }
  };

  /* ── Group rooms by type ─────────────────────────────────── */
  const grouped = ROOM_TYPES.map((type) => ({
    type,
    rooms: rooms.filter((r) => r.type === type),
  })).filter((g) => g.rooms.length > 0);

  return (
    <>
      <div className="sec-hdr">
        <div style={{ fontSize: '.88rem', color: 'var(--ink2)' }}>
          🏠 {rooms.length} {t.roomCount}
        </div>
      </div>

      {/* ── Add / Edit Form ── */}
      <div className="card rm-form-card">
        <div className="sec-title">
          {editingId ? '✏️ ' + t.editRoom : '➕ ' + t.addRoom}
        </div>
        <form onSubmit={handleSubmit} className="rm-form">
          <div className="fg">
            <label>{t.roomName}</label>
            <input
              className="fi"
              placeholder="Стая 31"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="fg">
            <label>🏷️ {t.roomTypeLabel || t.room}</label>
            <select
              className="fi"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_ICONS[type]} {t.roomType[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>{t.basePricePerNight}</label>
            <input
              type="number"
              className="fi"
              placeholder="0"
              value={form.basePrice}
              onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
              min="0"
              required
            />
          </div>
          <div className="rm-form-actions">
            <button type="submit" className="btn btn-mint btn-sm">
              {editingId ? '✅ ' + t.saveRoom : '➕ ' + t.addRoom}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}>
                {t.cancelEdit}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Room List grouped by type ── */}
      {grouped.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-emoji">🏠</div>
            <div className="empty-sub">{t.noRooms}</div>
          </div>
        </div>
      ) : (
        grouped.map(({ type, rooms: typeRooms }) => {
          const tc = TYPE_COLORS[type];
          return (
            <div key={type} className="card rm-group">
              <div className="rm-group-hdr" style={{ borderLeftColor: tc.accent }}>
                <span className="rm-group-icon">{TYPE_ICONS[type]}</span>
                <span className="rm-group-name">{t.roomType[type]}</span>
                <span className="rm-group-count">{typeRooms.length} {t.roomCount}</span>
              </div>
              <div className="rm-list">
                {typeRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`rm-item ${editingId === room.id ? 'editing' : ''}`}
                    style={{ borderLeftColor: tc.accent }}
                  >
                    <div className="rm-item-info">
                      <span className="rm-item-name">{room.name}</span>
                      <span className="rm-item-price">{room.basePrice} лв/{t.night}</span>
                    </div>
                    <div className="rm-item-actions">
                      <button
                        className="btn btn-outline btn-sm btn-icon"
                        title={t.editRoom}
                        onClick={() => startEdit(room)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title={t.deleteRoom}
                        onClick={() => handleDeleteRoom(room)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
