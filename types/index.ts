/** Types mirroring the backend's Pydantic response schemas. */

export type ChatbotStatus = "draft" | "ready" | "published" | "unpublished";

export type CrawlStatus =
  | "pending"
  | "crawling"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed";

export type PageStatus = "scraped" | "duplicate" | "empty" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

export interface ChatbotStats {
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  duplicate_pages: number;
  included_pages: number;
  total_content_characters: number;
  last_scraped_at: string | null;
}

export interface Chatbot {
  id: string;
  public_id: string;
  name: string;
  website_url: string;
  status: ChatbotStatus;
  crawl_status: CrawlStatus;
  site_title: string | null;
  brand_color: string | null;
  favicon_url: string | null;
  created_at: string;
  updated_at: string;
  stats: ChatbotStats;
  embed_url_preview: string | null;
  published_at: string | null;
  unpublished_at: string | null;
  is_published: boolean;
}

export interface ChatbotListResponse {
  chatbots: Chatbot[];
  total: number;
}

export interface CrawlJob {
  id: string;
  chatbot_id: string;
  status: CrawlStatus;
  progress_message: string | null;
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  duplicate_pages: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CrawlStatusResponse {
  chatbot_id: string;
  website_url: string;
  crawl_status: CrawlStatus;
  progress_message: string;
  discovered_pages: number;
  successful_pages: number;
  failed_pages: number;
  duplicate_pages: number;
  stored_pages: number;
  total_content_characters: number;
  is_terminal: boolean;
  error_message: string | null;
  job: CrawlJob | null;
}

export interface WebsitePageSummary {
  id: string;
  url: string;
  title: string | null;
  content_length: number;
  language: string | null;
  is_included: boolean;
  status: PageStatus;
  priority: number;
  error: string | null;
  scraped_at: string | null;
}

export interface WebsitePageDetail extends WebsitePageSummary {
  content: string;
}

export interface WebsitePageListResponse {
  pages: WebsitePageSummary[];
  total: number;
}

/** The backend's standard error envelope. */
export interface ApiErrorBody {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Phase 2 — AI chat                                                   */
/* ------------------------------------------------------------------ */

export type MessageRole = "user" | "assistant";

export type ConversationSource = "playground" | "embed";

/** A citation. `url` always comes from a stored website_pages row. */
export interface SourceReference {
  title: string;
  url: string;
  page_id: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  source_references: SourceReference[];
  input_tokens: number | null;
  output_tokens: number | null;
  error_code: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  session_id: string;
  source: ConversationSource;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessageListResponse {
  conversation_id: string;
  messages: ChatMessage[];
  total: number;
}

/** What retrieval and the token budget actually did. All measured values. */
export interface RetrievalDebug {
  sections_considered: number;
  sections_used: number;
  pages_searched: number;
  knowledge_tokens: number;
  prompt_tokens_estimated: number;
  history_messages_used: number;
  whole_knowledge_base_used: boolean;
  keywords: string[];
  token_estimate_source: string;
}

export interface ChatResponse {
  conversation_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  retrieval: RetrievalDebug | null;
  used_fallback: boolean;
  follow_up_questions?: string[];
}

export interface ChatConfig {
  chatbot_id: string;
  chatbot_name: string;
  website_url: string;
  greeting: string;
  fallback_message: string;
  persona: string;
  response_length: string;
  language: string;
  cite_sources: boolean;
  included_pages: number;
  knowledge_base_ready: boolean;
  ai_ready: boolean;
  model_label: string;
  context_limit: number;
}

/* ------------------------------------------------------------------ */
/* Phase 3 — deployment                                                */
/* ------------------------------------------------------------------ */

export type DeploymentMode = "widget" | "iframe" | "link";

/**
 * Resolved floating-launcher settings, written by the customisation studio.
 *
 * `icon`, `shape`, `position` and the two animations are typed as `string`
 * rather than as unions on purpose: their valid values are served by the
 * backend in `CustomizationOptions`, which is the single source of truth, and
 * a union repeated here would be a second list to keep in step. Every value
 * is validated and clamped server-side before it reaches this shape.
 */
export interface LauncherSettings {
  icon: string;
  icon_url: string | null;
  accent_color: string;
  launcher_size: number;
  shape: string;
  position: string;
  offset_x: number;
  offset_y: number;
  window_width: number;
  window_height: number;
  label: string | null;
  open_animation: string;
  close_animation: string;
  attention_animation: string;
  open_on_load: boolean;
  show_branding: boolean;
}

export interface DeploymentSnippet {
  mode: DeploymentMode;
  label: string;
  description: string;
  url: string;
  code: string | null;
  language: string | null;
  recommended: boolean;
}

export interface PlatformInstruction {
  platform: string;
  steps: string[];
  supports_javascript: boolean;
  note: string | null;
}

export interface DeploymentInfo {
  chatbot_id: string;
  public_id: string;
  chatbot_name: string;
  website_url: string;
  status: ChatbotStatus;
  is_published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  can_publish: boolean;
  publish_blocked_reason: string | null;
  included_pages: number;
  ai_ready: boolean;
  has_unpublished_changes: boolean;
  embed_url: string;
  panel_url: string;
  standalone_url: string;
  script_url: string;
  allowed_domains: string[];
  launcher: LauncherSettings;
  snippets: DeploymentSnippet[];
  platforms: PlatformInstruction[];
}

/**
 * The allowlisted configuration an anonymous visitor's browser receives.
 *
 * Compare with `ChatConfig` above, which is the authenticated playground's
 * view. The persona, custom instructions, fallback wording, model label and
 * token budget are all absent here on purpose — see
 * backend/models/deployment.py.
 */
export interface PublicBotConfig {
  public_id: string;
  chatbot_name: string;
  business_name: string | null;
  greeting: string;
  welcome_message: string | null;
  website_host: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  cite_sources: boolean;
  suggested_questions: string[];
  appearance: ResolvedAppearance;
  launcher: LauncherSettings;
  show_branding: boolean;
  max_message_length: number;
}

export interface VisitorSession {
  token: string;
  expires_at: string;
}

/** How the embed page is being displayed. */
export type EmbedMode = "inline" | "panel" | "full";

/* ------------------------------------------------------------------ */
/* Phase 4 — the customisation studio                                  */
/* ------------------------------------------------------------------ */

export type ThemeMode = "light" | "dark" | "auto";

/**
 * Every colour the chat UI paints with, for one theme.
 *
 * Resolved by the backend from the customer's brand colour plus whatever
 * they overrode, so the frontend never derives a colour itself — the studio
 * preview and the live chatbot get the same eleven values.
 */
export interface Palette {
  primary: string;
  secondary: string;
  header_background: string;
  header_text: string;
  chat_background: string;
  user_bubble: string;
  user_bubble_text: string;
  ai_bubble: string;
  message_text: string;
  border: string;
  muted_text: string;
}

/**
 * Looks, resolved for both themes.
 *
 * Both palettes always arrive. `theme: "auto"` is answered here in the
 * browser from `prefers-color-scheme`, because that is the only place the
 * answer exists.
 */
export interface ResolvedAppearance {
  theme: ThemeMode;
  font: string;
  font_stack: string;
  border_radius: number;
  avatar_url: string | null;
  logo_url: string | null;
  light: Palette;
  dark: Palette;
}

/** Content settings, with every default applied. */
export interface ResolvedContent {
  chatbot_name: string;
  business_name: string | null;
  greeting: string;
  welcome_message: string | null;
  suggested_questions: string[];
  persona: string;
  instructions: string;
  tone: string;
  language: string;
  response_length: string;
  fallback_message: string;
  cite_sources: boolean;
  grounding: string;
}

/** One complete configuration — a draft, or a published snapshot. */
export interface CustomizationState {
  content: ResolvedContent;
  appearance: ResolvedAppearance;
  launcher: LauncherSettings;
}

export interface OptionItem {
  value: string;
  label: string;
  description: string | null;
  /** Fonts: the CSS stack, so a picker can render each name in itself. */
  font_stack: string | null;
  /** Colour presets: the hex value the preset applies. */
  color: string | null;
  /**
   * Launcher icons: the SVG path data from backend/helpers/icons.py — the
   * same string the generated loader writes into the customer's page, so the
   * gallery, the preview and the live website draw one glyph.
   */
  svg_path: string | null;
}

export interface CustomizationLimits {
  max_suggested_questions: number;
  max_suggested_question_characters: number;
  max_persona_characters: number;
  max_instructions_characters: number;
  max_fallback_characters: number;
  max_greeting_characters: number;
  max_welcome_characters: number;
  max_launcher_label_characters: number;
  border_radius_range: [number, number];
  launcher_size_range: [number, number];
  launcher_offset_range: [number, number];
  window_width_range: [number, number];
  window_height_range: [number, number];
  asset_max_bytes: number;
  asset_content_types: string[];
}

/**
 * Every valid choice, served by the backend rather than hardcoded here.
 *
 * This is what stops the studio offering a value the API would reject:
 * there is one list, in `helpers/customization.py`, and the pickers render
 * from it.
 */
export interface CustomizationOptions {
  themes: OptionItem[];
  fonts: OptionItem[];
  tones: OptionItem[];
  languages: OptionItem[];
  response_lengths: OptionItem[];
  grounding_levels: OptionItem[];
  launcher_icons: OptionItem[];
  launcher_positions: OptionItem[];
  launcher_shapes: OptionItem[];
  open_animations: OptionItem[];
  close_animations: OptionItem[];
  attention_animations: OptionItem[];
  color_presets: OptionItem[];
  limits: CustomizationLimits;
}

export interface ChatbotAsset {
  id: string;
  kind: "avatar" | "logo" | "launcher_icon";
  content_type: string;
  byte_size: number;
  created_at: string;
  url: string;
  /** What to store in the configuration to use this image. */
  reference: string;
}

export interface Customization {
  chatbot_id: string;
  public_id: string;
  status: ChatbotStatus;
  is_published: boolean;
  can_publish: boolean;
  publish_blocked_reason: string | null;
  draft: CustomizationState;
  published: CustomizationState | null;
  has_unpublished_changes: boolean;
  /** Setting paths the customer has explicitly chosen, e.g. "appearance.theme". */
  overrides: string[];
  assets: ChatbotAsset[];
  options: CustomizationOptions;
}

/* ---- Request bodies. Every field optional; null clears a setting. ---- */

export interface ColorOverridesInput {
  primary?: string | null;
  secondary?: string | null;
  header_background?: string | null;
  header_text?: string | null;
  chat_background?: string | null;
  user_bubble?: string | null;
  user_bubble_text?: string | null;
  ai_bubble?: string | null;
  message_text?: string | null;
}

export type ColorKey = keyof ColorOverridesInput;

export interface ContentSettingsInput {
  chatbot_name?: string | null;
  business_name?: string | null;
  greeting?: string | null;
  welcome_message?: string | null;
  suggested_questions?: string[] | null;
  persona?: string | null;
  instructions?: string | null;
  tone?: string | null;
  language?: string | null;
  response_length?: string | null;
  fallback_message?: string | null;
  cite_sources?: boolean | null;
  grounding?: string | null;
}

export interface AppearanceSettingsInput {
  theme?: string | null;
  font?: string | null;
  border_radius?: number | null;
  avatar?: string | null;
  logo?: string | null;
  colors?: ColorOverridesInput | null;
}

export interface LauncherSettingsInput {
  icon?: string | null;
  icon_image?: string | null;
  accent_color?: string | null;
  launcher_size?: number | null;
  shape?: string | null;
  position?: string | null;
  offset_x?: number | null;
  offset_y?: number | null;
  window_width?: number | null;
  window_height?: number | null;
  label?: string | null;
  open_animation?: string | null;
  close_animation?: string | null;
  attention_animation?: string | null;
  open_on_load?: boolean | null;
  show_branding?: boolean | null;
}

export interface CustomizationUpdate {
  content?: ContentSettingsInput;
  appearance?: AppearanceSettingsInput;
  launcher?: LauncherSettingsInput;
}

export type ResetScope = "all" | "content" | "appearance" | "launcher";

/**
 * An unsaved configuration, resolved by the backend for the studio.
 *
 * `public_config` is built by the same function that serves a visitor, with
 * the draft instead of the published snapshot — so the studio can hand it
 * straight to the same chat component the embed page renders, and the
 * preview cannot drift from the deployed chatbot by way of a mapping
 * written twice.
 */
export interface ChatbotPreview {
  state: CustomizationState;
  public_config: PublicBotConfig;
  widget_script: string;
  widget_config: Record<string, unknown>;
}

/** Events the streaming chat endpoint emits over SSE. */
export type ChatStreamEvent =
  | {
      type: "start";
      conversation_id: string;
      user_message_id: string;
      retrieval: RetrievalDebug;
    }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: SourceReference[] }
  | {
      type: "done";
      used_fallback: boolean;
      partial?: boolean;
      message: ChatMessage;
      /** Likely next questions, shown as clickable chips. */
      follow_up_questions?: string[];
    }
  | { type: "error"; code: string; message: string; retryable: boolean };
