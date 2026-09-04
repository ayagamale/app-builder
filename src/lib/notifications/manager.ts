import { query } from "@/lib/db/client";

export interface NotificationEntry {
  userId?: string;
  type: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  metadata?: Record<string, unknown>;
}

/** Create a notification for a user (or a system-wide one if userId is null). */
export async function notify(entry: NotificationEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, level, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.userId || null,
        entry.type,
        entry.level,
        entry.message,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    console.error("[notifications] failed to create:", err);
  }
}

/** Notify all admins about a system event. */
export async function notifyAdmins(
  type: string,
  level: NotificationEntry["level"],
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const admins = await query<{ id: string }>(
      "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = true"
    );
    for (const admin of admins) {
      await notify({ userId: admin.id, type, level, message, metadata });
    }
  } catch (err) {
    console.error("[notifications] failed to notify admins:", err);
  }
}

/** Get notifications for a user, newest first. */
export async function getNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
) {
  const limit = Math.min(opts.limit || 50, 200);
  let where = "user_id = $1";
  const params: unknown[] = [userId, limit];
  if (opts.unreadOnly) {
    where += " AND is_read = false";
  }
  return query(
    `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $2`,
    params
  );
}

/** Mark a notification as read. */
export async function markRead(notificationId: string): Promise<void> {
  await query("UPDATE notifications SET is_read = true WHERE id = $1", [
    notificationId,
  ]);
}

/** Mark all notifications as read for a user. */
export async function markAllRead(userId: string): Promise<void> {
  await query(
    "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
    [userId]
  );
}
