import {TURSO_PREVIEW_DATABASE_NAME} from './turso-preview-runtime.mjs';
/** This classification is only valid after authenticated Square Sandbox order readback. */
export const belongsToCurrentPreviewDatabase=order=>Boolean(
 order&&typeof order.id==='string'&&order.id&&
 typeof order.reference_id==='string'&&order.reference_id&&
 order.metadata?.turso_certification_database===TURSO_PREVIEW_DATABASE_NAME);
