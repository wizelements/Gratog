import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  deleteDraftCampaign: vi.fn(), findCampaign: vi.fn(), insertCampaign: vi.fn(),
  insertCampaignSend: vi.fn(), listCampaignSends: vi.fn(), listCampaigns: vi.fn(),
  listSegmentCustomers: vi.fn(), updateCampaignFields: vi.fn(),
}));
const sendEmail = vi.hoisted(() => vi.fn());
vi.mock('@/lib/campaigns/repository', () => repository);
vi.mock('@/lib/email/service', () => ({ sendEmail, generateUnsubscribeToken: vi.fn(() => 'token') }));

import { CampaignValidationError, createCampaign, deleteCampaign, getCampaignAnalytics,
  getCampaigns, getSegmentCustomers, updateCampaign } from '@/lib/campaign-manager';

describe('Turso campaign runtime', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a normalized draft through the repository without sending email', async () => {
    repository.insertCampaign.mockImplementation(async value => value);
    const campaign = await createCampaign({ name:' Launch ', subject:' Hello ', body:' Body ', createdBy:'admin-1' });
    expect(campaign).toMatchObject({ name:'Launch', subject:'Hello', body:'Body', status:'draft' });
    expect(repository.insertCampaign).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid campaigns before persistence', async () => {
    await expect(createCampaign({ name:'', subject:'x', body:'x', createdBy:'admin' })).rejects.toBeInstanceOf(CampaignValidationError);
    expect(repository.insertCampaign).not.toHaveBeenCalled();
  });

  it('delegates segment criteria to the parameterized repository', async () => {
    repository.listSegmentCustomers.mockResolvedValue([{ id:'c1' }]);
    await expect(getSegmentCustomers({ purchaseFrequency:'loyal' })).resolves.toEqual([{ id:'c1' }]);
    expect(repository.listSegmentCustomers).toHaveBeenCalledWith({ purchaseFrequency:'loyal' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('lists, updates, and computes analytics without Mongo', async () => {
    repository.listCampaigns.mockResolvedValue([{ id:'c1' }]);
    await expect(getCampaigns({ status:'draft', limit:2 })).resolves.toEqual([{ id:'c1' }]);
    repository.updateCampaignFields.mockResolvedValue({ id:'c1', subject:'new' });
    await expect(updateCampaign('c1', { id:'ignored', createdBy:'ignored', subject:'new' })).resolves.toMatchObject({ subject:'new' });
    expect(repository.updateCampaignFields).toHaveBeenCalledWith('c1', { subject:'new' });
    repository.findCampaign.mockResolvedValue({ id:'c1', stats:{ totalRecipients:2 } });
    repository.listCampaignSends.mockResolvedValue([{ status:'sent' }, { status:'failed' }]);
    await expect(getCampaignAnalytics('c1')).resolves.toMatchObject({ analytics:{ sent:1, failed:1, deliveryRate:'50.0' } });
  });

  it('protects sent campaigns from deletion', async () => {
    repository.findCampaign.mockResolvedValue({ id:'c1', status:'sent' });
    await expect(deleteCampaign('c1')).rejects.toThrow('Cannot delete sent campaigns');
    expect(repository.deleteDraftCampaign).not.toHaveBeenCalled();
  });
});
