"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Message, MessageSeparator } from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  Hash,
  LockKeyhole,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { WorkspaceNav } from "./workspace-nav";
import { AISettings, type AIConnection } from "./ai-settings";
import styles from "./workspace.module.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DemoRole,
  Room,
  RoomEvent,
  PendingDraft,
  loginWithPassword,
  resolveSessionIdentity,
  resetDemoIdentity,
  dedupeAndSortEvents,
  getMaxSeq,
  extractEventText,
} from "@/lib/demo-session";
import { analyzeRoomEvent } from "@/lib/staging";
import {
  savePendingMessage,
  readPendingMessage,
  removePendingMessage,
  clearPendingMessages,
} from "@/lib/pending-message";
import {
  createRoomFileSignedUrl,
  formatFileSize,
  uploadRoomAttachment,
} from "@/lib/room-files";
import { ProjectStatePanel } from "./project-state-panel";
import { InquiryPanel } from "./inquiry-panel";
import {
  EvidenceDownloadControls,
  useRoomEvidenceDownloads,
} from "./evidence-downloads";
import {
  executeReviewStagingProposal,
  loadProjectRoomState,
  type ProjectRoomState,
} from "@/lib/project-state";

export default function ProjectRoomPage() {
  // Session & Auth state
  const [role, setRole] = useState<DemoRole | null>(null);
  const [actingOrgId, setActingOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Viewport height tracking for mobile/Android virtual keyboard
  const [viewportHeight, setViewportHeight] = useState<string>("100dvh");

  // Rooms state (loaded strictly through RLS)
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomActivity, setRoomActivity] = useState<Record<string, number>>({});
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [, setRoomsLoading] = useState(false);

  // Events & Messaging state
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [messageStorageError, setMessageStorageError] = useState<string | null>(
    null,
  );
  const sendingMessageRef = useRef(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [drawer, setDrawer] = useState<"rooms" | "context" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roomQuery, setRoomQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [aiConnection, setAIConnection] = useState<AIConnection | null>(null);
  const [syncStatus, setSyncStatus] = useState("正在连接");
  useEffect(() => {
    try {
      setLeftCollapsed(localStorage.getItem("sr-left-collapsed") === "true");
      setRightCollapsed(localStorage.getItem("sr-right-collapsed") === "true");
    } catch {
      /* Preferences are optional. */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("sr-left-collapsed", String(leftCollapsed));
      localStorage.setItem("sr-right-collapsed", String(rightCollapsed));
    } catch {
      /* Preferences are optional. */
    }
  }, [leftCollapsed, rightCollapsed]);
  useEffect(() => {
    setCopyNotice(null);
  }, [inviteUrl, activeRoomId]);
  const [projectName, setProjectName] = useState("Project");
  const [, setProjectCode] = useState("");
  const [projectState, setProjectState] = useState<ProjectRoomState>({
    stagingProposals: [],
    needsYou: [],
    canonicalObjects: [],
  });
  const [projectStateStatus, setProjectStateStatus] = useState<
    "idle" | "active" | "unavailable"
  >("idle");
  const [reviewingProposalId, setReviewingProposalId] = useState<string | null>(
    null,
  );
  const [projectStateError, setProjectStateError] = useState<string | null>(
    null,
  );
  const [fileVerification, setFileVerification] = useState<
    Record<
      string,
      {
        status:
          | "pending"
          | "verified"
          | "quarantined"
          | "hash_mismatch"
          | "verification_failed";
        serverSha256?: string | null;
        detectedMimeType?: string | null;
        verificationError?: string | null;
      }
    >
  >({});

  useEffect(() => {
    if (!activeRoomId || !currentUserId) return;
    let current = true;
    void supabase
      .from("room_members")
      .select("acting_organization_id")
      .eq("room_id", activeRoomId)
      .eq("user_id", currentUserId)
      .is("removed_at", null)
      .then(({ data }) => {
        if (current && data?.[0])
          setActingOrgId(data[0].acting_organization_id);
      });
    return () => {
      current = false;
    };
  }, [activeRoomId, currentUserId]);

  // Track max seq for gap filling
  const lastSeqRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string>("");
  const analyzedEventIdsRef = useRef<Set<string>>(new Set());
  activeRoomIdRef.current = activeRoomId;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;
  useEffect(() => {
    setInputText("");
    setMessageStorageError(null);
    try {
      setPendingDraft(
        currentUserId && activeRoomId
          ? readPendingMessage(localStorage, currentUserId, activeRoomId)
          : null,
      );
    } catch (e) {
      setPendingDraft(null);
      setMessageStorageError((e as Error).message);
    }
  }, [activeRoomId, currentUserId]);

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
        const identity = await resolveSessionIdentity();
        if (isMounted && identity) {
          setRole(identity.role);
          setActingOrgId(identity.actingOrgId);
          setCurrentUserId(identity.userId);
        }
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : "Unable to restore session.",
        );
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
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const { data: rlsRooms, error } = await supabase
        .from("rooms")
        .select("*");
      if (error) {
        console.error("Error fetching rooms:", error);
        return;
      }

      if (rlsRooms && rlsRooms.length > 0) {
        const filteredRooms = rlsRooms; // RLS is the sole visibility boundary.

        setRooms(filteredRooms);

        setActiveRoomId((prev) => {
          if (prev && filteredRooms.some((r) => r.id === prev)) {
            return prev;
          }
          return (
            filteredRooms.find((r) => /Live AI Project Room/i.test(r.name))
              ?.id ||
            filteredRooms[0]?.id ||
            ""
          );
        });
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
      loadRooms();
    }
  }, [role, loadRooms, actingOrgId]);

  useEffect(() => {
    if (!currentUserId || !rooms.length) return;
    const allowed = new Set(rooms.map((room) => room.id));
    const channel = supabase
      .channel(`room_activity:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_events" },
        (payload) => {
          const event = payload.new as RoomEvent;
          if (
            allowed.has(event.room_id) &&
            event.room_id !== activeRoomIdRef.current &&
            event.actor_user_id !== currentUserId
          ) {
            setRoomActivity((previous) => ({
              ...previous,
              [event.room_id]: (previous[event.room_id] || 0) + 1,
            }));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, rooms]);
  useEffect(() => {
    setRoomActivity((previous) => {
      if (!previous[activeRoomId]) return previous;
      const next = { ...previous };
      delete next[activeRoomId];
      return next;
    });
  }, [activeRoomId]);

  // Sign in to existing accounts; project membership supplies the UI identity.
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await loginWithPassword(email, password);
      setRole(result.role);
      setActingOrgId(result.actingOrgId);
      setCurrentUserId(result.userId);
      await loadRooms();
    } catch (err: unknown) {
      console.error("Sign-in failed:", err);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setAuthLoading(false);
      setPassword("");
    }
  };

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const localSignOutRef = useRef(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        currentUserId &&
        !localSignOutRef.current &&
        (event === "SIGNED_OUT" ||
          (session?.user.id && session.user.id !== currentUserId))
      ) {
        // A different tab changed identity. Drop this document's private memory and
        // pending requests, then restore the actual session through the existing path.
        try {
          clearPendingMessages(localStorage, currentUserId);
        } catch {
          /* Reload still removes private UI when browser storage is unavailable. */
        }
        window.location.reload();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [currentUserId]);

  // Sign out
  const handleResetIdentity = async () => {
    if (
      signingOut ||
      !window.confirm(
        "Sign out? Unsent message and inquiry drafts will be cleared.",
      )
    )
      return;
    localSignOutRef.current = true;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const result = await resetDemoIdentity();
      let storageWarning: string | null = null;
      try {
        if (currentUserId) clearPendingMessages(localStorage, currentUserId);
      } catch {
        storageWarning =
          "Signed out. This browser could not clear pending message drafts. Clear its site data before sharing this device.";
      }
      setAuthError(
        storageWarning ||
          (result.serverRevocationConfirmed
            ? null
            : "Signed out on this browser. Server sign-out could not be confirmed; other sessions may remain active. Sign in again to retry."),
      );
      setRole(null);
      setActingOrgId(null);
      setCurrentUserId(null);
      setRooms([]);
      setRoomActivity({});
      setActiveRoomId("");
      setEvents([]);
      setPendingDraft(null);
      setAiStatus(null);
      analyzedEventIdsRef.current.clear();
      setInputText("");
    } catch {
      setSignOutError("Unable to confirm local sign-out. Please retry.");
    } finally {
      localSignOutRef.current = false;
      setSigningOut(false);
    }
  };

  const evidenceDownloads = useRoomEvidenceDownloads(
    activeRoomId,
    currentUserId,
  );

  const visibleRooms = rooms;

  // Active room fallback
  const activeRoom = useMemo(() => {
    return (
      visibleRooms.find((r) => r.id === activeRoomId) ||
      visibleRooms[0] || {
        id: activeRoomId,
        name: role === "supplier" ? "Supplier Shared Room" : "Project Room",
        boundary: role === "supplier" ? "SHARED" : "PRIVATE",
        note: role === "supplier" ? "Shared Room" : "Internal Room",
      }
    );
  }, [visibleRooms, activeRoomId, role]);

  // Select a room returned by RLS.
  useEffect(() => {
    if (
      visibleRooms.length > 0 &&
      !visibleRooms.some((r) => r.id === activeRoomId)
    ) {
      setActiveRoomId(visibleRooms[0].id);
    }
  }, [visibleRooms, activeRoomId]);

  const isInternal = activeRoom.kind === "buyer_internal";

  const externalPartnerName = useMemo(() => {
    if (isInternal) return "External Supplier";
    const raw = String(activeRoom?.name || "External Partner");
    return raw
      .replace(/\s+[-—]\s+Shared$/i, "")
      .replace(/Buyer\s*↔\s*Supplier/i, "Supplier")
      .trim();
  }, [activeRoom, isInternal]);

  useEffect(() => {
    const projectId = activeRoom?.project_id;
    if (!projectId) {
      setProjectName("Project");
      setProjectCode("");
      return;
    }

    void (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name,code")
        .eq("id", projectId)
        .maybeSingle();

      if (!error && data?.name) {
        setProjectName(data.name);
        setProjectCode(data.code || "");
      }
    })();
  }, [activeRoom?.project_id]);

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
        if (activeRoomIdRef.current !== roomId) return;
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

  const refreshFileVerification = useCallback(
    async (sourceEvents: RoomEvent[]) => {
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
          "id,verification_status,server_sha256,detected_mime_type,verification_error",
        )
        .in("id", fileVersionIds);

      if (error) {
        console.error("File verification status query failed:", error);
        return;
      }

      const next: Record<
        string,
        {
          status:
            | "pending"
            | "verified"
            | "quarantined"
            | "hash_mismatch"
            | "verification_failed";
          serverSha256?: string | null;
          detectedMimeType?: string | null;
          verificationError?: string | null;
        }
      > = {};

      for (const row of data || []) {
        next[row.id] = {
          status:
            row.verification_status === "verified" ||
            row.verification_status === "quarantined" ||
            row.verification_status === "hash_mismatch" ||
            row.verification_status === "verification_failed"
              ? row.verification_status
              : "pending",
          serverSha256: row.server_sha256,
          detectedMimeType: row.detected_mime_type,
          verificationError: row.verification_error,
        };
      }

      setFileVerification(next);
    },
    [],
  );

  useEffect(() => {
    void refreshFileVerification(events);
  }, [events, refreshFileVerification]);

  const refreshProjectState = useCallback(async (roomId: string) => {
    if (!roomId) {
      setProjectState({
        stagingProposals: [],
        needsYou: [],
        canonicalObjects: [],
      });
      setProjectStateStatus("idle");
      return;
    }

    const result = await loadProjectRoomState(roomId);
    if (activeRoomIdRef.current !== roomId) return;
    if (!result.ok || !result.data) {
      setProjectStateStatus("unavailable");
      return;
    }

    setProjectState(result.data);
    setProjectStateStatus("active");
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    setProjectState({
      stagingProposals: [],
      needsYou: [],
      canonicalObjects: [],
    });
    setAiStatus(null);
    void refreshProjectState(activeRoomId);
    const timer = window.setInterval(() => {
      void refreshProjectState(activeRoomId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeRoomId, refreshProjectState]);

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
        const result = await analyzeRoomEvent(event.room_id, event.id);
        if (activeRoomIdRef.current !== event.room_id) return;
        if (!result?.ok) {
          setAiStatus(
            "AI assistant is temporarily unavailable; live project messaging continues normally.",
          );
          return;
        }
        setAiStatus(
          result.deepProvider
            ? `AI assistant active via ${result.deepProvider}; live project messaging continues normally.`
            : result.aiStatus?.deepAnalysisRequested === false
              ? "AI assistant ready; this message does not require deep analysis."
              : "AI assistant is temporarily unavailable; live project messaging continues normally.",
        );
      } catch {
        setAiStatus(
          "AI assistant is temporarily unavailable; live project messaging continues normally.",
        );
      }
    },
    [actingOrgId],
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
                lastSeqRef.current = Math.max(
                  lastSeqRef.current,
                  getMaxSeq(merged),
                );
                return merged;
              });
              void maybeAnalyzeEvent(newRow);
            }
            await runGapFill(activeRoomId);
          }
        },
      )
      .subscribe((status) => {
        if (isSubscribed)
          setSyncStatus(
            status === "SUBSCRIBED"
              ? "实时同步"
              : status === "CHANNEL_ERROR" ||
                  status === "TIMED_OUT" ||
                  status === "CLOSED"
                ? "连接恢复中"
                : "正在连接",
          );
      });

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

  // Save the exact request before network I/O, then explicitly retry the same ID.
  const deliverMessage = async (draft: PendingDraft, clearInput = false) => {
    const userId = currentUserId;
    if (
      !userId ||
      !role ||
      draft.room_id !== activeRoomId ||
      sendingMessageRef.current ||
      messageStorageError
    )
      return;
    sendingMessageRef.current = true;
    const stillHere = () =>
      currentUserIdRef.current === userId &&
      activeRoomIdRef.current === draft.room_id;
    const sending: PendingDraft = {
      ...draft,
      status: "sending",
      error: undefined,
    };
    try {
      try {
        savePendingMessage(localStorage, userId, sending);
      } catch {
        setMessageStorageError(
          "Could not keep this message for retry. Copy the text before closing; no request was sent.",
        );
        return;
      }
      if (clearInput) setInputText("");
      setPendingDraft(sending);
      isNearBottomRef.current = true;
      scrollToBottom("smooth");
      const { data, error } = await supabase
        .rpc("append_room_event", {
          p_room_id: draft.room_id,
          p_client_msg_id: draft.client_msg_id,
          p_actor_organization_id: actingOrgId || null,
          p_event_type: "message.posted",
          p_payload: { text: draft.text },
        })
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      const canonicalEvent = data as RoomEvent;
      if (
        !canonicalEvent?.id ||
        canonicalEvent.room_id !== draft.room_id ||
        canonicalEvent.client_msg_id !== draft.client_msg_id
      )
        throw Error(
          "Message acknowledgement could not be verified. Retry the original message.",
        );
      removePendingMessage(localStorage, userId, draft);
      if (stillHere()) {
        setPendingDraft(
          readPendingMessage(localStorage, userId, draft.room_id),
        );
        setEvents((prev) => {
          const merged = dedupeAndSortEvents(prev, [canonicalEvent]);
          lastSeqRef.current = getMaxSeq(merged);
          return merged;
        });
        void maybeAnalyzeEvent(canonicalEvent);
        await runGapFill(draft.room_id);
      }
    } catch (e) {
      if (stillHere())
        setPendingDraft({
          ...draft,
          status: "failed",
          error:
            e instanceof Error
              ? e.message
              : "Delivery unconfirmed. Retry when connected.",
        });
    } finally {
      sendingMessageRef.current = false;
    }
  };
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeRoomId || pendingDraft || messageStorageError) return;
    await deliverMessage(
      {
        client_msg_id: crypto.randomUUID(),
        room_id: activeRoomId,
        text,
        status: "sending",
        created_at: new Date().toISOString(),
      },
      true,
    );
  };
  const handleRetry = async () => {
    if (pendingDraft && pendingDraft.room_id === activeRoomId)
      await deliverMessage(pendingDraft);
  };
  const dismissPending = (edit: boolean) => {
    if (
      !pendingDraft ||
      !currentUserId ||
      pendingDraft.room_id !== activeRoomId ||
      sendingMessageRef.current
    )
      return;
    if (
      !window.confirm(
        edit
          ? "Delivery may already have succeeded. Edit as a new message?"
          : "Discard this pending message? Any delivered copy will remain.",
      )
    )
      return;
    try {
      removePendingMessage(localStorage, currentUserId, pendingDraft);
      if (edit) setInputText(pendingDraft.text);
      setPendingDraft(
        readPendingMessage(localStorage, currentUserId, activeRoomId),
      );
    } catch {
      setMessageStorageError(
        "Could not update pending storage. Keep a copy before closing.",
      );
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

  const handleOpenFile = async (fileVersionId: string) => {
    try {
      setFileError(null);
      const signedUrl = await createRoomFileSignedUrl(fileVersionId);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to open file.";
      setFileError(message);
    }
  };

  const handleCancelFileUpload = () => {
    fileUploadAbortRef.current?.abort();
  };

  const handleReviewProjectState = async (
    proposalId: string | null,
    action: "accept" | "dismiss",
    needsYouId?: string,
  ) => {
    if ((!proposalId && !needsYouId) || !actingOrgId || !activeRoomId) return;
    setReviewingProposalId(proposalId || needsYouId || null);
    setProjectStateError(null);
    try {
      if (!proposalId && needsYouId) {
        const { error } = await supabase.rpc("acknowledge_project_inquiry", {
          p_needs_you_id: needsYouId,
        });
        if (error)
          throw new Error("Unable to acknowledge inquiry. Please try again.");
        await refreshProjectState(activeRoomId);
        return;
      }
      const result = await executeReviewStagingProposal({
        proposalId: proposalId!,
        action,
        actorOrganizationId: actingOrgId,
      });
      if (!result.ok) {
        throw new Error(result.error || "Unable to review proposal.");
      }
      await refreshProjectState(activeRoomId);
    } catch (error) {
      setProjectStateError(
        error instanceof Error ? error.message : "Unable to review proposal.",
      );
    } finally {
      setReviewingProposalId(null);
    }
  };

  const handleViewSourceEvent = (sourceEventId: string | null | undefined) => {
    if (!sourceEventId) return;
    setDrawer(null);
    setMessageQuery("");
    requestAnimationFrame(() =>
      document
        .getElementById(`event-${sourceEventId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const handleCreateSupplierInvite = async () => {
    if (
      role !== "buyer" ||
      !activeRoom?.project_id ||
      !inviteCompany.trim() ||
      !inviteEmail.trim()
    ) {
      return;
    }

    setInviteCreating(true);
    setInviteError(null);
    setInviteUrl("");

    try {
      const { data, error } = await supabase.rpc(
        "create_supplier_room_invite",
        {
          p_project_id: activeRoom.project_id,
          p_supplier_organization_name: inviteCompany.trim(),
          p_invited_email: inviteEmail.trim(),
          p_expires_in_hours: 168,
        },
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "Unable to create invitation.");
      }

      const url =
        window.location.origin +
        "/join?token=" +
        encodeURIComponent(String(data.token));
      setInviteUrl(url);
      await loadRooms();
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to create invitation.",
      );
    } finally {
      setInviteCreating(false);
    }
  };

  // Format message sender and organization
  const getEventAuthorInfo = (ev: RoomEvent) => {
    const isMe = currentUserId && ev.actor_user_id === currentUserId;
    return {
      who: isMe
        ? "You"
        : ev.actor_display_name ||
          `Member ${String(ev.actor_user_id || "unknown").slice(0, 8)}`,
      org:
        ev.actor_organization_name ||
        `Organization ${String(ev.actor_organization_id || "unknown").slice(0, 8)}`,
    };
  };

  // 1. Initial loading screen
  if (isInitializing) {
    return (
      <main className="h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
          <div className="text-xs text-slate-400">
            Restoring your project session...
          </div>
        </div>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-slate-950 p-4 text-slate-100">
        <form
          className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignIn();
          }}
        >
          <h1 className="text-xl font-bold">SourceRating Project Room</h1>
          <p className="text-sm text-slate-400">
            Sign in to your invited project rooms.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-sky-300 underline"
          >
            Forgot password?
          </Link>
          <label className="block text-sm">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
            />
          </label>
          {authError && (
            <p role="alert" className="text-sm text-rose-300">
              {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded bg-sky-500 p-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {authLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  const contextContent = (
    <div className={styles.contextContent}>
      <div className={styles.contextTitle}>
        <span className={styles.aiLogo}>
          <Sparkles size={21} />
        </span>
        <div>
          <h2>AI 项目助理</h2>
          <p>总结 · 待办 · 已确认决议</p>
        </div>
        <button
          aria-label="关闭 AI 面板"
          title="折叠 AI 面板"
          className={styles.iconButton}
          onClick={() => {
            setRightCollapsed(true);
            setDrawer(null);
          }}
        >
          <PanelRightClose size={19} />
        </button>
      </div>
      <ProjectStatePanel
        state={projectState}
        stateStatus={projectStateStatus}
        aiStatus={aiStatus}
        aiConnection={aiConnection}
        reviewingProposalId={reviewingProposalId}
        actionError={projectStateError}
        onReview={handleReviewProjectState}
        onViewSource={handleViewSourceEvent}
      />
      <details className={styles.projectTools}>
        <summary>项目工具与导出</summary>
        <EvidenceDownloadControls actions={evidenceDownloads} />
        {role === "buyer" && (
          <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-800">
                  Invite Supplier
                </div>
                <div className="text-[10px] text-slate-500">
                  Creates a separate supplier room with isolated access.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen((value) => !value)}
                className="rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-700"
              >
                {inviteOpen ? "Close" : "Create"}
              </button>
            </div>

            {inviteOpen && (
              <div className="mt-2 space-y-2">
                <input
                  value={inviteCompany}
                  onChange={(event) => setInviteCompany(event.target.value)}
                  placeholder="Supplier company name"
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-sky-400"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="Invitee email (required)"
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateSupplierInvite()}
                  disabled={
                    inviteCreating ||
                    inviteCompany.trim().length < 2 ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())
                  }
                  className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {inviteCreating
                    ? "Creating..."
                    : "Generate 7-day Invite Link"}
                </button>

                {inviteError && (
                  <div className="text-[10px] text-rose-700">{inviteError}</div>
                )}

                {inviteUrl && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                    <div className="break-all font-mono text-[9px] text-emerald-900">
                      {inviteUrl}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteUrl);
                          setCopyNotice("Invite link copied.");
                        } catch {
                          setCopyNotice(
                            "Unable to copy. Select the link and copy it manually.",
                          );
                        }
                      }}
                      className="mt-1.5 rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white"
                    >
                      {copyNotice === "Invite link copied."
                        ? "Copied"
                        : "Copy Invite Link"}
                    </button>
                    {copyNotice && (
                      <p role="status" className="mt-1 text-xs text-slate-800">
                        {copyNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </details>
      <button
        className={styles.connectionLink}
        onClick={() => {
          setDrawer(null);
          setSettingsOpen(true);
        }}
      >
        <Settings2 size={15} /> DeepSeek API 连接设置
      </button>
    </div>
  );

  // 3. Active session view
  return (
    <main
      style={{
        height: viewportHeight,
        minHeight: viewportHeight,
        maxHeight: viewportHeight,
      }}
      className={`${styles.app} overflow-hidden bg-slate-100 text-slate-900 flex flex-col w-full`}
    >
      {signOutError && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {signOutError}
        </p>
      )}
      <AISettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        roomId={activeRoomId}
        eventId={
          projectState.stagingProposals[0]?.source_event_id ||
          projectState.canonicalObjects[0]?.source_event_id ||
          events.filter((event) => event.event_type === "message.posted").at(-1)
            ?.id
        }
        onConnection={setAIConnection}
      />
      <div
        className={`${styles.workspace} ${leftCollapsed ? styles.leftCollapsed : ""} ${rightCollapsed ? styles.rightCollapsed : ""}`}
      >
        <aside className={styles.desktopNav}>
          <WorkspaceNav
            rooms={visibleRooms}
            activeId={activeRoomId}
            activity={roomActivity}
            projectName={projectName}
            role={role}
            collapsed={leftCollapsed}
            query={roomQuery}
            onQuery={setRoomQuery}
            onSelect={setActiveRoomId}
            onCollapse={() => setLeftCollapsed((value) => !value)}
            onSettings={() => setSettingsOpen(true)}
            onSignOut={() => void handleResetIdentity()}
            signingOut={signingOut}
          />
        </aside>
        <Dialog.Root
          open={drawer === "rooms"}
          onOpenChange={(open) => setDrawer(open ? "rooms" : null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content
              className={styles.leftDrawer}
              aria-describedby={undefined}
            >
              <Dialog.Title className={styles.srOnly}>
                工作空间和聊天室
              </Dialog.Title>
              <Dialog.Close
                className={styles.drawerClose}
                aria-label="关闭菜单"
              >
                <X size={19} />
              </Dialog.Close>
              <WorkspaceNav
                rooms={visibleRooms}
                activeId={activeRoomId}
                activity={roomActivity}
                projectName={projectName}
                role={role}
                collapsed={false}
                query={roomQuery}
                onQuery={setRoomQuery}
                onSelect={(id) => {
                  setActiveRoomId(id);
                  setDrawer(null);
                }}
                onCollapse={() => setDrawer(null)}
                onSettings={() => {
                  setDrawer(null);
                  setSettingsOpen(true);
                }}
                onSignOut={() => void handleResetIdentity()}
                signingOut={signingOut}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* MIDDLE SECTION: CHAT CONVERSATION (Mobile First IM Feel) */}
        <section
          id="room-chat"
          className={`${styles.chat} flex min-w-0 flex-col bg-white h-full min-h-0 relative`}
        >
          <header className={styles.chatHeader}>
            <div className={styles.chatHeading}>
              <button
                className={`${styles.iconButton} ${styles.mobileMenu}`}
                aria-label="打开聊天室菜单"
                onClick={() => setDrawer("rooms")}
              >
                <Menu size={21} />
              </button>
              <span
                className={`${styles.chatRoomIcon} ${isInternal ? styles.privateIcon : ""}`}
              >
                {isInternal ? <LockKeyhole size={21} /> : <Hash size={24} />}
              </span>
              <div className={styles.roomHeading}>
                <h1>{activeRoom.name.replace(/\[S2-TEST\]\s*/g, "")}</h1>
                <p>
                  {projectName} <span>·</span>{" "}
                  <span className={styles.syncDot} />
                  {syncStatus}
                </p>
              </div>
              <div className={styles.headerActions}>
                <button
                  title="搜索消息"
                  aria-label="搜索消息"
                  aria-expanded={showMessageSearch}
                  className={styles.iconButton}
                  onClick={() => setShowMessageSearch((value) => !value)}
                >
                  <Search size={19} />
                </button>
                <button
                  title="AI 总结与里程碑"
                  aria-label="AI 总结与里程碑"
                  className={styles.aiToggle}
                  onClick={() => {
                    if (window.innerWidth < 1100) setDrawer("context");
                    else setRightCollapsed((value) => !value);
                  }}
                >
                  <Sparkles size={18} />
                  <span>AI 总结</span>
                  {projectState.needsYou.length > 0 && (
                    <b>{projectState.needsYou.length}</b>
                  )}
                </button>
              </div>
            </div>
            <div
              className={`${styles.boundary} ${isInternal ? styles.privateBoundary : ""}`}
            >
              {isInternal ? <LockKeyhole size={12} /> : <Hash size={13} />}
              <span>
                {isInternal
                  ? "内部私密 · 仅买方团队可见"
                  : "共享群聊 · 当前房间的买方和供应商可见"}
              </span>
              <small>{role === "buyer" ? "BUYER" : "SUPPLIER"}</small>
            </div>
            {showMessageSearch && (
              <div className={styles.messageSearch}>
                <Search size={16} />
                <input
                  autoFocus
                  aria-label="搜索当前聊天室消息"
                  placeholder="搜索当前聊天室消息…"
                  value={messageQuery}
                  onChange={(e) => setMessageQuery(e.target.value)}
                />
                <button
                  aria-label="关闭消息搜索"
                  onClick={() => {
                    setShowMessageSearch(false);
                    setMessageQuery("");
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            )}
          </header>

          {activeRoomId && (
            <InquiryPanel
              key={activeRoomId}
              roomId={activeRoomId}
              isBuyer={role === "buyer"}
              onSubmitted={() => {
                void refreshProjectState(activeRoomId);
              }}
            />
          )}

          {/* Messages Stream */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`${styles.messageStream} min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5`}
          >
            <div className="mx-auto max-w-3xl space-y-3">
              <div className={styles.conversationIntro}>
                <span>项目沟通记录</span>
                <p>
                  在这里讨论需求、报价与交付。AI 整理进展，重要变更由你确认。
                </p>
              </div>
              {messageQuery && (
                <p className={styles.muted}>
                  搜索结果 ·{" "}
                  {
                    events.filter((event) =>
                      extractEventText(event.payload)
                        .toLowerCase()
                        .includes(messageQuery.toLowerCase()),
                    ).length
                  }{" "}
                  条
                </p>
              )}
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
                  <div className="font-semibold text-slate-700">
                    No messages yet in this room
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isInternal
                      ? "Send a confidential internal note to begin."
                      : `Send an alignment message to ${externalPartnerName}.`}
                  </div>
                </div>
              )}

              {/* Canonical Event List */}
              {events
                .filter(
                  (event) =>
                    !messageQuery ||
                    extractEventText(event.payload)
                      .toLowerCase()
                      .includes(messageQuery.toLowerCase()),
                )
                .map((ev, idx, displayedEvents) => {
                  const author = getEventAuthorInfo(ev);
                  const text = extractEventText(ev.payload);
                  const isFileEvent =
                    ev.event_type === "file.attached" &&
                    typeof ev.payload?.object_path === "string";
                  const latestFileVersion = isFileEvent
                    ? events.reduce((latest, candidate) => {
                        if (
                          candidate.event_type === "file.attached" &&
                          candidate.actor_organization_id ===
                            ev.actor_organization_id &&
                          candidate.payload?.logical_name ===
                            ev.payload?.logical_name
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
                    ? fileVerification[
                        String(ev.payload?.file_version_id || "")
                      ]
                    : undefined;
                  const verificationStatus =
                    verification?.status ||
                    (isFileEvent ? "pending" : undefined);
                  const isMyMessage =
                    currentUserId && ev.actor_user_id === currentUserId;
                  const timeStr = ev.created_at
                    ? new Date(ev.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  const day = ev.created_at
                    ? new Date(ev.created_at).toLocaleDateString()
                    : "";
                  const previous = displayedEvents[idx - 1];
                  const showDay =
                    day &&
                    (!previous?.created_at ||
                      new Date(previous.created_at).toLocaleDateString() !==
                        day);
                  return (
                    <div key={ev.id || ev.client_msg_id || idx}>
                      {showDay && <MessageSeparator>{day}</MessageSeparator>}
                      <div
                        id={ev.id ? `event-${ev.id}` : undefined}
                        className={`${styles.messageRow} ${isMyMessage ? styles.ownMessage : ""}`}
                      >
                        <div
                          className={`${styles.avatar} ${isMyMessage ? styles.ownAvatar : ""}`}
                          title={author.who}
                        >
                          {isMyMessage
                            ? role === "buyer"
                              ? "B"
                              : "S"
                            : author.who.slice(0, 2).toUpperCase()}
                        </div>
                        <div className={styles.messageBody}>
                          {/* Sender Info Header */}
                          <div
                            className={`flex items-baseline gap-1.5 text-[10px] ${
                              isMyMessage ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <span className="font-bold text-slate-800">
                              {isMyMessage ? "You" : author.who}
                            </span>
                            <span className="text-slate-400">
                              {isMyMessage
                                ? role === "buyer"
                                  ? "Buyer Organization"
                                  : externalPartnerName
                                : author.org}
                            </span>
                          </div>

                          <Message
                            model={{
                              direction: isMyMessage ? "outgoing" : "incoming",
                              position: "single",
                              type: "custom",
                            }}
                            className={styles.chatMessage}
                          >
                            <Message.CustomContent>
                              {!isFileEvent && (
                                <div className="whitespace-pre-wrap break-words">
                                  {text}
                                </div>
                              )}

                              {isFileEvent && (
                                <button
                                  type="button"
                                  disabled={verificationStatus !== "verified"}
                                  onClick={() =>
                                    void handleOpenFile(
                                      String(ev.payload.file_version_id || ""),
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
                                      {String(
                                        ev.payload.mime_type || "",
                                      ).includes("pdf")
                                        ? "PDF"
                                        : String(
                                              ev.payload.mime_type || "",
                                            ).includes("sheet") ||
                                            String(
                                              ev.payload.mime_type || "",
                                            ).includes("excel")
                                          ? "XLS"
                                          : "FILE"}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1 truncate font-semibold">
                                          {ev.payload.file_name ||
                                            "Project document"}
                                        </div>
                                        {verificationStatus === "verified" && (
                                          <span
                                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                              isMyMessage
                                                ? "bg-emerald-300/20 text-emerald-50"
                                                : "bg-emerald-100 text-emerald-700"
                                            }`}
                                          >
                                            Byte checks passed
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
                                            Checking file bytes
                                          </span>
                                        )}
                                        {verificationStatus &&
                                          verificationStatus !== "pending" &&
                                          verificationStatus !== "verified" && (
                                            <span
                                              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                                isMyMessage
                                                  ? "bg-rose-300/20 text-rose-50"
                                                  : "bg-rose-100 text-rose-700"
                                              }`}
                                            >
                                              Blocked
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
                                          isMyMessage
                                            ? "text-sky-100"
                                            : "text-slate-500"
                                        }`}
                                      >
                                        <span>
                                          v{ev.payload.version_no || 1}
                                        </span>
                                        <span>
                                          {formatFileSize(
                                            ev.payload.size_bytes,
                                          )}
                                        </span>
                                        <span>
                                          {ev.payload.mime_type || "file"}
                                        </span>
                                        {ev.payload.supersedes_version_id && (
                                          <span>supersedes prior version</span>
                                        )}
                                      </div>
                                      <div
                                        className={`mt-1 truncate font-mono text-[9px] ${
                                          isMyMessage
                                            ? "text-sky-200"
                                            : "text-slate-400"
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
                                      {verificationStatus === "verified" && (
                                        <p
                                          className={`mt-1 text-[10px] ${isMyMessage ? "text-sky-100" : "text-slate-600"}`}
                                        >
                                          Size, SHA256 and detected type
                                          checked. No malware scan or
                                          authenticity check.
                                        </p>
                                      )}
                                      <div
                                        className={`mt-1 text-[10px] font-semibold ${
                                          isMyMessage
                                            ? "text-white"
                                            : "text-sky-700"
                                        }`}
                                      >
                                        {verificationStatus === "verified"
                                          ? "Open / Download · 打开文件"
                                          : verificationStatus &&
                                              verificationStatus !== "pending"
                                            ? verification?.verificationError ||
                                              "File verification failed"
                                            : "Checking file size, SHA256 and detected type"}
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
                                      isMyMessage
                                        ? "text-sky-200"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    Project document
                                  </div>
                                </div>
                              )}
                            </Message.CustomContent>
                          </Message>

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
                                <span>已发送</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Pending Draft: Sending State (Subtle IM Feel) */}
              {pendingDraft?.room_id === activeRoomId &&
                pendingDraft.status === "sending" && (
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-baseline gap-1.5 text-[10px] flex-row-reverse">
                      <span className="font-bold text-slate-800">You · 你</span>
                      <span className="text-slate-400">
                        {role === "buyer"
                          ? "Buyer Organization"
                          : externalPartnerName}
                      </span>
                    </div>

                    <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-br-xs p-3 text-[13px] leading-relaxed shadow-xs bg-sky-500/80 text-white border border-sky-400 opacity-90 animate-pulse">
                      <div className="whitespace-pre-wrap break-words">
                        {pendingDraft.text}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-sky-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping"></span>
                      <span>Sending... · 发送中</span>
                    </div>
                  </div>
                )}

              {/* Pending Draft: Failed State with Subtle Retry (using identical client_msg_id) */}
              {pendingDraft?.room_id === activeRoomId &&
                pendingDraft.status === "failed" && (
                  <div className="flex flex-col items-end space-y-1.5">
                    <div className="flex items-baseline gap-1.5 text-[10px] flex-row-reverse">
                      <span className="font-bold text-slate-800">You · 你</span>
                      <span className="text-rose-600 font-medium">
                        ⚠️ Delivery unconfirmed · 发送状态待确认
                      </span>
                    </div>

                    <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-br-xs p-3 text-[13px] leading-relaxed shadow-xs bg-rose-50 border border-rose-200 text-slate-900">
                      <div className="whitespace-pre-wrap break-words">
                        {pendingDraft.text}
                      </div>
                      {pendingDraft.error && (
                        <div className="mt-1 text-[10px] text-rose-600">
                          {pendingDraft.error}
                        </div>
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
                        onClick={() => dismissPending(true)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Edit · 编辑
                      </button>
                      <button
                        onClick={() => dismissPending(false)}
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
              className="shrink-0 self-end m-2 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs shadow-lg flex items-center gap-1.5 hover:bg-slate-800 transition"
            >
              <span>↓</span>
              <span>Latest messages · 最新消息</span>
            </button>
          )}

          {/* INPUT BAR (IME Composition Safe & Mobile First) */}
          {messageStorageError && (
            <p role="alert" className="px-3 text-sm text-rose-700">
              {messageStorageError}
            </p>
          )}
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
                        Internal Note: Only Buyer Organization can see this ·
                        仅买方内部可见
                      </span>
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      <span className="truncate">
                        Sending to:{" "}
                        <b className="text-slate-800">
                          {externalPartnerName} & Buyer Organization
                        </b>{" "}
                        · 供需双方可见
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
                aria-label="Room message"
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
                      e.nativeEvent.isComposing ||
                      e.keyCode === 229
                    ) {
                      return; // In Chinese IME character selection
                    }
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isInternal ? "发送内部消息…" : "发送消息，与项目成员沟通…"
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
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-1 border-t border-slate-100">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-describedby="attachment-formats"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={fileUploading}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {fileUploading
                      ? `Uploading ${fileUploadProgress}%`
                      : "＋ 附件"}
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
                  <div
                    id="attachment-formats"
                    className="order-last w-full whitespace-normal text-[10px] text-slate-600 sm:order-none sm:w-auto"
                  >
                    {inputText.trim()
                      ? "Current text will be sent as the file caption"
                      : "PDF / Excel / image · max 50 MB"}
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={
                    !inputText.trim() ||
                    !!pendingDraft ||
                    !!messageStorageError ||
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
                    <span>发送 ↑</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside aria-label="AI 总结与里程碑" className={styles.desktopContext}>
          {rightCollapsed ? (
            <button
              className={styles.collapsedAI}
              aria-label="展开 AI 总结"
              onClick={() => setRightCollapsed(false)}
            >
              <Sparkles size={21} />
              <span>AI 总结</span>
              {projectState.needsYou.length > 0 && (
                <b>{projectState.needsYou.length}</b>
              )}
              <PanelRightOpen size={17} />
            </button>
          ) : (
            contextContent
          )}
        </aside>
        <Dialog.Root
          open={drawer === "context"}
          onOpenChange={(open) => setDrawer(open ? "context" : null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content
              className={styles.rightDrawer}
              aria-describedby={undefined}
            >
              <Dialog.Title className={styles.srOnly}>
                AI 总结与里程碑
              </Dialog.Title>
              {contextContent}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </main>
  );
}
