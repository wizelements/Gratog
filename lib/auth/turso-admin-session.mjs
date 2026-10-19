import {sessionMatchesAdminVersion,constrainAdminRole} from './admin-session-policy.mjs';

/** Fail-closed database revalidation of a signed admin identity. */
export class TursoAdminRefusal extends Error {
  constructor(code) {super(code);this.name='TursoAdminRefusal';}
}
export async function getTursoVerifiedAdminSession(db,claim) {
  if(!claim || typeof claim.id!=='string'||!claim.id||claim.id.length>250 ||
      !['admin','super_admin'].includes(claim.role) || typeof claim.email!=='string' ||
      !claim.email.trim())return null;
  // UNION prevents duplicate rows when both the business ID and Mongo _id
  // identify the same administrator. Any ambiguity refuses rather than picking.
  const matches=await db.all(
    'SELECT id,email,role,is_active,session_version FROM admin_identities WHERE id=? '+
    'UNION SELECT id,email,role,is_active,session_version FROM admin_identities '+
    'WHERE id IN (SELECT admin_id FROM admin_identity_references WHERE reference=?)',
    claim.id,claim.id
  );
  if(!Array.isArray(matches) || matches.length>1)
    throw new TursoAdminRefusal('ADMIN_IDENTITY_AMBIGUOUS');
  if(matches.length===0)return null;
  const row=matches[0];
  if(!sessionMatchesAdminVersion(claim,row.session_version) || row.is_active!==1 || !['admin','super_admin'].includes(row.role) ||
      typeof row.email!=='string'||!row.email.trim())return null;
  // A stale token may never gain elevated rights from a later DB role change.
  const role=constrainAdminRole(claim.role,row.role);
  return {...claim,id:row.id,email:row.email,role};
}
