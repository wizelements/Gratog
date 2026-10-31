import { describe, it, expect } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import {
  reserveMarketItems, releaseMarketHold,
} from '@/lib/commerce/market-stock-reservations';

const uri=process.env.MONGODB_URI || '';
const isolated=uri.startsWith('mongodb://127.0.0.1:27017/')&&
  uri.includes('replicaSet=rs0');
const run=isolated?it:it.skip;

describe('Market multi-item stock holds: real disposable MongoDB transactions',()=>{
  run('cannot oversell a market bottle, supports retry and release',async()=>{
    const client=new MongoClient(uri,{serverSelectionTimeoutMS:8000});
    const dbName='tog_market_hold_'+randomUUID().replaceAll('-','').slice(0,16);
    process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED='true'; // TEST PROCESS ONLY
    await client.connect();
    const db=client.db(dbName);
    try {
      const now=new Date();
      const squareRows=[
        {slug:'calm-waters',status:'found',countStatus:'reported',variationId:'QA_VAR_1',onHand:2},
        {slug:'supplemint',status:'found',countStatus:'reported',variationId:'QA_VAR_2',onHand:2},
      ];
      const stock=db.collection('market_stock_allocations');
      for(const [slug,variationId] of [['calm-waters','QA_VAR_1'],['supplemint','QA_VAR_2']]) {
        await stock.insertOne({
          _id:`serenbe:2026-10-31:${slug}`,
          marketId:'serenbe',serviceDate:'2026-10-31',slug,
          squareVariationId:variationId,squareLocationId:'QA_LOC',
          approvedUnits:1,heldUnits:0,soldUnits:0,
          merchantApprovedAt:now,squareObservedAt:now,
          verifiedSquareOnHand:2,merchantPhysicalCountVerified:true,
          separatelyAllocatedFromOtherChannels:true,
          paymentCertification:'verified',sessionStatus:'open',priceCents:1199,
        });
      }
      const input={
        db,client,marketId:'serenbe',serviceDate:'2026-10-31',
        items:[{slug:'calm-waters',quantity:1},{slug:'supplemint',quantity:1}],
        requestId:randomUUID(),squareRows,now,
      };
      const held=await reserveMarketItems(input);
      expect(held.status).toBe('held');
      expect(held.paymentStatus).toBe('not_charged');
      expect((await stock.findOne({_id:'serenbe:2026-10-31:calm-waters'}))?.heldUnits).toBe(1);
      const retry=await reserveMarketItems(input);
      expect(retry._id).toBe(held._id);
      await expect(reserveMarketItems({...input,requestId:randomUUID()}))
        .rejects.toThrow('MARKET_STOCK_NOT_AVAILABLE');
      expect(await db.collection('market_reservations').countDocuments({status:'held'})).toBe(1);
      expect(await releaseMarketHold({db,client,holdId:held._id})).toBe(true);
      expect(await releaseMarketHold({db,client,holdId:held._id})).toBe(false);
      expect((await stock.findOne({_id:'serenbe:2026-10-31:supplemint'}))?.heldUnits).toBe(0);
      const another=await reserveMarketItems({...input,requestId:randomUUID()});
      expect(another.status).toBe('held');
      expect(await db.collection('market_reservations').countDocuments({status:'held'})).toBe(1);
    } finally {
      await db.dropDatabase();
      await client.close();
      delete process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED;
    }
  },30000);
});
