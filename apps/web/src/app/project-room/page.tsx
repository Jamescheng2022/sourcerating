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
import { analyzeRoomEvent } from "@/lib/staging";
import {
  createRoomFileSignedUrl,
  formatFileSize,
  uploadRoomAttachment,
} from "@/lib/room-files";

export default function ProjectRoomPage() {
  // Session & Auth state
  const [role, setRole] = useState<DemoRole | null>(null);
  const [actingOrgId, setActingOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState<DemoRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Viewport height tracking for mobile/Android virtual keyboard
  const [viewportHeight, setViewportHeight] = useState<string>("100dvh");

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
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileVerification, setFileVerification] = useState<
    Record<
      string,
      {
        status: "pending" | "verified" | "rejected";
        serverSha256?: string | null;
        detectedMimeType?: string | null;
        rejectionReason?: string | null;
      }
    >
  >({});

  // Track max seq for gap filling
  const lastSeqRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string>("");
  const analyzedEventIdsRef = useRef<Set<string>>(new Set());
  activeRoomIdRef.current = activeRoomId;

  // Auto-scroll and container anchors
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadAbortRef = useRef<AbortController | null>(null);

  // Android keyboard & visualViewport safety
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      } else {
        setViewportHeight("100dvh");
      }
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
      return () => {
        window.visualViewport?.removeEventListener("resize", updateHeight);
        window.visualViewport?.removeEventListener("scroll", updateHeight);
      };
    }
  }, []);

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
        // Enforce supplier restriction: Supplier MUST NEVER discover or see Buyer Internal room
        const filteredRooms =
          currentRole === "supplier"
            ? rlsRooms.filter((r) => {
                const b = (r.boundary || "").toUpperCase();
                const name = (r.name || "").toLowerCase();
                return b !== "PRIVATE" && b !== "INTERNAL" && !name.includes("internal");
              })
            : rlsRooms;

        setRooms(filteredRooms);

        setActiveRoomId((prev) => {
          if (prev && filteredRooms.some((r) => r.id === prev)) {
            return prev;
          }
          return filteredRooms[0]?.id || "";
        });

        if (!currentOrgId && filteredRooms.length > 0) {
          const firstRoom = filteredRooms[0];
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
    setAiStatus(null);
    analyzedEventIdsRef.current.clear();
    setInputText("");
  };

  // Strictly constrain visible rooms: Supplier NEVER sees Buyer Internal
  const visibleRooms = useMemo(() => {
    if (role === "supplier") {
      return rooms.filter((r) => {
        const b = (r.boundary || "").toUpperCase();
        const n = (r.name || "").toLowerCase();
        return b !== "PRIVATE" && b !== "INTERNAL" && !n.includes("internal");
      });
    }
    return rooms;
  }, [rooms, role]);

  // Active room fallback
  const activeRoom = useMemo(() => {
    return (
      visibleRooms.find((r) => r.id === activeRoomId) ||
      visibleRooms[0] || {
        id: activeRoomId,
        name: role === "supplier" ? "EastFrame Supplier Room" : "Project Room",
        boundary: role === "supplier" ? "SHARED" : "PRIVATE",
        note: role === "supplier" ? "Shared Room" : "Internal Room",
      }
    );
  }, [visibleRooms, activeRoomId, role]);

  // Auto-switch away if supplier somehow lands on an internal room
  useEffect(() => {
    if (visibleRooms.length > 0 && !visibleRooms.some((r) => r.id === activeRoomId)) {
      setActiveRoomId(visibleRooms[0].id);
    }
  }, [visibleRooms, activeRoomId]);

  // Boundary recognition helper: Internal (Confidential) vs Shared (Supplier)
  const isInternal = useMemo(() => {
    if (role === "supplier") return false;
    const b = (activeRoom.boundary || "").toUpperCase();
    const n = (activeRoom.name || "").toLowerCase();
    return b === "PRIVATE" || b === "INTERNAL" || n.includes("internal");
  }, [activeRoom, role]);

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

  const refreshFileVerification = useCallback(async (sourceEvents: RoomEvent[]) => {
    const fileVersionIds = Array.from(
      new Set(
        sourceEvents
          .filter(
            (event) =>
              event.event_type === "file.attached" &&
              typeof event.payload?.file_version_id === "string",
          )
          .map((event) => event.payload.file_version_id as string),
      ),
    );

    if (fileVersionIds.length === 0) {
      setFileVerification({});
      return;
    }

    const { data, error } = await supabase
      .from("room_file_versions")
      .select(
        "id,verification_status,server_sha256,detected_mime_type,rejection_reason",
      )
      .in("id", fileVersionIds);

    if (error) {
      console.error("File verification status query failed:", error);
      return;
    }

    const next: Record<
      string,
      {
        status: "pending" | "verified" | "rejected";
        serverSha256?: string | null;
        detectedMimeType?: string | null;
        rejectionReason?: string | null;
      }
    > = {};

    for (const row of data || []) {
      next[row.id] = {
        status:
          row.verification_status === "verified" ||
          row.verification_status === "rejected"
            ? row.verification_status
            : "pending",
        serverSha256: row.server_sha256,
        detectedMimeType: row.detected_mime_type,
        rejectionReason: row.rejection_reason,
      };
    }

    setFileVerification(next);
  }, []);

  useEffect(() => {
    void refreshFileVerification(events);
  }, [events, refreshFileVerification]);

  useEffect(() => {
    const hasPending = Object.values(fileVerification).some(
      (item) => item.status === "pending",
    );
    if (!hasPending || events.length === 0) return;

    const timer = window.setTimeout(() => {
      void refreshFileVerification(events);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [events, fileVerification, refreshFileVerification]);

  const maybeAnalyzeEvent = useCallback(
    async (event: RoomEvent) => {
      if (
        !actingOrgId ||
        !event.id ||
        !event.room_id ||
        event.event_type !== "message.posted"
      ) {
        return;
      }

      const analysisKey = actingOrgId + ":" + event.id;
      if (analyzedEventIdsRef.current.has(analysisKey)) return;
      analyzedEventIdsRef.current.add(analysisKey);

      try {
        const result = await analyzeRoomEvent(event.room_id, event.id, actingOrgId);
        if (!result?.ok) {
          setAiStatus("AI assistant is temporarily unavailable; live project messaging continues normally.");
          return;
        }
        setAiStatus(
          result.deepProvider
            ? `AI assistant active via ${result.deepProvider}; live project messaging continues normally.`
            : "AI assistant is temporarily unavailable; live project messaging continues normally."
        );
      } catch (error) {
        setAiStatus("AI assistant is temporarily unavailable; live project messaging continues normally.");
      }
    },
    [actingOrgId]
  );

  // Load room events & subscribe to Realtime publication
  useEffect(() => {
    if (!activeRoomId || !role) {
      setEvents([]);
      return;
    }

    let isSubscribed = true;
    setEventsLoading(true);
    lastSeqRef.current = 0;

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
          if (isSubscribed && activeRoomIdRef.current === activeRoomId) {
            if (payload.new && typeof payload.new === "object") {
              const newRow = payload.new as RoomEvent;
              setEvents((prev) => {
                const merged = dedupeAndSortEvents(prev, [newRow]);
                lastSeqRef.current = Math.max(lastSeqRef.current, getMaxSeq(merged));
                return merged;
              });
              void maybeAnalyzeEvent(newRow);
            }
            await runGapFill(activeRoomId);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, role, runGapFill, maybeAnalyzeEvent]);

  // Scroll tracking: Only scroll if user is near the bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= 80;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottomBtn(!nearBottom && distance > 180);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
  }, []);

  // Auto-scroll when new events arrive ONLY if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [events, pendingDraft, scrollToBottom]);

  // Send message flow
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !activeRoomId || !role) return;
    if (pendingDraft && pendingDraft.status === "sending") return;

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

    // When the user explicitly sends, force scroll to bottom
    isNearBottomRef.current = true;
    scrollToBottom("smooth");

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
        setPendingDraft(null);

        if (rpcData && typeof rpcData === "object") {
          const canonicalEvent = rpcData as RoomEvent;
          setEvents((prev) => {
            const merged = dedupeAndSortEvents(prev, [canonicalEvent]);
            lastSeqRef.current = getMaxSeq(merged);
            return merged;
          });
          void maybeAnalyzeEvent(canonicalEvent);
        }

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
        p_client_msg_id: retryDraft.client_msg_id,
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
          const canonicalEvent = rpcData as RoomEvent;
          setEvents((prev) => {
            const merged = dedupeAndSortEvents(prev, [canonicalEvent]);
            lastSeqRef.current = getMaxSeq(merged);
            return merged;
          });
          void maybeAnalyzeEvent(canonicalEvent);
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

  const handleFileSelected = async (file: File | null) => {
    if (!file || !activeRoomId || !actingOrgId) return;

    const caption = inputText.trim();
    const controller = new AbortController();
    fileUploadAbortRef.current = controller;
    setFileUploading(true);
    setFileUploadProgress(0);
    setFileError(null);
    isNearBottomRef.current = true;
    scrollToBottom("smooth");

    try {
      const result = await uploadRoomAttachment({
        roomId: activeRoomId,
        actingOrganizationId: actingOrgId,
        file,
        caption,
        signal: controller.signal,
        onProgress: setFileUploadProgress,
      });

      setEvents((prev) => {
        const merged = dedupeAndSortEvents(prev, [result.event]);
        lastSeqRef.current = getMaxSeq(merged);
        return merged;
      });

      if (caption && inputText.trim() === caption) {
        setInputText("");
      }
      await runGapFill(activeRoomId);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setFileError("Upload cancelled.");
      } else {
        const message =
          error instanceof Error ? error.message : "Attachment upload failed.";
        setFileError(message);
      }
    } finally {
      setFileUploading(false);
      setFileUploadProgress(0);
      fileUploadAbortRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenFile = async (objectPath: string, fileName?: string) => {
    try {
      setFileError(null);
      const signedUrl = await createRoomFileSignedUrl(objectPath, fileName, 120);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open file.";
      setFileError(message);
    }
  };

  const handleCancelFileUpload = () => {
    fileUploadAbortRef.current?.abort();
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
        org: role === "buyer" ? "Apex Living Modular" : "EastFrame Steel",
      };
    }

    if (role === "buyer") {
      if (isInternal) {
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

  // 2. Demo role selection screen
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
              <p className="text-xs text-slate-400">Two-session live alignment · Supabase RLS</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200">Demonstration Scope:</div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px]">
              <li>
                <strong className="text-sky-300">Buyer · 买方 · ผู้ซื้อ:</strong> Apex Living Modular. Has access to confidential Internal Room & shared EastFrame room.
              </li>
              <li>
                <strong className="text-amber-300">Supplier · 供应商 · ซัพพลายเออร์:</strong> EastFrame Steel. Access strictly constrained by RLS to shared room only. Internal room is never visible.
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
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Buyer · 买方</span>
                {authLoading === "buyer" && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-white group-hover:text-sky-300">
                Enter as Buyer
              </div>
              <div className="mt-0.5 text-[11px] text-sky-300/80">
                สำหรับผู้ซื้อ
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
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Supplier · 供应商</span>
                {authLoading === "supplier" && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-white group-hover:text-amber-300">
                Enter as Supplier
              </div>
              <div className="mt-0.5 text-[11px] text-amber-300/80">
                สำหรับซัพพลายเออร์
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
    <main
      style={{ height: viewportHeight, minHeight: viewportHeight, maxHeight: viewportHeight }}
      className="overflow-hidden bg-slate-100 text-slate-900 flex flex-col w-full"
    >
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)_340px]">
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
                {role === "buyer" ? "Buyer · 买方" : "Supplier · 供应商"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {role === "buyer" ? "Bangkok, Thailand" : "Zhejiang, China"}
            </div>
          </div>

          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold">
              Active Project
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs font-semibold text-white">Bangkok Prefab Office</div>
              <div className="text-[10px] text-sky-400 mt-0.5 font-mono">BKK-MOD-2026-08</div>
            </div>
          </div>

          <div className="px-2 flex-1 overflow-y-auto">
            <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between font-semibold">
              <span>Project Rooms</span>
              <span className="text-slate-400 font-mono text-[9px]">{visibleRooms.length}</span>
            </div>

            {roomsLoading ? (
              <div className="p-3 text-[11px] text-slate-500">Loading rooms...</div>
            ) : visibleRooms.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500">No rooms authorized.</div>
            ) : (
              visibleRooms.map((r) => {
                const isSelected = r.id === activeRoom.id;
                const rIsInternal =
                  (r.boundary || "").toUpperCase() === "PRIVATE" ||
                  (r.boundary || "").toUpperCase() === "INTERNAL" ||
                  (r.name || "").toLowerCase().includes("internal");

                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoomId(r.id)}
                    className={
                      "w-full text-left rounded-lg px-3 py-2.5 text-xs mb-1.5 border transition " +
                      (isSelected
                        ? rIsInternal
                          ? "bg-indigo-950/80 border-indigo-500 text-white font-medium shadow-sm"
                          : "bg-slate-800 border-sky-400 text-white font-medium shadow-sm"
                        : "border-transparent text-slate-300 hover:bg-slate-900 hover:text-white")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{rIsInternal ? "🔒" : "🌐"}</span>
                        <span className="truncate">{r.name}</span>
                      </div>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          rIsInternal
                            ? "bg-indigo-900/80 text-indigo-300 border border-indigo-700/50"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {rIsInternal ? "Confidential" : "Shared"}
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
                <span className="font-mono text-slate-300 capitalize">{role}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1 truncate">
                {actingOrgId ? `Org: ${actingOrgId.slice(0, 14)}...` : "RLS Active"}
              </div>
            </div>

            <button
              onClick={handleResetIdentity}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Switch Role · 切换身份
            </button>
          </div>
        </aside>

        {/* MIDDLE SECTION: CHAT CONVERSATION (Mobile First IM Feel) */}
        <section className="flex min-w-0 flex-col bg-white h-full min-h-0 relative">
          {/* Header Chrome: Reduced vertical height */}
          <header className="shrink-0 border-b border-slate-200 bg-white">
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2">
              {/* Room selector / title */}
              <div className="flex items-center gap-2 min-w-0">
                {role === "buyer" && visibleRooms.length > 1 ? (
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                    {visibleRooms.map((r) => {
                      const rIsInternal =
                        (r.boundary || "").toUpperCase() === "PRIVATE" ||
                        (r.boundary || "").toUpperCase() === "INTERNAL" ||
                        (r.name || "").toLowerCase().includes("internal");
                      const isSelected = r.id === activeRoom.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setActiveRoomId(r.id)}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
                            isSelected
                              ? rIsInternal
                                ? "bg-indigo-900 text-white shadow-sm"
                                : "bg-slate-900 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>{rIsInternal ? "🔒" : "🌐"}</span>
                          <span className="truncate max-w-[110px] sm:max-w-none">
                            {rIsInternal ? "Internal · 内部" : "Shared · 外部"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">{isInternal ? "🔒" : "🌐"}</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {activeRoom.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Right controls: Role Badge & Reset Identity */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    role === "buyer"
                      ? "bg-sky-100 text-sky-800 border border-sky-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  {role === "buyer" ? "Buyer · 买方" : "Supplier · 供应商"}
                </span>

                <button
                  onClick={handleResetIdentity}
                  title="Switch Role / Reset Session"
                  className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  Switch · 切换
                </button>
              </div>
            </div>

            {/* Persistent Room Boundary Notice Bar */}
            <div
              className={`px-3 py-1.5 text-[11px] border-t flex items-center justify-between gap-2 transition-colors ${
                isInternal
                  ? "bg-indigo-950 text-indigo-100 border-indigo-900 shadow-inner"
                  : "bg-amber-50 text-amber-950 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 font-medium truncate">
                {isInternal ? (
                  <>
                    <span className="shrink-0 font-bold bg-indigo-800 text-indigo-200 px-1 py-0.5 rounded text-[9px]">
                      🔒 CONFIDENTIAL
                    </span>
                    <span className="truncate text-[10px] sm:text-[11px]">
                      Buyer Internal · 仅买方可见 · เฉพาะทีมภายใน (EastFrame cannot see)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="shrink-0 font-bold bg-amber-200 text-amber-900 px-1 py-0.5 rounded text-[9px]">
                      ⚠️ SHARED ROOM
                    </span>
                    <span className="truncate text-[10px] sm:text-[11px]">
                      Visible to EastFrame Steel (Supplier) · 供应商可见 · ซัพพลายเออร์มองเห็นได้
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] opacity-80 font-mono shrink-0">
                {events.length} msgs
              </div>
            </div>
          </header>

          {/* Messages Stream */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3 sm:px-5"
          >
            <div className="mx-auto max-w-3xl space-y-3">
              {/* Header Status & Sync Status */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold">
                  Live Sync · {isInternal ? "Internal Alignment" : "Cross-Border Messaging"}
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime Connected
                </span>
              </div>

              {/* Honest Neutral Degraded State Notice (No Vercel mention, calm & reassuring) */}
              <div className="rounded-xl border border-slate-200 bg-white/90 p-2.5 sm:p-3 text-xs text-slate-600 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400 shrink-0"></span>
                  <span className="text-[11px] text-slate-600 truncate">
                    {aiStatus || "AI assistant is temporarily unavailable; live project messaging continues normally."}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  Live Chat Active
                </span>
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
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">No messages yet in this room</div>
                  <div className="text-[11px] text-slate-400">
                    {isInternal
                      ? "Send a confidential internal note to begin."
                      : "Send an alignment message to EastFrame Steel."}
                  </div>
                </div>
              )}

              {/* Canonical Event List */}
              {events.map((ev, idx) => {
                const author = getEventAuthorInfo(ev);
                const text = extractEventText(ev.payload);
                const isFileEvent =
                  ev.event_type === "file.attached" &&
                  typeof ev.payload?.object_path === "string";
                const latestFileVersion = isFileEvent
                  ? events.reduce((latest, candidate) => {
                      if (
                        candidate.event_type === "file.attached" &&
                        candidate.actor_organization_id === ev.actor_organization_id &&
                        candidate.payload?.logical_name === ev.payload?.logical_name
                      ) {
                        return Math.max(
                          latest,
                          Number(candidate.payload?.version_no || 0),
                        );
                      }
                      return latest;
                    }, 0)
                  : 0;
                const isSuperseded =
                  isFileEvent &&
                  Number(ev.payload?.version_no || 0) < latestFileVersion;
                const verification = isFileEvent
                  ? fileVerification[String(ev.payload?.file_version_id || "")]
                  : undefined;
                const verificationStatus =
                  verification?.status || (isFileEvent ? "pending" : undefined);
                const isMyMessage = currentUserId && ev.actor_user_id === currentUserId;
                const timeStr = ev.created_at
                  ? new Date(ev.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={ev.id || ev.client_msg_id || idx}
                    id={ev.id ? `event-${ev.id}` : undefined}
                    className={`flex flex-col ${isMyMessage ? "items-end" : "items-start"} space-y-1`}
                  >
                    {/* Sender Info Header */}
                    <div
                      className={`flex items-baseline gap-1.5 text-[10px] ${
                        isMyMessage ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <span className="font-bold text-slate-800">
                        {isMyMessage ? "You · 你" : author.who}
                      </span>
                      <span className="text-slate-400">
                        {isMyMessage
                          ? role === "buyer"
                            ? "Apex Living"
                            : "EastFrame"
                          : author.org}
                      </span>
                      {typeof ev.seq === "number" && (
                        <span className="rounded bg-slate-200/60 px-1 py-0.2 font-mono text-[9px] text-slate-500">
                          #{ev.seq}
                        </span>
                      )}
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 text-[13px] leading-relaxed shadow-xs ${
                        isMyMessage
                          ? "rounded-br-xs bg-sky-600 text-white border border-sky-600"
                          : isInternal
                          ? "rounded-bl-xs bg-white text-slate-900 border border-indigo-100 shadow-slate-100"
                          : "rounded-bl-xs bg-white text-slate-900 border border-slate-200"
                      }`}
                    >
                      {!isFileEvent && (
                        <div className="whitespace-pre-wrap break-words">{text}</div>
                      )}

                      {isFileEvent && (
                        <button
                          type="button"
                          disabled={verificationStatus !== "verified"}
                          onClick={() =>
                            void handleOpenFile(
                              ev.payload.object_path,
                              ev.payload.file_name,
                            )
                          }
                          className={`block w-full rounded-xl p-3 text-left text-xs transition ${
                            isMyMessage
                              ? "bg-sky-700/60 border border-sky-400 text-white hover:bg-sky-700"
                              : "bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100"
                          } ${isSuperseded ? "opacity-55" : ""} ${
                            verificationStatus !== "verified"
                              ? "cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {ev.payload.caption && (
                            <div className="mb-2 whitespace-pre-wrap break-words text-[12px]">
                              {ev.payload.caption}
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold uppercase">
                              {String(ev.payload.mime_type || "").includes("pdf")
                                ? "PDF"
                                : String(ev.payload.mime_type || "").includes("sheet") ||
                                    String(ev.payload.mime_type || "").includes("excel")
                                  ? "XLS"
                                  : "FILE"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 truncate font-semibold">
                                  {ev.payload.file_name || "Project document"}
                                </div>
                                {verificationStatus === "verified" && (
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      isMyMessage
                                        ? "bg-emerald-300/20 text-emerald-50"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    Verified
                                  </span>
                                )}
                                {verificationStatus === "pending" && (
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      isMyMessage
                                        ? "bg-white/15 text-white"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    Verifying
                                  </span>
                                )}
                                {verificationStatus === "rejected" && (
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      isMyMessage
                                        ? "bg-rose-300/20 text-rose-50"
                                        : "bg-rose-100 text-rose-700"
                                    }`}
                                  >
                                    Rejected
                                  </span>
                                )}
                                {isSuperseded && (
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      isMyMessage
                                        ? "bg-white/15 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    Superseded
                                  </span>
                                )}
                              </div>
                              <div
                                className={`mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] ${
                                  isMyMessage ? "text-sky-100" : "text-slate-500"
                                }`}
                              >
                                <span>v{ev.payload.version_no || 1}</span>
                                <span>{formatFileSize(ev.payload.size_bytes)}</span>
                                <span>{ev.payload.mime_type || "file"}</span>
                                {ev.payload.supersedes_version_id && (
                                  <span>supersedes prior version</span>
                                )}
                              </div>
                              <div
                                className={`mt-1 truncate font-mono text-[9px] ${
                                  isMyMessage ? "text-sky-200" : "text-slate-400"
                                }`}
                              >
                                SHA256{" "}
                                {String(
                                  verification?.serverSha256 ||
                                    ev.payload.sha256 ||
                                    "",
                                ).slice(0, 16)}
                                ...
                              </div>
                              <div
                                className={`mt-1 text-[10px] font-semibold ${
                                  isMyMessage ? "text-white" : "text-sky-700"
                                }`}
                              >
                                {verificationStatus === "verified"
                                  ? "Open / Download · 打开文件"
                                  : verificationStatus === "rejected"
                                    ? verification?.rejectionReason ||
                                      "File verification failed"
                                    : "Server verification in progress"}
                              </div>
                            </div>
                          </div>
                        </button>
                      )}

                      {!isFileEvent && ev.payload?.file && (
                        <div
                          className={`mt-2 rounded-lg p-2.5 text-xs ${
                            isMyMessage
                              ? "bg-sky-700/60 border border-sky-500 text-white"
                              : "bg-slate-50 border border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="font-semibold flex items-center gap-1">
                            <span>📎</span>
                            <span>{ev.payload.file}</span>
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] ${
                              isMyMessage ? "text-sky-200" : "text-slate-500"
                            }`}
                          >
                            Project document
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status & Timestamp */}
                    <div
                      className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-mono ${
                        isMyMessage ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {timeStr && <span>{timeStr}</span>}
                      {isMyMessage && (
                        <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                          <span>✓</span>
                          <span>Sent · 已发送</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending Draft: Sending State (Subtle IM Feel) */}
              {pendingDraft && pendingDraft.status === "sending" && (
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-baseline gap-1.5 text-[10px] flex-row-reverse">
                    <span className="font-bold text-slate-800">You · 你</span>
                    <span className="text-slate-400">
                      {role === "buyer" ? "Apex Living" : "EastFrame"}
                    </span>
                  </div>

                  <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-br-xs p-3 text-[13px] leading-relaxed shadow-xs bg-sky-500/80 text-white border border-sky-400 opacity-90 animate-pulse">
                    <div className="whitespace-pre-wrap break-words">{pendingDraft.text}</div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-sky-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping"></span>
                    <span>Sending... · 发送中</span>
                  </div>
                </div>
              )}

              {/* Pending Draft: Failed State with Subtle Retry (using identical client_msg_id) */}
              {pendingDraft && pendingDraft.status === "failed" && (
                <div className="flex flex-col items-end space-y-1.5">
                  <div className="flex items-baseline gap-1.5 text-[10px] flex-row-reverse">
                    <span className="font-bold text-slate-800">You · 你</span>
                    <span className="text-rose-600 font-medium">⚠️ Delivery failed · 发送失败</span>
                  </div>

                  <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-br-xs p-3 text-[13px] leading-relaxed shadow-xs bg-rose-50 border border-rose-200 text-slate-900">
                    <div className="whitespace-pre-wrap break-words">{pendingDraft.text}</div>
                    {pendingDraft.error && (
                      <div className="mt-1 text-[10px] text-rose-600">{pendingDraft.error}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleRetry}
                      className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition"
                    >
                      Retry · 重试
                    </button>
                    <button
                      onClick={() => {
                        setInputText(pendingDraft.text);
                        setPendingDraft(null);
                      }}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Edit · 编辑
                    </button>
                    <button
                      onClick={() => setPendingDraft(null)}
                      className="rounded px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                    >
                      Discard · 放弃
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating Jump to Latest Button (shown when user scrolled up) */}
          {showScrollBottomBtn && (
            <button
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-24 right-4 z-10 rounded-full bg-slate-900/90 text-white px-3 py-1.5 text-xs shadow-lg backdrop-blur flex items-center gap-1.5 hover:bg-slate-900 transition"
            >
              <span>↓</span>
              <span>Latest messages · 最新消息</span>
            </button>
          )}

          {/* INPUT BAR (IME Composition Safe & Mobile First) */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 bg-white transition">
              {/* Recipient explicit reminder */}
              <div
                className={`px-3 py-1 border-b text-[10px] font-medium flex items-center justify-between rounded-t-xl ${
                  isInternal
                    ? "bg-indigo-50 border-indigo-100 text-indigo-950"
                    : "bg-slate-50 border-slate-100 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isInternal ? (
                    <>
                      <span>🔒</span>
                      <span className="font-semibold text-indigo-900 truncate">
                        Internal Note: Only Apex Living Modular can see this · 仅买方内部可见
                      </span>
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      <span className="truncate">
                        Sending to: <b className="text-slate-800">EastFrame Steel & Apex Living Modular</b> · 供需双方可见
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                  {role === "buyer" ? "Buyer Session" : "Supplier Session"}
                </span>
              </div>

              {/* Textarea with Chinese IME preservation */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    if (
                      isComposing ||
                      (e.nativeEvent as any).isComposing ||
                      e.keyCode === 229
                    ) {
                      return; // In Chinese IME character selection
                    }
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isInternal
                    ? "Write an internal confidential message (EastFrame cannot see this) · 内部私密备忘..."
                    : "Write a message visible to EastFrame Steel & Apex team · 发送给供应商与买方团队..."
                }
                className="w-full resize-none px-3 py-2 text-[13px] sm:text-sm outline-none text-slate-900 bg-transparent min-h-[38px] max-h-[100px] leading-relaxed"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/png,image/jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  void handleFileSelected(file);
                }}
              />

              {fileError && (
                <div className="mx-3 mb-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-700">
                  {fileError}
                </div>
              )}

              {/* Footer Bar */}
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-100">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={fileUploading}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {fileUploading
                      ? `Uploading ${fileUploadProgress}%`
                      : "Attach · 附件"}
                  </button>
                  {fileUploading && (
                    <button
                      type="button"
                      onClick={handleCancelFileUpload}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Cancel
                    </button>
                  )}
                  <div className="truncate text-[10px] text-slate-400">
                    {inputText.trim()
                      ? "Current text will be sent as the file caption"
                      : "PDF / Excel / image · max 50 MB"}
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={
                    !inputText.trim() ||
                    pendingDraft?.status === "sending" ||
                    fileUploading
                  }
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  {pendingDraft?.status === "sending" ? (
                    <>
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send · 发送</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR: PROJECT STATE (Honest Live Information, No Fake Tabs or Affordances) */}
        <aside className="hidden md:flex flex-col bg-white border-l border-slate-200 min-h-0">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Project Context</div>
              <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-mono font-semibold">
                Live Sync
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Real-time alignment between Bangkok buyer & Chinese factory
            </div>

            {/* Live Counters */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="text-slate-400 font-medium">Room Messages</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{events.length}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="text-slate-400 font-medium">Authorized Rooms</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{visibleRooms.length}</div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* AI Assistant Status Notice */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span>System Status</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                AI assistant is temporarily unavailable; live project messaging continues normally.
              </p>
            </div>

            {/* Room Boundary Cognition Panel */}
            <div
              className={`rounded-xl border p-3.5 text-xs space-y-2.5 ${
                isInternal
                  ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
                  : "bg-amber-50/70 border-amber-200 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span>{isInternal ? "🔒" : "🌐"}</span>
                <span>
                  {isInternal
                    ? "Confidential Boundary · 内部私密边界"
                    : "Shared Room Boundary · 外部共享边界"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isInternal
                  ? "Strictly internal to Apex Living Modular. External supplier (EastFrame Steel) has no RLS visibility into this room."
                  : "Transparent shared room between Apex Living Modular and EastFrame Steel Co., Ltd. Both organizations see all messages."}
              </p>
            </div>

            {/* Session Details */}
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white text-xs space-y-2">
              <div className="font-semibold text-slate-800">Active Connection</div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Role:</span>
                <span className="font-medium capitalize">{role === "buyer" ? "Buyer · 买方" : "Supplier · 供应商"}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Room:</span>
                <span className="font-medium truncate max-w-[140px]">{activeRoom.name}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Boundary:</span>
                <span className="font-medium font-mono text-[10px]">{isInternal ? "INTERNAL (Private)" : "SHARED (External)"}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Latest Seq:</span>
                <span className="font-mono font-medium">#{lastSeqRef.current}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Sync Engine:</span>
                <span className="text-emerald-600 font-medium">Realtime + Gap-Fill</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}