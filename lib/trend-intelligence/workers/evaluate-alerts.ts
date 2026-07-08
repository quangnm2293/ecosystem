import { alertRepository } from '@/lib/trend-intelligence/repositories/alert.repository';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type AlertEvalResult = {
  checked: number;
  triggered: number;
  results: Array<{ alertId: string; reason?: string; productId?: string; score?: number }>;
};

/**
 * Evaluate ACTIVE alerts (VN).
 * Supported rule_type: opportunity_above { threshold, productId? }
 */
export async function evaluateAlerts(limit = 50): Promise<AlertEvalResult> {
  const alerts = await alertRepository.listActive(limit);
  const results: AlertEvalResult['results'] = [];
  let triggered = 0;

  for (const alert of alerts) {
    if (alert.ruleType !== 'opportunity_above') {
      results.push({ alertId: alert.id, reason: `unsupported rule: ${alert.ruleType}` });
      continue;
    }

    const threshold = Number(alert.ruleParams.threshold ?? 70);
    const productId =
      typeof alert.ruleParams.productId === 'string' ? alert.ruleParams.productId : null;

    let query = getTiktokDb()
      .from('product_metrics_current')
      .select('product_id, opportunity_score, products!inner(region, status)')
      .eq('products.region', 'VN')
      .eq('products.status', 'ACTIVE')
      .gte('opportunity_score', threshold)
      .order('opportunity_score', { ascending: false })
      .limit(1);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) {
      results.push({ alertId: alert.id, reason: error.message });
      continue;
    }

    const hit = (data ?? [])[0] as
      | { product_id: string; opportunity_score: number }
      | undefined;

    if (!hit) {
      results.push({ alertId: alert.id, reason: 'no match' });
      continue;
    }

    await alertRepository.markTriggered(alert.id);
    await alertRepository.logNotification({
      alertId: alert.id,
      userId: alert.userId,
      channel: alert.channels[0] ?? 'in_app',
      payload: {
        ruleType: alert.ruleType,
        threshold,
        productId: hit.product_id,
        opportunityScore: hit.opportunity_score,
        message: `Opportunity ${hit.opportunity_score} ≥ ${threshold}`,
      },
    });

    triggered++;
    results.push({
      alertId: alert.id,
      productId: hit.product_id,
      score: hit.opportunity_score,
      reason: 'triggered',
    });
  }

  return { checked: alerts.length, triggered, results };
}
