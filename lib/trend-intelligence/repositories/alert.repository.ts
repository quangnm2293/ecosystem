import { mapAlert } from '@/lib/trend-intelligence/domain/mappers';
import { TiktokAlertStatus, TiktokNotificationStatus } from '@/lib/trend-intelligence/domain/enums';
import type { Alert, AlertRow } from '@/lib/trend-intelligence/domain/types';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type CreateAlertInput = {
  userId: string;
  ruleType: string;
  ruleParams?: Record<string, unknown>;
  channels?: string[];
};

export const alertRepository = {
  async listByUser(userId: string): Promise<Alert[]> {
    const { data, error } = await getTiktokDb()
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as AlertRow[]).map(mapAlert);
  },

  async countActiveByUser(userId: string): Promise<number> {
    const { count, error } = await getTiktokDb()
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', TiktokAlertStatus.ACTIVE);

    if (error) throw error;
    return count ?? 0;
  },

  async listActive(limit = 100): Promise<Alert[]> {
    const { data, error } = await getTiktokDb()
      .from('alerts')
      .select('*')
      .eq('status', TiktokAlertStatus.ACTIVE)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data as AlertRow[]).map(mapAlert);
  },

  async create(input: CreateAlertInput): Promise<Alert> {
    const now = new Date().toISOString();
    const { data, error } = await getTiktokDb()
      .from('alerts')
      .insert({
        id: crypto.randomUUID(),
        user_id: input.userId,
        rule_type: input.ruleType,
        rule_params: input.ruleParams ?? {},
        channels: input.channels?.length ? input.channels : ['in_app'],
        channel_config: {},
        status: TiktokAlertStatus.ACTIVE,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapAlert(data as AlertRow);
  },

  async delete(userId: string, alertId: string): Promise<void> {
    const { error } = await getTiktokDb()
      .from('alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async markTriggered(alertId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await getTiktokDb()
      .from('alerts')
      .update({
        status: TiktokAlertStatus.TRIGGERED,
        last_triggered: now,
        updated_at: now,
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  async logNotification(input: {
    alertId: string;
    userId: string;
    channel: string;
    payload: Record<string, unknown>;
    status?: TiktokNotificationStatus;
  }): Promise<void> {
    const { error } = await getTiktokDb().from('notification_logs').insert({
      id: crypto.randomUUID(),
      alert_id: input.alertId,
      user_id: input.userId,
      channel: input.channel,
      status: input.status ?? TiktokNotificationStatus.SENT,
      payload: input.payload,
      sent_at: new Date().toISOString(),
    });

    if (error) throw error;
  },
};
