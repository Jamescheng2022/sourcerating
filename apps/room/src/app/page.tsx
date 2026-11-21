'use client';

import React, { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { NavigationRail } from '@/components/NavigationRail';
import { RoomHeader } from '@/components/RoomHeader';
import { AIStagingCard } from '@/components/AIStagingCard';
import {
  IconAlertCircle,
  IconAtSign,
  IconCheckCircle2,
  IconFileText,
  IconMic,
  IconPaperclip,
  IconSend,
  IconX,
} from '@/components/icons';
import {
  ACTIVE_PROJECT,
  BUYER_INTERNAL_EVENTS,
  BUYER_ORGANIZATION,
  EASTFRAME_ROOM_EVENTS,
  MOCK_DECISIONS,
  MOCK_NEEDS_YOU,
  MOCK_QUOTE_COMPARISONS,
  MOCK_REQUIREMENTS,
  MOCK_ROOMS,
  SIAM_PANELS_EVENTS,
} from '@/lib/domain/mockData';
import { cn, formatRmb, formatTime } from '@/lib/utils';
import type { FileEvent, RoomEvent } from '@/types/domain';

type StateTab = 'requirements' | 'quotes' | 'files' | 'decisions' | 'actions';

const eventSets: Record<string, RoomEvent[]> = {
  'room-buyer-internal': BUYER_INTERNAL_EVENTS,
  'room-eastframe-steel': EASTFRAME_ROOM_EVENTS,
  'room-siam-panels': SIAM_PANELS_EVENTS,
};

const stateTabs: { id: StateTab; label: string }[] = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'files', label: 'Files' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'actions', label: 'Needs You' },
];

function SourceButton({ eventId, onViewSource }: { eventId: string; onViewSource: (id: string) => void }) {
  return (
    <button
      onClick={() => onViewSource(eventId)}
      className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
    >
      View source
    </button>
  );
}

