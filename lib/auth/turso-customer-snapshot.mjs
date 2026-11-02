/** Integrated Preview compatibility boundary. Source IDs and hashes remain
 * preserved, while authorization uses persistent accounts and revocable sessions. */
import {findTursoCustomerByEmail,findTursoCustomerById,verifyTursoCustomerSession}
  from './turso-customer-accounts.mjs';
export class TursoCustomerIdentityError extends Error {
  constructor(code){super(code);this.name='TursoCustomerIdentityError';}
}
export const getTursoCustomerForLogin=(db,email)=>findTursoCustomerByEmail(db,email);
export async function getTursoCustomerSession(db,claim){
  const verified=await verifyTursoCustomerSession(db,claim);
  return verified?findTursoCustomerById(db,verified.userId):null;
}
