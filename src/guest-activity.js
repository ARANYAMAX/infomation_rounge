// Only aggregate link activity is stored, never the token or guest credentials.
export async function recordGuestActivity(db, token, guest, opened = false) {
 if (!db) return;
 try {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const id = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO guest_link_activity
   (link_id,language,checkin,checkout,issued_at,first_opened_at,last_opened_at,open_count)
   VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(link_id) DO UPDATE SET
   issued_at=COALESCE(guest_link_activity.issued_at,excluded.issued_at),
   first_opened_at=COALESCE(guest_link_activity.first_opened_at,excluded.first_opened_at),
   last_opened_at=COALESCE(excluded.last_opened_at,guest_link_activity.last_opened_at),
   open_count=guest_link_activity.open_count+excluded.open_count`)
   .bind(id,guest.l,guest.ci,guest.co,opened ? null : now,opened ? now : null,opened ? now : null,opened ? 1 : 0).run();
 } catch { console.warn('Guest activity could not be recorded'); }
}
export function isGuestOpen(request) {
 return request.method === 'GET' && !/prefetch|prerender/i.test(
  (request.headers.get('Purpose') || '') + ' ' + (request.headers.get('Sec-Purpose') || ''));
}