function ProjectStatePanel({
  activeTab,
  onTabChange,
  onViewSource,
  onClose,
  mobile = false,
}: {
  activeTab: StateTab;
  onTabChange: (tab: StateTab) => void;
  onViewSource: (id: string) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const files = EASTFRAME_ROOM_EVENTS.filter((event): event is FileEvent => event.type === 'file');

  return (
    <aside className={cn('bg-white flex h-full min-h-0 flex-col', mobile ? 'w-full' : 'w-[360px] shrink-0 border-l border-slate-200')}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-bold text-slate-950">Project State</div>
          <div className="text-[11px] text-slate-500">Derived from reviewed conversation and evidence</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close Project State" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 py-2">
        {stateTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold',
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeTab === 'requirements' && (
          <div className="space-y-2">
            {MOCK_REQUIREMENTS.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.category}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-900">{item.label}</div>
                  </div>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                    item.status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                    item.status === 'deviation' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                  )}>
                    {item.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-[11px]">
                  <div><span className="text-slate-400">Target:</span> <span className="text-slate-700">{item.targetValue}</span></div>
                  <div><span className="text-slate-400">Current:</span> <span className="font-medium text-slate-900">{item.currentValue}</span></div>
                </div>
                <div className="mt-2"><SourceButton eventId={item.sourceEventId} onViewSource={onViewSource} /></div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-2">
            {MOCK_QUOTE_COMPARISONS.map((quote) => (
              <article key={quote.id} className={cn('rounded-lg border p-3', quote.isLatest ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50')}>
                <div className="text-xs font-semibold text-slate-900">{quote.vendorName}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><div className="text-slate-400">Total</div><div className="font-semibold">{formatRmb(quote.totalAmountRmb)}</div></div>
                  <div><div className="text-slate-400">Lead time</div><div className="font-semibold">{quote.leadTimeDays} days</div></div>
                  <div className="col-span-2"><div className="text-slate-400">Panel</div><div>{quote.panelSpec}</div></div>
                </div>
                <div className="mt-2"><SourceButton eventId={quote.sourceEventId} onViewSource={onViewSource} /></div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {files.map((file) => (
              <article key={file.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <IconFileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-900">{file.fileName}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      <span className="font-mono">{file.version}</span>
                      {file.supersedesVersion && <> · supersedes {file.supersedesVersion}</>}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">{file.checksum}</div>
                    <div className="mt-2"><SourceButton eventId={file.provenanceMessageId || file.id} onViewSource={onViewSource} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="space-y-2">
            {MOCK_DECISIONS.map((decision) => (
              <article key={decision.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <IconCheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', decision.canonicalStatus === 'canonical_confirmed' ? 'text-emerald-600' : 'text-amber-600')} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">{decision.title}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{decision.decidedBy}</div>
                    <div className="mt-2"><SourceButton eventId={decision.sourceEventId} onViewSource={onViewSource} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-2">
            {MOCK_NEEDS_YOU.map((action) => (
              <article key={action.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex items-start gap-2">
                  <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{action.title}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-slate-600">{action.description}</div>
                    <div className="mt-2"><SourceButton eventId={action.sourceEventId} onViewSource={onViewSource} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function EventRow({ event, highlight }: { event: RoomEvent; highlight: boolean }) {
  if (event.type === 'proposal') {
    return (
      <div id={event.id} className={cn('scroll-mt-24', highlight && 'highlight-source-pulse')}>
        <AIStagingCard proposal={event} />
      </div>
    );
  }

  if (event.type === 'system') {
    return (
      <div id={event.id} className={cn('scroll-mt-24 py-2', highlight && 'highlight-source-pulse')}>
        <div className="mx-auto max-w-[760px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500">
          <span className="font-semibold text-slate-700">{event.systemAction}</span> · {event.detail}
        </div>
      </div>
    );
  }

  if (event.type === 'file') {
    return (
      <div id={event.id} className={cn('scroll-mt-24 py-1', highlight && 'highlight-source-pulse')}>
        <div className="max-w-[640px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-700"><IconFileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{event.fileName}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{event.fileSize} · {event.version}{event.supersedesVersion ? ` · supersedes ${event.supersedesVersion}` : ''}</div>
              {event.summary && <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{event.summary}</p>}
              <div className="mt-2 text-[10px] text-slate-400">{formatTime(event.timestamp)} 路 {event.actor.name}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={event.id} className={cn('scroll-mt-24 py-1', highlight && 'highlight-source-pulse')}>
      <div className="max-w-[720px]">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[11px] font-bold text-slate-900">{event.actor.name}</span>
          <span className="text-[10px] text-slate-400">{event.actor.organizationName}</span>
          <span className="text-[10px] text-slate-400">{formatTime(event.timestamp)}</span>
        </div>
        <div className="rounded-xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-3 text-[13px] leading-6 text-slate-700 shadow-sm">
          {event.text}
        </div>
      </div>
    </div>
  );
}

export default function ProjectRoomPage() {
  const [activeRoomId, setActiveRoomId] = useState('room-eastframe-steel');
  const [stateOpen, setStateOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileStateOpen, setMobileStateOpen] = useState(false);
  const [stateTab, setStateTab] = useState<StateTab>('requirements');
  const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const activeRoom = useMemo(
    () => MOCK_ROOMS.find((room) => room.id === activeRoomId) || MOCK_ROOMS[1],
    [activeRoomId]
  );
  const events = eventSets[activeRoom.id] || [];

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobileNavOpen(false);
  };

  const viewSource = (eventId: string) => {
    setMobileStateOpen(false);
    setHighlightedEvent(eventId);
    requestAnimationFrame(() => {
      document.getElementById(eventId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => setHighlightedEvent((current) => (current === eventId ? null : current)), 2800);
    });
  };

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    if (!message.trim()) return;
    setMessage('');
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || isComposing || event.nativeEvent.isComposing) return;
    event.preventDefault();
    sendMessage();
  };

  const recipient = activeRoom.type === 'internal'
    ? 'Apex Living Modular internal team'
    : activeRoom.counterpartyOrgName || activeRoom.name;

  return (
    <main className="flex h-[100dvh] min-h-0 overflow-hidden bg-slate-100">
      <div className="hidden md:flex">
        <NavigationRail
          currentOrg={BUYER_ORGANIZATION}
          project={ACTIVE_PROJECT}
          rooms={MOCK_ROOMS}
          activeRoomId={activeRoom.id}
          onSelectRoom={selectRoom}
        />
      </div>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <RoomHeader
          project={ACTIVE_PROJECT}
          room={activeRoom}
          isDrawerOpen={stateOpen}
          onToggleDrawer={() => setStateOpen((open) => !open)}
          onOpenMobileRooms={() => setMobileNavOpen(true)}
          onOpenMobileState={() => setMobileStateOpen(true)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
          <div className="mx-auto max-w-[900px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Project conversation</div>
                <div className="mt-1 text-xs text-slate-600">
                  {activeRoom.type === 'internal'
                    ? 'Private project reasoning and buyer-side coordination.'
                    : `Shared project work with ${activeRoom.counterpartyOrgName}.`}
                </div>
              </div>
              <div className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500 sm:block">
                {events.length} events
              </div>
            </div>

            <div className="space-y-1">
              {events.map((event) => (
                <EventRow key={event.id} event={event} highlight={highlightedEvent === event.id} />
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2 sm:px-5">
          <div className={cn(
            'mx-auto max-w-[900px] rounded-xl border bg-white shadow-sm',
            activeRoom.type === 'internal' ? 'border-indigo-200' : 'border-amber-200'
          )}>
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-[10px]">
              <span className={cn('font-semibold', activeRoom.type === 'internal' ? 'text-indigo-700' : 'text-amber-700')}>
                Sending to: {recipient}
              </span>
              <span className="text-slate-400">{activeRoom.type === 'internal' ? 'Private boundary' : 'External company room'}</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onComposerKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={activeRoom.type === 'internal' ? 'Write an internal project note...' : `Message ${recipient}...`}
              rows={2}
              className="block max-h-32 min-h-[54px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] leading-5 text-slate-800 outline-none placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Attach file" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><IconPaperclip className="h-4 w-4" /></button>
                <button type="button" aria-label="Record voice message" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><IconMic className="h-4 w-4" /></button>
                <button type="button" aria-label="Mention person or object" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><IconAtSign className="h-4 w-4" /></button>
              </div>
              <button
                type="submit"
                disabled={!message.trim()}
                className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconSend className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </div>
        </form>
      </section>

      {stateOpen && (
        <div className="hidden md:flex">
          <ProjectStatePanel activeTab={stateTab} onTabChange={setStateTab} onViewSource={viewSource} />
        </div>
      )}

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 flex h-full w-[86%] max-w-[320px]">
            <NavigationRail
              currentOrg={BUYER_ORGANIZATION}
              project={ACTIVE_PROJECT}
              rooms={MOCK_ROOMS}
              activeRoomId={activeRoom.id}
              onSelectRoom={selectRoom}
            />
          </div>
        </div>
      )}

      {mobileStateOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 md:hidden">
          <div className="h-[88dvh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <ProjectStatePanel
              activeTab={stateTab}
              onTabChange={setStateTab}
              onViewSource={viewSource}
              onClose={() => setMobileStateOpen(false)}
              mobile
            />
          </div>
        </div>
      )}
    </main>
  );
}