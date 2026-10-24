import type { PendingDraft } from './demo-session';

const prefix=(userId:string)=>`sr-pending-message-v1:${encodeURIComponent(userId)}:`;
const roomPrefix=(userId:string,roomId:string)=>prefix(userId)+encodeURIComponent(roomId)+':';
const key=(userId:string,draft:PendingDraft)=>roomPrefix(userId,draft.room_id)+draft.client_msg_id;

// Persist the exact request before sending. Separate message keys prevent a
// different tab's draft from being overwritten. Nothing is replayed on load.
export function savePendingMessage(storage:Storage,userId:string,draft:PendingDraft) {
  const value=JSON.stringify({version:1,userId,roomId:draft.room_id,clientMsgId:draft.client_msg_id,text:draft.text,createdAt:draft.created_at});
  const existing=storage.getItem(key(userId,draft));
  if(existing && existing!==value)throw Error('The pending message changed in another tab. Keep a copy before continuing.');
  storage.setItem(key(userId,draft),value);
}
export function readPendingMessage(storage:Storage,userId:string,roomId:string):PendingDraft|null {
  const pending:PendingDraft[]=[];
  for(let i=0;i<storage.length;i++) {
    const name=storage.key(i)!;if(!name.startsWith(roomPrefix(userId,roomId)))continue;
    const value=JSON.parse(storage.getItem(name)!);
    if(value.version!==1 || value.userId!==userId || value.roomId!==roomId ||
      typeof value.clientMsgId!=='string' || !/^[a-f0-9-]{36}$/i.test(value.clientMsgId) ||
      typeof value.text!=='string' || !value.text.trim() || typeof value.createdAt!=='string' || !Number.isFinite(Date.parse(value.createdAt)) ||
      name!==roomPrefix(userId,roomId)+value.clientMsgId)throw Error('Pending message storage is damaged. Keep a copy before signing out or clearing this browser.');
    pending.push({client_msg_id:value.clientMsgId,room_id:roomId,text:value.text,created_at:value.createdAt,status:'failed',
      error:'Delivery was not confirmed. Retry checks the original message without sending a duplicate.'});
  }
  return pending.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.client_msg_id.localeCompare(b.client_msg_id))[0] || null;
}
export function removePendingMessage(storage:Storage,userId:string,draft:PendingDraft) {storage.removeItem(key(userId,draft));}
export function clearPendingMessages(storage:Storage,userId:string) {
  const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)!).filter(k=>k.startsWith(prefix(userId)));
  for(const key of keys)storage.removeItem(key);
}
