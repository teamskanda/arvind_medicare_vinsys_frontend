"use client";

import type {
  Chatbot,
  ChatbotAsset,
  ChatbotPreview,
  ChatbotListResponse,
  ChatConfig,
  Customization,
  CustomizationUpdate,
  ChatResponse,
  ChatStreamEvent,
  Conversation,
  ConversationListResponse,
  CrawlJob,
  CrawlStatusResponse,
  DeploymentInfo,
  MessageListResponse,
  ResetScope,
  WebsitePageDetail,
  WebsitePageListResponse,
  WebsitePageSummary,
} from "@/types";

const API_BASE_URL = "/api/backend";

export interface WebsiteScreenshot {
  status: "capturing" | "ready" | "unavailable" | "removed";
  source: "automatic" | "manual" | null;
  image_url: string | null;
  message: string | null;
}

/** An error carrying the backend's customer-readable message. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

/** The shape inside the backend's `{"error": {...}}` envelope. */
type ApiErrorShape = {
  message?: string;
  code?: string;
  retryable?: boolean;
};

// Protected calls use the same-origin proxy; the session token stays HttpOnly.
async function authHeader(): Promise<Record<string, string>> { return {}; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let headers: Record<string, string>;
  try {
    headers = await authHeader();
  } catch (error) {
    throw error;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
  } catch {
    // Network-level failure: the API is not reachable at all.
    throw new ApiError(
      "Could not reach the SKANDA AI server. Check that the backend is running.",
      "network_error",
      0,
      true,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const envelope = parsed as { error?: ApiErrorShape } | null;
    throw new ApiError(
      envelope?.error?.message ?? "Something went wrong. Please try again.",
      envelope?.error?.code ?? "unknown_error",
      response.status,
      envelope?.error?.retryable ?? false,
    );
  }

  return parsed as T;
}

/* ------------------------------------------------------------------ */
/* Chatbots                                                            */
/* ------------------------------------------------------------------ */

export const api = {
  getScreenshot: (id: string) => request<WebsiteScreenshot>(`/api/chatbots/${id}/screenshot`),
  captureScreenshot: (id: string) => request<WebsiteScreenshot>(`/api/chatbots/${id}/screenshot/capture`, { method: "POST" }),
  uploadScreenshot: (id: string, data: string) => request<WebsiteScreenshot>(`/api/chatbots/${id}/screenshot`, { method: "PUT", body: JSON.stringify({ data }) }),
  removeScreenshot: (id: string) => request<WebsiteScreenshot>(`/api/chatbots/${id}/screenshot`, { method: "DELETE" }),
  listChatbots: () => request<ChatbotListResponse>("/api/chatbots"),

  getChatbot: (id: string) => request<Chatbot>(`/api/chatbots/${id}`),

  createChatbot: (websiteUrl: string) =>
    request<Chatbot>("/api/chatbots", {
      method: "POST",
      body: JSON.stringify({ website_url: websiteUrl }),
    }),

  renameChatbot: (id: string, name: string) =>
    request<Chatbot>(`/api/chatbots/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  deleteChatbot: (id: string) =>
    request<void>(`/api/chatbots/${id}`, { method: "DELETE" }),

  /* Crawling */
  getCrawlStatus: (id: string) =>
    request<CrawlStatusResponse>(`/api/chatbots/${id}/crawl/status`),

  startCrawl: (id: string) =>
    request<CrawlJob>(`/api/chatbots/${id}/crawl`, { method: "POST" }),

  retryCrawl: (id: string) =>
    request<CrawlJob>(`/api/chatbots/${id}/crawl/retry`, { method: "POST" }),

  /* Knowledge base */
  listPages: (id: string) =>
    request<WebsitePageListResponse>(`/api/chatbots/${id}/pages`),

  getPage: (chatbotId: string, pageId: string) =>
    request<WebsitePageDetail>(`/api/chatbots/${chatbotId}/pages/${pageId}`),

  setPageIncluded: (chatbotId: string, pageId: string, isIncluded: boolean) =>
    request<WebsitePageSummary>(`/api/chatbots/${chatbotId}/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_included: isIncluded }),
    }),

  /* Chat (Phase 2) */
  getChatConfig: (id: string) =>
    request<ChatConfig>(`/api/chatbots/${id}/chat/config`),

  createConversation: (id: string, sessionId?: string) =>
    request<Conversation>(`/api/chatbots/${id}/conversations`, {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId ?? null }),
    }),

  listConversations: (id: string) =>
    request<ConversationListResponse>(`/api/chatbots/${id}/conversations`),

  listMessages: (chatbotId: string, conversationId: string) =>
    request<MessageListResponse>(
      `/api/chatbots/${chatbotId}/conversations/${conversationId}/messages`,
    ),

  sendMessage: (
    chatbotId: string,
    message: string,
    conversationId?: string | null,
  ) =>
    request<ChatResponse>(`/api/chatbots/${chatbotId}/chat`, {
      method: "POST",
      body: JSON.stringify({
        message,
        conversation_id: conversationId ?? null,
      }),
    }),

  /* Deployment (Phase 3) */
  getDeployment: (id: string) =>
    request<DeploymentInfo>(`/api/chatbots/${id}/deployment`),

  publishChatbot: (id: string, allowedDomains?: string[]) =>
    request<DeploymentInfo>(`/api/chatbots/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ allowed_domains: allowedDomains ?? null }),
    }),

  unpublishChatbot: (id: string) =>
    request<DeploymentInfo>(`/api/chatbots/${id}/unpublish`, { method: "POST" }),

  /* Customisation studio (Phase 4) */
  getCustomization: (id: string) =>
    request<Customization>(`/api/chatbots/${id}/customization`),

  /**
   * Save the draft. Only the groups present in `update` are written, and
   * within a group only the keys present — an explicit `null` clears one
   * setting back to its default. Nothing here changes the live chatbot;
   * that needs `publishChatbot`.
   */
  saveCustomization: (id: string, update: CustomizationUpdate) =>
    request<Customization>(`/api/chatbots/${id}/customization`, {
      method: "PUT",
      body: JSON.stringify(update),
    }),

  /**
   * Resolve an unsaved configuration for the studio's preview.
   *
   * Read-only. It exists so the preview's colours are derived by the
   * backend's resolver rather than by a second copy of the palette
   * arithmetic here, which would eventually disagree with the live chatbot.
   */
  previewCustomization: (id: string, update: CustomizationUpdate) =>
    request<ChatbotPreview>(`/api/chatbots/${id}/customization/preview`, {
      method: "POST",
      body: JSON.stringify(update),
    }),

  resetCustomization: (id: string, scope: ResetScope = "all") =>
    request<Customization>(
      `/api/chatbots/${id}/customization/reset?scope=${scope}`,
      { method: "POST" },
    ),

  /**
   * Upload an avatar, logo or launcher icon.
   *
   * `data` is the data URL `FileReader` produces. The declared type is
   * ignored by the backend, which identifies the image from its own bytes.
   */
  uploadAsset: (id: string, kind: ChatbotAsset["kind"], data: string) =>
    request<ChatbotAsset>(`/api/chatbots/${id}/assets`, {
      method: "POST",
      body: JSON.stringify({ kind, data }),
    }),

  deleteAsset: (chatbotId: string, assetId: string) =>
    request<void>(`/api/chatbots/${chatbotId}/assets/${assetId}`, {
      method: "DELETE",
    }),
};

/**
 * Stream a chat reply over SSE.
 *
 * Uses `fetch` rather than `EventSource` because the request must carry the
 * server-held session token and a POST body, neither of which EventSource
 * supports. `onEvent` is called for every parsed event in arrival order.
 *
 * Errors arriving *inside* the stream are delivered as `error` events, not
 * thrown: by then the response is already a 200 and the UI may have rendered
 * part of an answer. Only a failure to open the stream throws.
 */
export async function streamMessage(
  chatbotId: string,
  message: string,
  conversationId: string | null,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
  customization?: CustomizationUpdate,
): Promise<void> {
  const headers = await authHeader();

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/chatbots/${chatbotId}/${customization ? "customization/chat" : "chat"}?stream=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          message,
          conversation_id: conversationId ?? null,
          ...(customization ? { customization } : {}),
        }),
        cache: "no-store",
        signal,
      },
    );
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    throw new ApiError(
      "Could not reach the SKANDA AI server. Check that the backend is running.",
      "network_error",
      0,
      true,
    );
  }

  // A failure before the stream opens still uses the normal error envelope.
  if (!response.ok) {
    const text = await response.text();
    let envelope: { error?: ApiErrorShape } | null = null;
    try {
      envelope = JSON.parse(text);
    } catch {
      envelope = null;
    }
    throw new ApiError(
      envelope?.error?.message ?? "The AI assistant could not be reached.",
      envelope?.error?.code ?? "unknown_error",
      response.status,
      envelope?.error?.retryable ?? false,
    );
  }

  if (!response.body) {
    throw new ApiError(
      "Your browser could not read the streamed reply.",
      "stream_unsupported",
      0,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. A frame may arrive split
      // across chunks, so only complete frames are consumed.
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf("\n\n");

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            onEvent(JSON.parse(data) as ChatStreamEvent);
          } catch {
            // A malformed frame is skipped rather than killing the stream.
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    onEvent({
      type: "error",
      code: "stream_interrupted",
      message: "The reply was cut off. Please try again.",
      retryable: true,
    });
  } finally {
    reader.releaseLock();
  }
}
