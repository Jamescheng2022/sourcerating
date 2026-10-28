import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function classifyText(text: string) {
  const hasMoney = /(?:rmb|usd|thb|cny|price|quote|quotation|cost|payment|deposit|total|报价|价格|付款|总价)/i.test(text);
  const hasDelivery = /(?:delivery|lead\s*time|shipment|calendar\s*days?|交期|发货|到货)/i.test(text);
  const hasRequirement = /(?:require|spec|specification|mm\b|kpa\b|r-value|panel|standard|thickness|要求|规格|厚度|标准|材质)/i.test(text);
  const hasDecision = /(?:approved|approve|agreed|accept|confirmed|finalize|proceed|同意|确认|按这个|就这么定)/i.test(text);
  const hasQuestion = /\?|？|(?:can you|please confirm|could you|是否|能否|请确认)/i.test(text);
  const hasRisk = /(?:risk|delay|late|fail|nonconform|issue|blocked|风险|延误|不合格|阻塞)/i.test(text);

  let proposalType = "general";
  if (hasDecision) proposalType = "decision";
  else if (hasMoney || hasDelivery) proposalType = "quote_change";
  else if (hasRequirement) proposalType = "requirement";
  else if (hasRisk) proposalType = "risk";
  else if (hasQuestion) proposalType = "question";

  const confidence = proposalType === "general" ? 0.35 : 0.82;
  const priority = hasRisk ? "high" : hasMoney || hasDelivery || hasDecision ? "normal" : "low";

  return { proposalType, confidence, priority };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ ok: false, error: "server_config_missing" }, 500);
  }

  const secret = req.headers.get("x-source-rating-agent-secret") || "";
  if (!secret) return json({ ok: false, error: "missing_agent_secret" }, 401);

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: valid, error: validError } = await anon.rpc(
    "validate_source_rating_agent_secret",
    { p_secret: secret },
  );
  if (validError || valid !== true) {
    return json({ ok: false, error: "invalid_agent_secret" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error: claimError } = await admin.rpc("agent_claim_outbox", {
    p_limit: 20,
  });
  if (claimError) return json({ ok: false, error: claimError.message }, 500);

  const items = Array.isArray(jobs) ? jobs : [];
  const results: unknown[] = [];

  for (const job of items) {
    let success = true;
    let lastError: string | null = null;
    let retrySeconds = 60;

    try {
      const { data: event, error: eventError } = await admin
        .from("room_events")
        .select("id,room_id,event_type,payload,actor_user_id,actor_organization_id,seq,created_at")
        .eq("id", job.room_event_id)
        .maybeSingle();

      if (eventError || !event) throw new Error(eventError?.message || "event_not_found");

      if (!["message.posted", "file.attached"].includes(event.event_type)) {
        results.push({ outboxId: job.id, skipped: true, eventType: event.event_type });
      } else {
        const { data: room } = await admin
          .from("rooms")
          .select("id,kind,owner_organization_id,counterpart_organization_id")
          .eq("id", event.room_id)
          .maybeSingle();

        if (!room) throw new Error("room_not_found");

        let proposalType = "general";
        let confidence = 0.5;
        let priority = "low";
        let payload: Record<string, unknown> = {};
        let title = "Review project update";
        let detail = "";
        let provider = "rules";

        if (event.event_type === "file.attached") {
          const fileVersionId = event.payload?.file_version_id;
          const { data: file } = await admin
            .from("room_file_versions")
            .select("id,verification_status,file_name:logical_name,version_no,mime_type,size_bytes,server_sha256,detected_mime_type")
            .eq("id", fileVersionId)
            .maybeSingle();

          if (!file) throw new Error("file_version_not_found");

          if (file.verification_status === "pending") {
            success = false;
            retrySeconds = 15;
            throw new Error("file_verification_pending");
          }

          if (file.verification_status !== "verified") {
            proposalType = "risk";
            confidence = 1;
            priority = "high";
            title = "Blocked file requires attention";
            detail = String(event.payload?.file_name || "Uploaded file") + " failed server verification.";
            payload = {
              summary: detail,
              classification: "risk",
              fileVersionId,
              verificationStatus: file.verification_status,
              evidenceQuote: event.payload?.caption || null,
            };
          } else {
            proposalType = "file_update";
            confidence = 1;
            priority = "normal";
            title = "Review uploaded project document";
            detail = String(event.payload?.file_name || "Project document") + " v" + String(event.payload?.version_no || file.version_no || 1);
            payload = {
              summary: event.payload?.caption || detail,
              classification: "file_update",
              fileVersionId,
              fileName: event.payload?.file_name,
              versionNo: event.payload?.version_no,
              mimeType: event.payload?.mime_type,
              sizeBytes: event.payload?.size_bytes,
              serverSha256: file.server_sha256,
              evidenceQuote: event.payload?.caption || null,
            };
          }
        } else {
          const text = typeof event.payload?.text === "string" ? event.payload.text.trim() : "";
          if (!text) {
            results.push({ outboxId: job.id, skipped: true, reason: "empty_message" });
          } else {
            const c = classifyText(text);
            proposalType = c.proposalType;
            confidence = c.confidence;
            priority = c.priority;
            title =
              proposalType === "quote_change"
                ? "Review commercial change"
                : proposalType === "requirement"
                  ? "Review requirement change"
                  : proposalType === "decision"
                    ? "Review recorded decision"
                    : proposalType === "question"
                      ? "Answer project question"
                      : proposalType === "risk"
                        ? "Review project risk"
                        : "Review project message";
            detail = text.length > 220 ? text.slice(0, 217) + "..." : text;
            payload = {
              summary: detail,
              classification: proposalType,
              evidenceQuote: text,
              sourceSeq: event.seq,
            };
          }
        }

        if (Object.keys(payload).length > 0) {
          const { data: proposalRows, error: proposalError } = await admin
            .from("staging_proposals")
            .upsert(
              {
                room_id: event.room_id,
                source_event_id: event.id,
                proposal_type: proposalType,
                payload,
                confidence,
                provider,
                status: "pending",
              },
              {
                onConflict: "source_event_id,proposal_type,provider",
                ignoreDuplicates: false,
              },
            )
            .select("id")
            .limit(1);

          if (proposalError) throw new Error(proposalError.message);
          const proposal = Array.isArray(proposalRows) ? proposalRows[0] : proposalRows;

          const targetOrganizationId =
            room.kind === "buyer_internal"
              ? room.owner_organization_id
              : event.actor_organization_id === room.owner_organization_id
                ? room.counterpart_organization_id
                : room.owner_organization_id;

          if (proposal?.id) {
            const { data: existingNeed } = await admin
              .from("needs_you")
              .select("id")
              .eq("proposal_id", proposal.id)
              .eq("status", "open")
              .maybeSingle();

            if (!existingNeed) {
              const { error: needError } = await admin.from("needs_you").insert({
                room_id: event.room_id,
                source_event_id: event.id,
                proposal_id: proposal.id,
                title,
                detail,
                priority,
                target_organization_id: targetOrganizationId,
              });
              if (needError) throw new Error(needError.message);
            }
          }

          results.push({
            outboxId: job.id,
            eventId: event.id,
            proposalType,
            provider,
            targetOrganizationId,
          });
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (lastError !== "file_verification_pending") success = false;
    }

    const { error: completeError } = await admin.rpc("agent_complete_outbox", {
      p_id: job.id,
      p_success: success,
      p_error: lastError,
      p_retry_seconds: retrySeconds,
    });
    if (completeError) {
      results.push({ outboxId: job.id, completeError: completeError.message });
    }
  }

  return json({ ok: true, claimed: items.length, results });
});
