"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./workspace.module.css";

export type AIConnection = {
  configured: boolean;
  provider: string;
  model: string;
  scope: "automatic" | "manual";
};
export function AISettings({
  open,
  onOpenChange,
  roomId,
  eventId,
  onConnection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  eventId?: string;
  onConnection: (connection: AIConnection | null) => void;
}) {
  const [connection, setConnection] = useState<AIConnection | null>(null);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!roomId) return;
    let current = true;
    setConnection(null);
    onConnection(null);
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const response = await fetch(
          `/api/project-room/ai-status?roomId=${encodeURIComponent(roomId)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (!response.ok) throw Error();
        const result = (await response.json()) as AIConnection;
        if (current) {
          setConnection(result);
          onConnection(result);
          setNotice("");
        }
      } catch {
        if (current) {
          onConnection(null);
          setNotice("暂时无法读取连接配置，请稍后重试。");
        }
      }
    })();
    return () => {
      current = false;
    };
  }, [roomId, open, onConnection]);
  async function testConnection() {
    if (!eventId) return;
    setChecking(true);
    setNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/project-room/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ roomId, eventId }),
      });
      const result = await response.json();
      setNotice(
        response.ok && result.deepProvider && result.deepAnalysis
          ? "连接成功：DeepSeek 已完成一条已保存消息的分析。本次检查未写入项目决议。"
          : result.aiStatus?.deepAnalysisRequested === false
            ? "这条消息无需深度分析。请发送一条需求、报价或交期变更后再检查。"
            : "本次分析未成功，请检查服务端密钥、模型和额度。",
      );
    } catch {
      setNotice("网络连接未完成，请重试。");
    } finally {
      setChecking(false);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.settingsDialog}>
          <Dialog.Title className={styles.dialogTitle}>
            工作空间设置
          </Dialog.Title>
          <Dialog.Description className={styles.muted}>
            AI 连接与数据管理
          </Dialog.Description>
          <Dialog.Close className={styles.closeButton} aria-label="关闭设置">
            <X size={20} />
          </Dialog.Close>
          <div className={styles.connectionCard}>
            <div className={styles.connectionHeading}>
              <KeyRound size={21} />
              <div>
                <b>DeepSeek API</b>
                <p>
                  {connection?.configured
                    ? "服务端密钥已配置"
                    : connection
                      ? "等待配置服务端密钥"
                      : "正在读取配置…"}
                </p>
              </div>
              {connection?.configured && <CheckCircle2 size={20} />}
            </div>
            <dl>
              <dt>Provider</dt>
              <dd>{connection?.provider || "—"}</dd>
              <dt>Model</dt>
              <dd>{connection?.model || "—"}</dd>
              <dt>自动分析</dt>
              <dd>
                {connection?.scope === "automatic"
                  ? "当前聊天室已启用"
                  : connection
                    ? "当前聊天室仅支持手动检查"
                    : "—"}
              </dd>
              <dt>API key</dt>
              <dd>
                {connection?.configured ? "•••••••• · 已安全保存" : "未确认"}
              </dd>
            </dl>
            <p className={styles.securityNote}>
              <ShieldCheck size={17} />
              密钥保存在服务器。更换密钥由部署管理员完成，不向聊天室成员或浏览器公开。
            </p>
            <button
              className={styles.primaryButton}
              disabled={checking || !connection?.configured || !eventId}
              onClick={() => void testConnection()}
            >
              {checking ? (
                <LoaderCircle size={16} className={styles.spinning} />
              ) : (
                <CheckCircle2 size={16} />
              )}{" "}
              {checking ? "检查中…" : "检查真实 AI 连接"}
            </button>
            {!eventId && (
              <p className={styles.muted}>
                先在当前聊天室发送一条消息，再检查连接。
              </p>
            )}
            {notice && (
              <p role="status" className={styles.resultNotice}>
                {notice}
              </p>
            )}
          </div>
          <p className={styles.muted}>
            聊天记录与审批保存在当前项目。AI
            输出先进入待审核区，采纳后才成为已确认决议。
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
