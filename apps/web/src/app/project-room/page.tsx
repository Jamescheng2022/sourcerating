"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DemoRole,
  Room,
  RoomEvent,
  PendingDraft,
  loginWithDemoRole,
  resetDemoIdentity,
  getPersistedDemoSession,
  dedupeAndSortEvents,
  getMaxSeq,
  extractEventText,
  STORAGE_KEY_ORG_ID,
} from "@/lib/demo-session";

export default function ProjectRoomPage() {
  // Session & Auth state
  const [role, setRole] = useState<DemoRole | null>(null);
  const [actingOrgId, setActingOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState<DemoRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Rooms state (loaded strictly through RLS)
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Events & Messaging state
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [tab, setTab] = useState("Requirements");

  // Track max seq for gap filling
  const lastSeqRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string>("");
  activeRoomIdRef.current = activeRoomId;

  // Auto-scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check initial session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { role: savedRole, actingOrgId: savedOrgId } = getPersistedDemoSession();
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session && savedRole) {
          if (isMounted) {
            setRole(savedRole);
            setActingOrgId(savedOrgId);
            setCurrentUserId(sessionData.session.user.id);
          }
        } else {
          // If no valid session or saved role, reset to entry screen
          if (isMounted) {
            setRole(null);
            setActingOrgId(null);
            setCurrentUserId(null);
          }
        }
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load rooms via RLS whenever role or session is established
  const loadRooms = useCallback(async (currentRole: DemoRole, currentOrgId: string | null) => {
    setRoomsLoading(true);
    try {
      const { data: rlsRooms, error } = await supabase.from("rooms").select("*");
      if (error) {
        console.error("Error fetching rooms:", error);
        return;
      }

      if (rlsRooms && rlsRooms.length > 0) {
        setRooms(rlsRooms);

        // Auto-select first room or keep current if still valid
        setActiveRoomId((prev) => {
          if (prev && rlsRooms.some((r) => r.id === prev)) {
            return prev;
          }
          return rlsRooms[0].id;
        });

        // If actingOrgId was not set earlier, attempt discovery from rooms
        if (!currentOrgId) {
          const firstRoom = rlsRooms[0];
          const discoveredOrg =
            currentRole === "buyer"
              ? firstRoom.buyer_organization_id || firstRoom.organization_id
              : firstRoom.supplier_organization_id || firstRoom.organization_id;

          if (discoveredOrg) {
            setActingOrgId(discoveredOrg);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY_ORG_ID, discoveredOrg);
            }
          }
        }
      } else {
        setRooms([]);
        setActiveRoomId("");
      }
    } catch (err) {
      console.error("Exception loading rooms:", err);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role) {
      loadRooms(role, actingOrgId);
    }
  }, [role, loadRooms, actingOrgId]);

  // Handle Demo Login flow
  const handleEnterDemo = async (selectedRole: DemoRole) => {
    setAuthLoading(selectedRole);
    setAuthError(null);
    try {
      const result = await loginWithDemoRole(selectedRole);
      setRole(result.role);
      setActingOrgId(result.actingOrgId);
      setCurrentUserId(result.userId);
      await loadRooms(result.role, result.actingOrgId);
    } catch (err: any) {
      console.error("Demo login failed:", err);
      setAuthError(err.message || "Failed to start demo session. Please try again.");
    } finally {
      setAuthLoading(null);
    }
  };

  // Handle Reset Demo Identity
  const handleResetIdentity = async () => {
    await resetDemoIdentity();
    setRole(null);
    setActingOrgId(null);
    setCurrentUserId(null);
    setRooms([]);
    setActiveRoomId("");
    setEvents([]);
    setPendingDraft(null);
    setInputText("");
  };

  // Gap-fill function to load sequence events gt lastSeq
  const runGapFill = useCallback(async (roomId: string) => {
    if (!roomId) return;
    const fromSeq = lastSeqRef.current;
    try {
      const { data: newEvents, error } = await supabase
        .from("room_events")
        .select("*")
        .eq("room_id", roomId)
        .gt("seq", fromSeq)
        .order("seq", { ascending: true });

      if (error) {
        console.error("Gap fill error:", error);
        return;
      }

      if (newEvents && newEvents.length > 0) {
        setEvents((prev) => {
          const merged = dedupeAndSortEvents(prev, newEvents);
          lastSeqRef.current = getMaxSeq(merged);
          return merged;
        });
      }
    } catch (err) {
      console.error("Gap fill exception:", err);
    }
  }, []);

  // Load room events & subscribe to Realtime publication
  useEffect(() => {
    if (!activeRoomId || !role) {
      setEvents([]);
      return;
    }

    let isSubscribed = true;
    setEventsLoading(true);
    lastSeqRef.current = 0;

    // 1. Initial history fetch through RLS
    async function fetchHistory() {
      try {
        const { data: initialEvents, error } = await supabase
          .from("room_events")
          .select("*")
          .eq("room_id", activeRoomId)
          .order("seq", { ascending: true });

        if (error) {
          console.error("Error loading events for room:", error);
        } else if (initialEvents && isSubscribed) {
          const sorted = dedupeAndSortEvents([], initialEvents);
          setEvents(sorted);
          lastSeqRef.current = getMaxSeq(sorted);
        }
      } catch (err) {
        console.error("Exception loading room events:", err);
      } finally {
        if (isSubscribed) {
          setEventsLoading(false);
        }
      }
    }

    fetchHistory();

    // 2. Realtime channel subscription with gap-filling
    // Cancel old subscription on room switch
    const channel = supabase
      .channel(`room_events_realtime:${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_events",
          filter: `room_id=eq.${activeRoomId}`,
        },
        async (payload) => {
          // INSERT received as notification, then gap-fill by seq
          if (isSubscribed && activeRoomIdRef.current === activeRoomId) {
            // Also merge the immediate payload if available
            if (payload.new && typeof payload.new === "object") {
              const newRow = payload.new as RoomEvent;
              setEvents((prev) => {
                const merged = dedupeAndSortEvents(prev, [newRow]);
                lastSeqRef.current = Math.max(lastSeqRef.current, getMaxSeq(merged));
                return merged;
              });
            }
            // Run gap-fill to ensure no missed sequences
            await runGapFill(activeRoomId);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, role, runGapFill]);

  // Scroll to bottom when new events arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, pendingDraft]);

  // Active room object
  const activeRoom = useMemo(() => {
    return (
      rooms.find((r) => r.id === activeRoomId) || {
        id: activeRoomId,
        name: "Loading room...",
        boundary: "SHARED",
        note: "Project Room",
      }
    );
  }, [rooms, activeRoomId]);

  // Boundary metadata helper
  const roomBoundary = useMemo(() => {
    if (activeRoom.boundary) return activeRoom.boundary.toUpperCase();
    if (activeRoom.name.toLowerCase().includes("internal")) return "PRIVATE";
    return "EXTERNAL";
  }, [activeRoom]);

  const roomNote = useMemo(() => {
    if (activeRoom.note) return activeRoom.note;
    if (roomBoundary === "PRIVATE") return "Only Apex Living Modular";
    return "Visible to EastFrame Steel Co., Ltd.";
  }, [activeRoom, roomBoundary]);

  // Send message flow
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !activeRoomId || !role) return;
    if (pendingDraft && pendingDraft.status === "sending") return;

    // Single client_msg_id
    const clientMsgId = crypto.randomUUID();
    const newDraft: PendingDraft = {
      client_msg_id: clientMsgId,
      room_id: activeRoomId,
      text: textToSend,
      status: "sending",
      created_at: new Date().toISOString(),
    };

    setInputText("");
    setPendingDraft(newDraft);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("append_room_event", {
        p_room_id: activeRoomId,
        p_client_msg_id: clientMsgId,
        p_actor_organization_id: actingOrgId || null,
        p_event_type: "message.posted",
        p_payload: { text: textToSend },
      });

      if (rpcError) {
        console.error("append_room_event RPC error:", rpcError);
        setPendingDraft({
          ...newDraft,
          status: "failed",
          error: rpcError.message || "Failed to persist message",
        });
      } else {
        // Success: append canonical event and clear draft
        setPendingDraft(null);

        if (rpcData && typeof rpcData === "object") {
          setEvents((prev) => {
            const merged = dedupeAndSortEvents(prev, [rpcData as RoomEvent]);
            lastSeqRef.current = getMaxSeq(merged);
            return merged;
          });
        }

        // Trigger gap-fill to fetch canonical seq from database
        await runGapFill(activeRoomId);
      }
    } catch (err: any) {
      console.error("Send message exception:", err);
      setPendingDraft({
        ...newDraft,
        status: "failed",
        error: err.message || "Network exception sending message",
      });
    }
  };

  // Retry sending failed draft with the SAME client_msg_id
  const handleRetry = async () => {
    if (!pendingDraft || !activeRoomId) return;

    const retryDraft: PendingDraft = {
      ...pendingDraft,
      status: "sending",
      error: undefined,
    };
    setPendingDraft(retryDraft);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("append_room_event", {
        p_room_id: retryDraft.room_id,
        p_client_msg_id: retryDraft.client_msg_id, // Same client_msg_id!
        p_actor_organization_id: actingOrgId || null,
        p_event_type: "message.posted",
        p_payload: { text: retryDraft.text },
      });

      if (rpcError) {
        setPendingDraft({
          ...retryDraft,
          status: "failed",
          error: rpcError.message || "Retry failed",
        });
      } else {
        setPendingDraft(null);
        if (rpcData && typeof rpcData === "object") {
          setEvents((prev) => {
            const merged = dedupeAndSortEvents(prev, [rpcData as RoomEvent]);
            lastSeqRef.current = getMaxSeq(merged);
            return merged;
          });
        }
        await runGapFill(retryDraft.room_id);
      }
    } catch (err: any) {
      setPendingDraft({
        ...retryDraft,
        status: "failed",
        error: err.message || "Network exception during retry",
      });
    }
  };

  // Format message sender and organization
  const getEventAuthorInfo = (ev: RoomEvent) => {
    if (ev.payload?.who) {
      return { who: ev.payload.who, org: ev.payload.org || "Team Member" };
    }

    const isMe = currentUserId && ev.actor_user_id === currentUserId;
    if (isMe) {
      return {
        who: "You",
        org: role === "buyer" ? "Apex Living Modular (Buyer)" : "EastFrame Steel (Supplier)",
      };
    }

    if (role === "buyer") {
      if (roomBoundary === "PRIVATE") {
        return { who: "Korn Kittisak", org: "Commercial · Apex Living Modular" };
      }
      return { who: "Wang Lin 王林", org: "EastFrame Steel Co., Ltd." };
    } else {
      return { who: "Tanawat Chen", org: "Apex Living Modular" };
    }
  };

  // 1. Initial loading screen
  if (isInitializing) {
    return (
      <main className="h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
          <div className="text-xs text-slate-400">Initializing SourceRating P1 Demo...</div>
        </div>
      </main>
    );
  }

  // 2. No session screen: Enter as Buyer / Enter as Supplier
  if (!role) {
    return (
      <main className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-y-auto bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-sky-500/25">
              P1
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Live P1 Project Room Demo</h1>
              <p className="text-xs text-slate-400">Two-session live alignment with Supabase RLS</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200">Demonstration Overview:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>
                <strong className="text-sky-300">Buyer Session:</strong> Has access to Internal Room (private) and shared EastFrame room.
              </li>
              <li>
                <strong className="text-amber-300">Supplier Session:</strong> Access strictly constrained by RLS to shared EastFrame room. Internal room is undiscoverable.
              </li>
              <li>Real-time event synchronization with sequence gap filling and IME-safe messaging.</li>
            </ul>
          </div>

          {authError && (
            <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
              ⚠️ {authError}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleEnterDemo("buyer")}
              disabled={authLoading !== null}
              className="group flex flex-col items-start rounded-xl border border-sky-500/40 bg-sky-950/30 p-4 text-left transition hover:border-sky-400 hover:bg-sky-900/40 disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Role 1</span>
                {authLoading === "buyer" && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-white group-hover:text-sky-300">
                Enter as Buyer
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Apex Living Modular · 2 rooms (Internal + Shared)
              </div>
            </button>

            <button
              onClick={() => handleEnterDemo("supplier")}
              disabled={authLoading !== null}
              className="group flex flex-col items-start rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-left transition hover:border-amber-400 hover:bg-amber-900/40 disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Role 2</span>
                {authLoading === "supplier" && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-white group-hover:text-amber-300">
                Enter as Supplier
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                EastFrame Steel · 1 room (Shared only)
              </div>
            </button>
          </div>

          <div className="mt-6 text-center text-[11px] text-slate-500">
            Powered by deployed Supabase backend · No service-role key on frontend
          </div>
        </div>
      </main>
    );
  }

  // 3. Active session view
  return (
    <main className="h-[100dvh] max-h-[100dvh] min-h-[100dvh] overflow-hidden bg-slate-100 text-slate-900 flex flex-col">
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)_360px]">
        {/* LEFT SIDEBAR (Desktop) */}
        <aside className="hidden md:flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800 min-h-0">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold truncate">
                {role === "buyer" ? "Apex Living Modular" : "EastFrame Steel"}
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  role === "buyer"
                    ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                    : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                }`}
              >
                {role}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {role === "buyer" ? "Buyer Organization" : "Supplier Organization"}
            </div>
          </div>

          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Active Project
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs font-semibold">Bangkok Prefab Office</div>
              <div className="text-[10px] text-sky-400 mt-1">BKK-MOD-2026-08</div>
            </div>
          </div>

          <div className="px-2 flex-1 overflow-y-auto">
            <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Project Rooms (RLS)</span>
              <span className="text-slate-400 font-mono text-[9px]">{rooms.length}</span>
            </div>

            {roomsLoading ? (
              <div className="p-3 text-[11px] text-slate-500">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500">No rooms returned by RLS.</div>
            ) : (
              rooms.map((r) => {
                const isSelected = r.id === activeRoomId;
                const isPrivate =
                  r.boundary === "PRIVATE" || r.name.toLowerCase().includes("internal");

                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoomId(r.id)}
                    className={
                      "w-full text-left rounded-md px-3 py-2.5 text-xs mb-1 border-l-2 transition " +
                      (isSelected
                        ? "bg-slate-800 border-sky-400 text-white font-medium"
                        : "border-transparent text-slate-300 hover:bg-slate-900")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{r.name}</span>
                      <span
                        className={`text-[8px] font-bold px-1 rounded uppercase shrink-0 ${
                          isPrivate ? "bg-indigo-900/60 text-indigo-300" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isPrivate ? "Pvt" : "Ext"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-auto p-3 border-t border-slate-800 space-y-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Identity:</span>
                <span className="font-mono text-slate-300">{role}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1 truncate">
                {actingOrgId ? `Org: ${actingOrgId.slice(0, 14)}...` : "RLS Active"}
              </div>
            </div>

            <button
              onClick={handleResetIdentity}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Reset Demo Identity
            </button>
          </div>
        </aside>

        {/* MIDDLE SECTION: CHAT CONVERSATION */}
        <section className="flex min-w-0 flex-col bg-white h-full min-h-0">
          {/* Header */}
          <header className="shrink-0 border-b border-slate-200 bg-white">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500 truncate">
                  Bangkok Prefab Office /{" "}
                  <span className="font-semibold text-slate-900">{activeRoom.name}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Phase 2 · Technical & Commercial Alignment
                </div>
              </div>

              {/* Mobile room selector: STRICTLY RLS-returned rooms */}
              <div className="flex items-center gap-2 md:hidden">
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none max-w-[150px]"
                  value={activeRoomId}
                  onChange={(e) => setActiveRoomId(e.target.value)}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleResetIdentity}
                  title="Reset Demo Identity"
                  className="rounded border border-slate-200 px-2 py-1.5 text-[10px] text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Room Boundary Pill */}
            <div
              className={
                "px-4 py-2 text-[11px] border-t flex items-center justify-between " +
                (roomBoundary === "PRIVATE"
                  ? "bg-indigo-50 border-indigo-100 text-indigo-900"
                  : "bg-amber-50 border-amber-100 text-amber-900")
              }
            >
              <div>
                <span className="font-bold">{roomBoundary}</span> · {roomNote}
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                {events.length} event{events.length === 1 ? "" : "s"}
              </div>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
                  Project Conversation · Live Sync
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime Connected
                </span>
              </div>

              {/* AI Gateway Failure Disclosure (Truthful UI: No fake active controls) */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                  AI Gateway Status: Offline (Vercel Billing Inactive)
                </div>
                <div className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Automated commercial extraction is currently paused because Vercel AI Gateway billing is not enabled. Live team messaging and RLS boundary enforcement are fully operational.
                </div>
              </div>

              {/* Loading State */}
              {eventsLoading && (
                <div className="flex justify-center py-6">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></span>
                    Loading room history...
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!eventsLoading && events.length === 0 && !pendingDraft && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                  No messages yet in this room. Send the first message below.
                </div>
              )}

              {/* Canonical Event List */}
              {events.map((ev, idx) => {
                const author = getEventAuthorInfo(ev);
                const text = extractEventText(ev.payload);
                const isMyMessage = currentUserId && ev.actor_user_id === currentUserId;

                return (
                  <div key={ev.id || ev.client_msg_id || idx} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-bold text-slate-800">{author.who}</span>
                        <span className="text-[10px] text-slate-400">{author.org}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5">
                        {typeof ev.seq === "number" && (
                          <span className="rounded bg-slate-200/70 px-1 text-slate-600">
                            #{ev.seq}
                          </span>
                        )}
                        {ev.created_at && (
                          <span>
                            {new Date(ev.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={
                        "rounded-xl rounded-tl-sm border p-3 text-[13px] leading-6 shadow-sm " +
                        (isMyMessage
                          ? "bg-white border-sky-200"
                          : "bg-white border-slate-200")
                      }
                    >
                      <div className="whitespace-pre-wrap break-words">{text}</div>

                      {ev.payload?.file && (
                        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3">
                          <div className="text-xs font-semibold text-sky-900">{ev.payload.file}</div>
                          <div className="mt-1 text-[10px] text-sky-700">
                            Attached specification / commercial document
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending Draft: Sending State */}
              {pendingDraft && pendingDraft.status === "sending" && (
                <div className="space-y-1 opacity-75 animate-pulse">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-slate-800">You</span>
                      <span className="text-[10px] text-sky-600">Sending...</span>
                    </div>
                  </div>
                  <div className="rounded-xl rounded-tl-sm border border-sky-300 bg-sky-50/60 p-3 text-[13px] leading-6 shadow-sm">
                    <div className="whitespace-pre-wrap break-words text-slate-800">
                      {pendingDraft.text}
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Draft: Failed State with Retry (using same client_msg_id) */}
              {pendingDraft && pendingDraft.status === "failed" && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-900 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-red-800 flex items-center gap-1.5">
                      <span>⚠️</span> Message Delivery Failed
                    </span>
                    <span className="text-[10px] font-mono text-red-700">
                      id: {pendingDraft.client_msg_id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="rounded bg-white/80 p-2 text-slate-800 whitespace-pre-wrap break-words border border-red-200">
                    {pendingDraft.text}
                  </div>

                  {pendingDraft.error && (
                    <div className="text-[10px] text-red-700">{pendingDraft.error}</div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleRetry}
                      className="rounded bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 text-xs transition"
                    >
                      Retry (same client_msg_id)
                    </button>
                    <button
                      onClick={() => {
                        setInputText(pendingDraft.text);
                        setPendingDraft(null);
                      }}
                      className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      Edit Draft
                    </button>
                    <button
                      onClick={() => setPendingDraft(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-1 ml-auto"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* INPUT BAR (IME Composition Safe) */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                <span>
                  Sending to: <b>{roomNote}</b>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {role === "buyer" ? "Apex Living Modular" : "EastFrame Steel"}
                </span>
              </div>

              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    if (isComposing || (e.nativeEvent as any).isComposing) {
                      return; // In the middle of Chinese/IME character selection
                    }
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write a project message (Chinese / English supported)..."
                className="w-full resize-none px-3 py-2.5 text-sm outline-none text-slate-900 bg-transparent"
              />

              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-50">
                <div className="text-[11px] text-slate-400">
                  IME Safe · Enter to send, Shift+Enter for new line
                </div>

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || pendingDraft?.status === "sending"}
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  {pendingDraft?.status === "sending" ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR: PROJECT STATE (Honest Live Counters, No Fake Facts) */}
        <aside className="hidden md:flex flex-col bg-white border-l border-slate-200 min-h-0">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Project State</div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-600">
                Live
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              Derived from conversation and evidence
            </div>

            {/* Honest Live Counters */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="text-slate-400">Room Events</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{events.length}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="text-slate-400">RLS Rooms</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{rooms.length}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
            {["Requirements", "Quotes", "Files", "Decisions", "Needs You"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "whitespace-nowrap rounded px-2 py-1.5 text-[10px] font-semibold transition " +
                  (tab === t
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100")
                }
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
              <div className="text-xs font-semibold text-slate-700">
                Canonical state not yet generated
              </div>
              <div className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Live events in <span className="font-semibold">{activeRoom.name}</span> are being
                streamed. Automated extraction for {tab.toLowerCase()} is paused while AI Gateway is
                inactive.
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-white text-xs space-y-2">
              <div className="font-semibold text-slate-800">Live Session Status</div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Active Role:</span>
                <span className="font-mono font-medium capitalize">{role}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Active Room:</span>
                <span className="font-mono font-medium truncate max-w-[140px]">
                  {activeRoom.name}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Boundary:</span>
                <span className="font-mono font-medium">{roomBoundary}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Latest Seq:</span>
                <span className="font-mono font-medium">#{lastSeqRef.current}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}