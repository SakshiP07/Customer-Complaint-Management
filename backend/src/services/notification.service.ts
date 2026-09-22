import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../types/express.d.ts";

export type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
};

export interface NotificationChannel {
  readonly key: string;
  send(payload: NotificationPayload): Promise<void>;
}

class InAppChannel implements NotificationChannel {
  readonly key = "IN_APP";
  async send(payload: NotificationPayload) {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        entityType: payload.entityType,
        entityId: payload.entityId,
      },
    });
  }
}

class EmailChannelStub implements NotificationChannel {
  readonly key = "EMAIL";
  async send(_payload: NotificationPayload) {
    // Future: SMTP via EMAIL_* env. MVP uses in-app only.
  }
}

class SmsChannelStub implements NotificationChannel {
  readonly key = "SMS";
  async send(_payload: NotificationPayload) {
    // Future: SMS provider. MVP uses in-app only.
  }
}

const channels: NotificationChannel[] = [new InAppChannel(), new EmailChannelStub(), new SmsChannelStub()];

export const notificationService = {
  async dispatch(payload: NotificationPayload) {
    for (const channel of channels) {
      if (channel.key === "IN_APP") await channel.send(payload);
    }
  },
  async dispatchMany(userIds: string[], rest: Omit<NotificationPayload, "userId">) {
    const unique = [...new Set(userIds.filter(Boolean))];
    await Promise.all(unique.map((userId) => this.dispatch({ ...rest, userId })));
  },
  async list(user: AuthUser, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
  async markRead(user: AuthUser, id: string) {
    const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!n) return null;
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },
  async markAllRead(user: AuthUser) {
    await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  },
  async delete(user: AuthUser, id: string) {
    const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!n) return null;
    await prisma.notification.delete({ where: { id } });
    return true;
  },
};
