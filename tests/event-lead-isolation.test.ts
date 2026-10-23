import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => {
  const insertOne = vi.fn().mockResolvedValue({ insertedId: 'mock-event' });
  const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
  const collection = vi.fn().mockReturnValue({ insertOne, updateOne });
  const connectToDatabase = vi.fn().mockResolvedValue({ db: { collection } });
  return { insertOne, updateOne, collection, connectToDatabase };
});
vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: mock.connectToDatabase }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from '@/app/api/lead/route';

function send(body: object) {
  return POST(new NextRequest('https://tasteofgratitude.shop/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

const event = (date: string) => ({
  intent: 'event_booking_inquiry', source: 'events_page',
  name: 'Organizer', email: 'organizer@example.com', phone: '4045550100',
  message: 'Golf tournament',
  metadata: { eventDate: date, eventType: 'Golf or sports tournament', guestCount: 75 },
});

beforeEach(() => {
  mock.insertOne.mockReset().mockResolvedValue({ insertedId: 'mock-event' });
  mock.updateOne.mockReset().mockResolvedValue({ acknowledged: true });
  mock.collection.mockClear();
  mock.connectToDatabase.mockReset().mockResolvedValue({
    db: { collection: mock.collection },
  });
});

describe('separate qualified event inquiries', () => {
  it('preserves two event opportunities from the same organizer', async () => {
    expect((await send(event('2026-11-11'))).status).toBe(200);
    expect((await send(event('2026-12-12'))).status).toBe(200);
    expect(mock.insertOne).toHaveBeenCalledTimes(2);
    expect(mock.insertOne.mock.calls[0][0].metadata.eventDate).toBe('2026-11-11');
    expect(mock.insertOne.mock.calls[1][0].metadata.eventDate).toBe('2026-12-12');
    expect(mock.updateOne).not.toHaveBeenCalled();
  });

  it('keeps newsletter deduplication separate from event requests', async () => {
    expect((await send({
      intent: 'email_signup', source: 'homepage_retention_footer',
      email: 'subscriber@example.com',
    })).status).toBe(200);
    expect(mock.insertOne).not.toHaveBeenCalled();
    expect(mock.updateOne).toHaveBeenCalledTimes(2);
    expect(mock.collection).toHaveBeenCalledWith('newsletter_subscribers');
  });

  it('never acknowledges an event that failed database persistence', async () => {
    mock.insertOne.mockRejectedValueOnce(new Error('storage offline'));
    const response = await send(event('2026-11-11'));
    expect(response.status).toBe(503);
    expect((await response.json()).persisted).toBe(false);
  });
});
