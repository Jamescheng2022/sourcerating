"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const RESPONSE_LIMIT = 4 * 1024 * 1024;
type Kind = 'index' | 'archive';
type Job = { controller: AbortController; scope: string };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Refuse malformed, cross-room and partial responses before creating a download. */
function validateDownload(value: unknown, kind: Kind, roomId: string) {
  if (!record(value)) throw Error('The export response is invalid. No download was created.');
  const index = kind === 'archive' ? value.evidenceIndex : value;
  if (!record(index) || index.schema !== 'sourcerating-room-evidence-v1' || !record(index.room) || index.room.id !== roomId ||
      !['events', 'files', 'proposals', 'canonical_objects', 'needs_you'].every(k => Array.isArray(index[k]))) {
    throw Error('The export response does not match this room. No download was created.');
  }
  if (kind === 'archive') {
    const files = index.files as unknown[];
    const contents = value.contents;
    if (value.schema !== 'sourcerating-room-archive-v1' || value.complete !== true || !Array.isArray(contents) ||
        contents.length !== files.length || new Set(contents.map(c => record(c) ? c.fileVersionId : null)).size !== files.length ||
        !files.every(file => record(file) && contents.some(c => record(c) && c.fileVersionId === file.id &&
          c.sha256 === file.sha256 && c.sizeBytes === file.size_bytes && c.encoding === 'base64' && typeof c.content === 'string'))) {
      throw Error('The archive is incomplete or invalid. No download was created.');
    }
  }
}

async function readArchive(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401) throw Error('Your session ended. Sign in again to export.');
    if (response.status === 403) throw Error('Room access is unavailable. No archive was downloaded.');
    if (response.status === 413) throw Error('This room exceeds the archive limit. Download the evidence index separately; it excludes file bytes.');
    throw Error('The archive could not be completed. No partial archive was downloaded. Please retry.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error('The archive response is empty. Please retry.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > RESPONSE_LIMIT) throw Error('The archive exceeds the download limit. No download was created.');
      chunks.push(value);
    }
    signal.throwIfAborted();
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw Error('The archive response is invalid. No download was created.'); }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export function useRoomEvidenceDownloads(roomId: string, userId: string | null) {
  const scope = `${userId ?? ''}:${roomId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const jobRef = useRef<Job | null>(null);
  const [state, setState] = useState({ scope, busy: false, status: '' });
  const cancel = () => {
    const job = jobRef.current;
    if (!job) return;
    jobRef.current = null; job.controller.abort();
    setState({ scope: job.scope, busy: false, status: 'Export cancelled. No new download was created.' });
  };
  useEffect(() => {
    setState(previous => previous.scope === scope ? previous : { scope, busy: false, status: '' });
    // A cross-tab sign-out/account switch must not finish a private delayed download.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== userId) {
        const job = jobRef.current;
        if (job?.scope === scope) {
          jobRef.current = null; job.controller.abort();
          setState({ scope, busy: false, status: 'Account changed. Export cancelled; sign in again.' });
        }
      }
    });
    return () => {
      data.subscription.unsubscribe();
      const job = jobRef.current;
      if (job?.scope === scope) { jobRef.current = null; job.controller.abort(); }
    };
  }, [scope, userId]);

  const download = async (kind: Kind) => {
    if (!roomId || !userId || jobRef.current) return;
    const job: Job = { scope, controller: new AbortController() }; jobRef.current = job;
    const signal = job.controller.signal;
    const timer = setTimeout(() => job.controller.abort(), 30000);
    const current = () => jobRef.current === job && scopeRef.current === scope;
    setState({ scope, busy: true, status: kind === 'archive' ? 'Preparing archive…' : 'Preparing evidence index…' });
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!current()) return;
      if (!session || session.user.id !== userId) throw Error('Your session changed. Sign in again to export.');
      let data: unknown;
      if (kind === 'archive') {
        data = await readArchive(await fetch('/api/project-room/archive', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
          headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ roomId }) }), signal);
      } else {
        const result = await supabase.rpc('export_room_evidence', { p_room_id: roomId }).abortSignal(signal);
        if (result.error) throw Error('Evidence export failed or room access ended. Please retry.');
        data = result.data;
      }
      if (!current()) return;
      signal.throwIfAborted();
      validateDownload(data, kind, roomId);
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      if (blob.size > RESPONSE_LIMIT) throw Error('The export exceeds the download limit. No download was created.');
      const latest = (await supabase.auth.getSession()).data.session;
      if (!current()) return;
      signal.throwIfAborted();
      if (latest?.user.id !== userId) throw Error('Your session changed. No download was created.');
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = href;
      link.download = `room-${roomId}-${kind === 'archive' ? 'archive' : 'evidence'}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
      setState({ scope, busy: false, status: kind === 'archive' ? 'Archive download started. Includes all file versions in this room snapshot.' : 'Evidence index downloaded. File bytes are not included.' });
    } catch (error) {
      if (current()) setState({ scope, busy: false, status: signal.aborted ? 'Export timed out. No new download was created. Please retry.' : error instanceof Error ? error.message : 'Export failed. Please retry.' });
    } finally {
      clearTimeout(timer);
      if (jobRef.current === job) jobRef.current = null;
    }
  };
  return { download, cancel, busy: state.scope === scope && state.busy, status: state.scope === scope ? state.status : '', enabled: !!roomId && !!userId };
}

export function EvidenceDownloadControls({ actions, dark = false }: { actions: ReturnType<typeof useRoomEvidenceDownloads>; dark?: boolean }) {
  return <div className="mt-3 space-y-2 text-xs">
    <button type="button" onClick={() => void actions.download('index')} disabled={actions.busy || !actions.enabled}
      className={`block rounded border px-3 py-2 text-left disabled:opacity-50 ${dark ? 'border-slate-700 text-cyan-300' : 'border-slate-300 text-slate-700'}`}>Export room evidence index</button>
    <button type="button" onClick={() => void actions.download('archive')} disabled={actions.busy || !actions.enabled}
      className={`block rounded border px-3 py-2 text-left disabled:opacity-50 ${dark ? 'border-slate-700 text-cyan-300' : 'border-slate-300 text-slate-700'}`}>Download room archive with files</button>
    <p className={dark ? 'text-slate-400' : 'text-slate-600'}>Archive: up to 50 file versions, 2 MiB total. One room snapshot; excludes previously deleted files.</p>
    {actions.busy && <button type="button" onClick={actions.cancel} className="rounded border px-3 py-2">Cancel export</button>}
    {actions.status && <p role="status" className={dark ? 'text-slate-300' : 'text-slate-600'}>{actions.status}</p>}
  </div>;
}
