/**
 * Client-Side 5-Second Undo Send Buffer
 *
 * Messages wait in this buffer for 5 seconds before dispatching to the server.
 * If the user clicks "Undo", the message is returned to the draft area and
 * NEVER hits the server or room event chain (0 server calls, zero footprint).
 */

import { getUndoDelayPref } from "./preferences";

export interface BufferedMessage {
  id: string;
  roomId: string;
  text: string;
  file?: File;
  replyTo?: string;
  createdAt: number;
  endsAt: number;
  secondsRemaining: number;
}

type BufferListener = (items: BufferedMessage[]) => void;

class SendBufferManager {
  private queue: Map<string, { item: BufferedMessage; timer: ReturnType<typeof setTimeout>; onCommit: () => Promise<void> }> = new Map();
  private listeners: Set<BufferListener> = new Set();
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Auto-flush on page unload so message isn't lost if tab is closed
      window.addEventListener("beforeunload", () => {
        this.flushAllSync();
      });
    }
  }

  private notify() {
    const list = Array.from(this.queue.values()).map((v) => ({ ...v.item }));
    this.listeners.forEach((fn) => fn(list));

    if (this.queue.size > 0 && !this.ticker) {
      this.ticker = setInterval(() => {
        const now = Date.now();
        let changed = false;
        this.queue.forEach((val) => {
          const rem = Math.max(0, Math.ceil((val.item.endsAt - now) / 1000));
          if (val.item.secondsRemaining !== rem) {
            val.item.secondsRemaining = rem;
            changed = true;
          }
        });
        if (changed) this.notify();
      }, 500);
    } else if (this.queue.size === 0 && this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  enqueue(
    roomId: string,
    text: string,
    onCommit: () => Promise<void>,
    options?: { file?: File; replyTo?: string; delayMs?: number }
  ): string {
    const id = crypto.randomUUID();
    const prefSec = parseInt(getUndoDelayPref(), 10);
    const delay = options?.delayMs ?? (isNaN(prefSec) ? 5000 : prefSec * 1000);

    if (delay <= 0) {
      void onCommit();
      return id;
    }

    const now = Date.now();
    const endsAt = now + delay;

    const item: BufferedMessage = {
      id,
      roomId,
      text,
      file: options?.file,
      replyTo: options?.replyTo,
      createdAt: now,
      endsAt,
      secondsRemaining: Math.ceil(delay / 1000),
    };

    const timer = setTimeout(() => {
      void this.commit(id);
    }, delay);

    this.queue.set(id, { item, timer, onCommit });
    this.notify();
    return id;
  }

  cancel(id: string): BufferedMessage | null {
    const entry = this.queue.get(id);
    if (!entry) return null;
    clearTimeout(entry.timer);
    this.queue.delete(id);
    this.notify();
    return entry.item;
  }

  async commit(id: string): Promise<void> {
    const entry = this.queue.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.queue.delete(id);
    this.notify();
    try {
      await entry.onCommit();
    } catch (err) {
      console.error("[SendBuffer] commit failed:", err);
    }
  }

  flushAllSync() {
    this.queue.forEach((entry, id) => {
      clearTimeout(entry.timer);
      void entry.onCommit();
      this.queue.delete(id);
    });
    this.notify();
  }

  subscribe(listener: BufferListener): () => void {
    this.listeners.add(listener);
    listener(Array.from(this.queue.values()).map((v) => ({ ...v.item })));
    return () => this.listeners.delete(listener);
  }

  getPending(roomId?: string): BufferedMessage[] {
    const list = Array.from(this.queue.values()).map((v) => ({ ...v.item }));
    return roomId ? list.filter((m) => m.roomId === roomId) : list;
  }
}

export const sendBuffer = new SendBufferManager();
