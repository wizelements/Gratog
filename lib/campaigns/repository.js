import { getTursoConnection } from '@/lib/db/turso';

const parseJson = (value, fallback = {}) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};
const iso = value => value == null ? null : (value instanceof Date ? value : new Date(value)).toISOString();

function mapCampaign(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, subject: row.subject, preheader: row.preheader,
    body: row.body, segmentCriteria: parseJson(row.segment_criteria_json), status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
    sentAt: row.sent_at ? new Date(row.sent_at) : null, createdBy: row.created_by,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at), lastError: row.last_error,
    stats: { totalRecipients: Number(row.total_recipients), sent: Number(row.sent_count),
      delivered: Number(row.delivered_count), opened: Number(row.opened_count),
      clicked: Number(row.clicked_count), failed: Number(row.failed_count), skipped: Number(row.skipped_count) }
  };
}

export async function insertCampaign(campaign) {
  await getTursoConnection().run(
    `INSERT INTO campaigns (id,name,subject,preheader,body,segment_criteria_json,status,scheduled_for,sent_at,created_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    campaign.id, campaign.name, campaign.subject, campaign.preheader, campaign.body,
    JSON.stringify(campaign.segmentCriteria ?? {}), campaign.status, iso(campaign.scheduledFor),
    iso(campaign.sentAt), campaign.createdBy, iso(campaign.createdAt), iso(campaign.updatedAt)
  );
  return campaign;
}

export async function findCampaign(id) {
  return mapCampaign(await getTursoConnection().get('SELECT * FROM campaigns WHERE id = ? LIMIT 1', id));
}

export async function listCampaigns({ status, createdBy, limit = 100 } = {}) {
  const clauses = []; const args = [];
  if (status) { clauses.push('status = ?'); args.push(status); }
  if (createdBy) { clauses.push('created_by = ?'); args.push(createdBy); }
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const rows = await getTursoConnection().all(
    `SELECT * FROM campaigns${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`,
    ...args, safeLimit
  );
  return rows.map(mapCampaign);
}

export async function updateCampaignFields(id, updates) {
  const columns = {
    name:'name', subject:'subject', preheader:'preheader', body:'body', status:'status',
    scheduledFor:'scheduled_for', sentAt:'sent_at', lastError:'last_error'
  };
  const sets = []; const args = [];
  for (const [key, column] of Object.entries(columns)) if (Object.hasOwn(updates, key)) {
    sets.push(`${column} = ?`); args.push(key.endsWith('At') || key === 'scheduledFor' ? iso(updates[key]) : updates[key]);
  }
  if (Object.hasOwn(updates, 'segmentCriteria')) { sets.push('segment_criteria_json = ?'); args.push(JSON.stringify(updates.segmentCriteria ?? {})); }
  if (updates.stats) for (const [key, column] of Object.entries({ totalRecipients:'total_recipients', sent:'sent_count', delivered:'delivered_count', opened:'opened_count', clicked:'clicked_count', failed:'failed_count', skipped:'skipped_count' })) {
    if (Object.hasOwn(updates.stats, key)) { sets.push(`${column} = ?`); args.push(Number(updates.stats[key]) || 0); }
  }
  sets.push('updated_at = ?'); args.push(new Date().toISOString(), id);
  await getTursoConnection().run(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`, ...args);
  return findCampaign(id);
}

export async function deleteDraftCampaign(id) {
  const result = await getTursoConnection().run("DELETE FROM campaigns WHERE id = ? AND status <> 'sent'", id);
  return Number(result?.rowsAffected ?? result?.changes ?? 0) > 0;
}

export async function insertCampaignSend(send) {
  await getTursoConnection().run(
    `INSERT INTO campaign_email_sends (id,campaign_id,customer_id,email,status,reason,error,provider_message_id,sent_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    send.id, send.campaignId, send.userId ?? null, send.email, send.status, send.reason ?? null,
    send.error ?? null, send.resendId ?? null, iso(send.sentAt)
  );
}

export async function listCampaignSends(campaignId) {
  return getTursoConnection().all(
    `SELECT id, campaign_id AS campaignId, customer_id AS userId, email, status, reason, error,
            provider_message_id AS resendId, sent_at AS sentAt
       FROM campaign_email_sends WHERE campaign_id = ? ORDER BY sent_at`, campaignId
  );
}

// All table choices are static. Segment values are bound parameters.
export async function listSegmentCustomers(criteria = {}) {
  const clauses = ["coalesce(json_extract(c.preferences_json, '$.emailPreferences.marketing'), 1) = 1"];
  const args = [];
  if (criteria.purchaseFrequency) {
    const condition = criteria.purchaseFrequency === 'first-time' ? '= 1' : criteria.purchaseFrequency === 'repeat' ? 'BETWEEN 2 AND 4' : criteria.purchaseFrequency === 'loyal' ? '>= 5' : null;
    if (condition) clauses.push(`(SELECT count(*) FROM orders o WHERE o.customer_id = c.id) ${condition}`);
  }
  if (criteria.purchaseAmount) {
    const range = criteria.purchaseAmount === 'high' ? [20000, null] : criteria.purchaseAmount === 'medium' ? [5000, 20000] : criteria.purchaseAmount === 'low' ? [null, 5000] : null;
    if (range) {
      const sum = "coalesce((SELECT sum(o.total_cents) FROM orders o WHERE o.customer_id=c.id AND o.status IN ('completed','fulfilled','paid')),0)";
      if (range[0] != null) { clauses.push(`${sum} >= ?`); args.push(range[0]); }
      if (range[1] != null) { clauses.push(`${sum} < ?`); args.push(range[1]); }
    }
  }
  if (criteria.rewardsTier) {
    const condition = criteria.rewardsTier === 'bronze' ? '< 500' : criteria.rewardsTier === 'silver' ? 'BETWEEN 500 AND 999' : criteria.rewardsTier === 'gold' ? '>= 1000' : null;
    if (condition) clauses.push(`coalesce((SELECT max(points) FROM reward_accounts r WHERE r.customer_id=c.id),0) ${condition}`);
  }
  if (criteria.inactive === true) { clauses.push("NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id AND o.created_at >= ?)"); args.push(new Date(Date.now()-60*86400000).toISOString()); }
  if (criteria.location?.length) { clauses.push(`EXISTS (SELECT 1 FROM customer_addresses a WHERE a.customer_id=c.id AND json_extract(a.address_json,'$.city') IN (${criteria.location.map(()=>'?').join(',')}))`); args.push(...criteria.location); }
  if (criteria.customTags?.length) { clauses.push(`EXISTS (SELECT 1 FROM json_each(c.preferences_json,'$.tags') WHERE value IN (${criteria.customTags.map(()=>'?').join(',')}))`); args.push(...criteria.customTags); }
  if (criteria.productPreferences?.length) { clauses.push(`EXISTS (SELECT 1 FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.customer_id=c.id AND coalesce(json_extract(i.metadata_json,'$.category'),'') IN (${criteria.productPreferences.map(()=>'?').join(',')}))`); args.push(...criteria.productPreferences); }
  if (criteria.challengeParticipation) {
    const comparison = criteria.challengeParticipation === 'active' ? '>= 3' : '< 3';
    clauses.push(`EXISTS (SELECT 1 FROM operational_records r WHERE r.source_collection='challenges' AND json_extract(r.payload_json,'$.userId')=c.id AND coalesce(json_extract(r.payload_json,'$.streakDays'),0) ${comparison})`);
  }
  return getTursoConnection().all(`SELECT id,email,name,phone,preferences_json FROM customers c WHERE ${clauses.join(' AND ')} ORDER BY id`, ...args)
    .then(rows => rows.map(r => ({ id:r.id, email:r.email, name:r.name, phone:r.phone, ...parseJson(r.preferences_json) })));
}
