"use client";

import {
  CheckCircle2,
  Loader2,
  Palette as PaletteIcon,
  Power,
  RotateCcw,
  Save,
  Sparkles,
  SquareUser,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { StudioPreview } from "@/components/studio/StudioPreview";
import {
  ColorControl,
  IconGallery,
  ImageControl,
  OptionCards,
  Panel,
  QuestionListControl,
  SegmentedControl,
  SelectControl,
  SliderControl,
  TextAreaControl,
  TextControl,
  ToggleControl,
} from "@/components/studio/controls";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AppearanceSettingsInput,
  Chatbot,
  ChatbotAsset,
  ChatbotPreview,
  ColorKey,
  ColorOverridesInput,
  ContentSettingsInput,
  Customization,
  CustomizationUpdate,
  LauncherSettingsInput,
} from "@/types";

/**
 * The customisation studio.
 *
 * Three pieces of state, and the distinction between them is the whole design:
 *
 *   `saved`   — what the server has. Arrives from GET and is replaced by the
 *               response to every save, so it is never guessed at.
 *   `pending` — the customer's unsaved edits, as a partial update. Only the
 *               keys they actually touched, which is what lets a derived
 *               colour stay derived instead of being frozen into the document
 *               the first time anything is saved.
 *   `preview` — the resolved result of `saved + pending`, from the backend.
 *
 * Why `preview` is a server round-trip rather than local arithmetic: deriving
 * a palette from one brand colour means blending, contrast decisions and two
 * themes, and a second copy of that in TypeScript would drift from the one in
 * `helpers/customization.py`. The first symptom of the drift would be a
 * customer designing against a preview that does not match their live
 * chatbot — the one failure this feature cannot have. So the preview asks the
 * same resolver, debounced, and the controls show the pending value
 * immediately so typing never feels laggy.
 *
 * Nothing here publishes implicitly. Saving a draft changes the studio and
 * the playground; the live chatbot changes only when the customer presses
 * Publish, and the header says which of those states they are in.
 */

type Section = "identity" | "appearance" | "launcher" | "personality";

const SECTIONS: { id: Section; label: string; icon: typeof SquareUser }[] = [
  { id: "identity", label: "Identity", icon: SquareUser },
  { id: "appearance", label: "Appearance", icon: PaletteIcon },
  { id: "launcher", label: "Launcher", icon: Sparkles },
  { id: "personality", label: "Personality", icon: Wand2 },
];

/** How long to wait after a change before asking the backend to resolve it. */
const PREVIEW_DEBOUNCE_MS = 260;

/**
 * Drop the keys the customer cleared, so the resolved default shows instead.
 *
 * A `null` in a pending update means "clear this setting", and the value to
 * show for a cleared setting is whatever the backend resolves it to — which
 * arrives in the next preview. Removing nulls here is also what lets the
 * result be spread over the resolved state without widening every field to
 * include `null`.
 */
function defined<T extends object>(
  partial: T | undefined,
): { [K in keyof T]?: Exclude<T[K], null | undefined> } {
  if (!partial) return {};
  return Object.fromEntries(
    Object.entries(partial).filter(([, value]) => value !== null && value !== undefined),
  ) as { [K in keyof T]?: Exclude<T[K], null | undefined> };
}

function hasEdits(update: CustomizationUpdate): boolean {
  return [update.content, update.appearance, update.launcher].some(
    (group) => group && Object.keys(group).length > 0,
  );
}

export function CustomizationStudio({ chatbot }: { chatbot: Chatbot }) {
  const chatbotId = chatbot.id;

  const [saved, setSaved] = useState<Customization | null>(null);
  const [preview, setPreview] = useState<ChatbotPreview | null>(null);
  const [pending, setPending] = useState<CustomizationUpdate>({});
  const [section, setSection] = useState<Section>("identity");

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [uploading, setUploading] = useState<ChatbotAsset["kind"] | null>(null);

  const dirty = hasEdits(pending);

  /* ---------------------------------------------------------------- */
  /* Loading and resolving                                            */
  /* ---------------------------------------------------------------- */

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [customization, resolved] = await Promise.all([
        api.getCustomization(chatbotId),
        api.previewCustomization(chatbotId, {}),
      ]);
      setSaved(customization);
      setPreview(resolved);
      setPending({});
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Could not load the customisation settings.",
      );
    }
  }, [chatbotId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resolve the pending edits, debounced. The latest request wins: a slow
  // response for an older keystroke must not overwrite a newer preview.
  const requestRef = useRef(0);
  useEffect(() => {
    if (!saved) return;
    if (!dirty) {
      requestRef.current++;
      // Saving or discarding sets the preview directly, so any request this
      // effect had queued is moot — and the "updating" indicator must not be
      // left spinning for it.
      setResolving(false);
      return;
    }

    const token = ++requestRef.current;
    setResolving(true);
    const timer = setTimeout(async () => {
      try {
        const resolved = await api.previewCustomization(chatbotId, pending);
        if (token === requestRef.current) setPreview(resolved);
      } catch (error) {
        if (token === requestRef.current) {
          setActionError(
            error instanceof ApiError
              ? error.message
              : "Could not update the preview.",
          );
        }
      } finally {
        if (token === requestRef.current) setResolving(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => { clearTimeout(timer); requestRef.current++; };
  }, [chatbotId, pending, dirty, saved]);

  // A browser-level guard, because losing a design to a stray tab close is
  // the kind of thing people do not forgive.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ---------------------------------------------------------------- */
  /* Editing                                                          */
  /* ---------------------------------------------------------------- */

  const patchContent = useCallback((changes: ContentSettingsInput) => {
    setNotice(null);
    setPending((current) => ({
      ...current,
      content: { ...current.content, ...changes },
    }));
  }, []);

  const patchAppearance = useCallback((changes: AppearanceSettingsInput) => {
    setNotice(null);
    setPending((current) => ({
      ...current,
      appearance: { ...current.appearance, ...changes },
    }));
  }, []);

  const patchColors = useCallback((changes: ColorOverridesInput) => {
    setNotice(null);
    setPending((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        colors: { ...current.appearance?.colors, ...changes },
      },
    }));
  }, []);

  const patchLauncher = useCallback((changes: LauncherSettingsInput) => {
    setNotice(null);
    setPending((current) => ({
      ...current,
      launcher: { ...current.launcher, ...changes },
    }));
  }, []);

  /* ---------------------------------------------------------------- */
  /* Saving, resetting, publishing                                    */
  /* ---------------------------------------------------------------- */

  async function onSave() {
    setSaving(true);
    setActionError(null);
    try {
      requestRef.current++;
      const result = await api.saveCustomization(chatbotId, pending);
      setSaved(result);
      setPending({});
      // Refresh both the public contract and widget configuration so saving
      // before the debounce completes cannot leave an older preview behind.
      setPreview(await api.previewCustomization(chatbotId, {}));
      setNotice(
        result.is_published
          ? "Draft saved. Publish to apply it to your live assistant."
          : "Draft saved.",
      );
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "Could not save your changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDiscard() {
    requestRef.current++;
    setSaving(true);
    setPending({});
    setActionError(null);
    setNotice(null);
    try {
      setPreview(await api.previewCustomization(chatbotId, {}));
    } catch { setActionError("Could not restore the saved preview. Please retry."); }
    finally { setSaving(false); }
  }

  async function onResetAll() {
    setSaving(true);
    setActionError(null);
    try {
      const result = await api.resetCustomization(chatbotId, "all");
      setSaved(result);
      setPending({});
      setPreview(await api.previewCustomization(chatbotId, {}));
      setNotice(
        "Customisation cleared. Your assistant is back to its website's own name and colours; your uploaded images were kept.",
      );
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "Could not reset the design.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setPublishing(true);
    setActionError(null);
    try {
      requestRef.current++;
      if (dirty) {
        setSaved(await api.saveCustomization(chatbotId, pending));
        setPending({});
      }
      await api.publishChatbot(chatbotId);
      setPending({});
      await load();
      setNotice(
        "Published. Your live assistant is using these settings now — the installed snippet and URL did not change.",
      );
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "Could not publish the changes.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function onUnpublish() {
    setPublishing(true);
    setActionError(null);
    try {
      await api.unpublishChatbot(chatbotId);
      // Preserve unsaved work while refreshing the publication status.
      setSaved(await api.getCustomization(chatbotId));
      setNotice("Unpublished. Your design and installation URL are preserved.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Could not unpublish.");
    } finally { setPublishing(false); }
  }

  async function onUpload(kind: ChatbotAsset["kind"], dataUrl: string) {
    setUploading(kind);
    setActionError(null);
    try {
      const asset = await api.uploadAsset(chatbotId, kind, dataUrl);
      // The configuration stores `asset:<uuid>`, never the bytes or an
      // absolute URL, so moving the API host later changes nothing stored.
      if (kind === "avatar") patchAppearance({ avatar: asset.reference });
      else if (kind === "logo") patchAppearance({ logo: asset.reference });
      else patchLauncher({ icon_image: asset.reference });
      setSaved((current) =>
        current ? { ...current, assets: [asset, ...current.assets] } : current,
      );
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "That image could not be uploaded.",
      );
    } finally {
      setUploading(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loadError) {
    return (
      <Callout
        tone="error"
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        }
      >
        {loadError}
      </Callout>
    );
  }

  if (!saved || !preview) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="h-[520px] animate-pulse rounded-card border border-ink-100 bg-surface" />
        <div className="h-[520px] animate-pulse rounded-card border border-ink-100 bg-surface" />
      </div>
    );
  }

  const options = saved.options;
  const limits = options.limits;
  const state = preview.state;

  // What the controls show: the pending value the instant it is typed,
  // falling back to the resolved value from the backend.
  const content = { ...state.content, ...defined(pending.content) };
  const appearance = { ...state.appearance, ...defined(pending.appearance) };
  const launcher = { ...state.launcher, ...defined(pending.launcher) };
  const palette = state.appearance.light;

  // Paint explicit edits immediately while the backend resolves derived
  // palettes and defaults. No colour arithmetic is duplicated in the UI.
  const explicitColors = defined(pending.appearance?.colors ?? undefined);
  const liveAppearance = {
    ...state.appearance,
    theme: appearance.theme as "light" | "dark" | "auto",
    border_radius: appearance.border_radius,
    font_stack: options.fonts.find((font) => font.value === appearance.font)?.font_stack ?? state.appearance.font_stack,
    light: { ...state.appearance.light, ...explicitColors },
    dark: { ...state.appearance.dark, ...explicitColors },
  };
  const livePreview: ChatbotPreview = {
    ...preview,
    public_config: {
      ...preview.public_config,
      chatbot_name: content.chatbot_name,
      business_name: content.business_name,
      greeting: content.greeting,
      welcome_message: content.welcome_message,
      suggested_questions: content.suggested_questions,
      cite_sources: content.cite_sources,
      appearance: liveAppearance,
    },
    widget_config: {
      ...preview.widget_config,
      name: content.chatbot_name, accent: launcher.accent_color,
      size: launcher.launcher_size, side: launcher.position === "bottom-left" ? "left" : "right",
      dx: launcher.offset_x, dy: launcher.offset_y,
      w: launcher.window_width, h: launcher.window_height,
      wr: appearance.border_radius, label: launcher.label ?? "",
      anim: launcher.open_animation, closeAnim: launcher.close_animation,
      attn: launcher.attention_animation, autoOpen: launcher.open_on_load,
    },
  };

  const isSet = (path: string) => saved.overrides.includes(path);
  const colorValue = (key: ColorKey): string =>
    pending.appearance?.colors?.[key] ?? palette[key as keyof typeof palette];
  const colorIsSet = (key: ColorKey) =>
    pending.appearance?.colors?.[key] != null ||
    isSet(`appearance.colors.${key}`);

  return (
    <div className="studio-shell space-y-5">
      <div className="studio-intro">
        <div><span className="studio-eyebrow">The customization studio</span>
          <h2>Make it unmistakably yours.</h2>
          <p>Shape the look. Find its voice. Bring your assistant to life.</p>
        </div>
        <div className="studio-intro-mark" aria-hidden><Sparkles /></div>
      </div>
      <StudioHeader
        saved={saved}
        dirty={dirty}
        resolving={resolving}
        saving={saving}
        publishing={publishing}
        onSave={onSave}
        onDiscard={onDiscard}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />

      {actionError ? <Callout tone="error">{actionError}</Callout> : null}
      {notice ? <Callout tone="success">{notice}</Callout> : null}
      {saved.publish_blocked_reason ? <Callout tone="warning">{saved.publish_blocked_reason}</Callout> : null}

      <button type="button" className="studio-mobile-preview-link" onClick={() => document.getElementById("studio-live-canvas")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })}><Sparkles className="size-4" />Jump to live preview</button>
      <div className="studio-workspace">
        <fieldset disabled={saving || publishing || uploading !== null} className="min-w-0 space-y-4 disabled:opacity-70">
          <nav
            aria-label="Customisation sections"
            className="flex flex-wrap gap-1 rounded-card border border-ink-100 bg-surface p-1"
          >
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id}
                onClick={() => setSection(id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-all duration-150",
                  section === id
                    ? "gradient-brand text-white shadow-sm"
                    : "text-ink-500 hover:bg-ink-50 hover:text-ink-900",
                )}
              >
                <Icon aria-hidden className="hidden size-3.5 sm:block" />
                {label}
              </button>
            ))}
          </nav>

          {section === "identity" ? (
            <>
              <Panel
                title="Who your assistant is"
                description="The name in the chat header, and the business it answers for. The business name is also given to the AI, so it refers to you correctly."
              >
                <TextControl
                  label="Assistant name"
                  value={content.chatbot_name}
                  maxLength={120}
                  onChange={(value) => patchContent({ chatbot_name: value })}
                  isSet={isSet("content.chatbot_name")}
                  onReset={() => patchContent({ chatbot_name: null })}
                  hint="Shown in the header. Defaults to your website's name."
                />
                <TextControl
                  label="Business name"
                  value={content.business_name ?? ""}
                  maxLength={120}
                  placeholder="e.g. Acme Interiors"
                  onChange={(value) => patchContent({ business_name: value })}
                  isSet={isSet("content.business_name")}
                  onReset={() => patchContent({ business_name: null })}
                  hint="Optional. Use it when the assistant has its own name — “Ask Acme” answering for “Acme Interiors”."
                />
              </Panel>

              <Panel
                title="Avatar and logo"
                description="PNG, JPG, WebP or GIF, up to 256 KB. Your avatar and business logo both appear in the chat header."
              >
                <ImageControl
                  label="Avatar"
                  value={appearance.avatar_url}
                  maxBytes={limits.asset_max_bytes}
                  accept={limits.asset_content_types}
                  busy={uploading === "avatar"}
                  onSelect={(data) => void onUpload("avatar", data)}
                  onClear={() => patchAppearance({ avatar: null })}
                  hint="Defaults to the icon found on your website."
                />
                <ImageControl
                  label="Logo"
                  value={appearance.logo_url}
                  maxBytes={limits.asset_max_bytes}
                  accept={limits.asset_content_types}
                  busy={uploading === "logo"}
                  onSelect={(data) => void onUpload("logo", data)}
                  onClear={() => patchAppearance({ logo: null })}
                />
              </Panel>

              <Panel
                title="What it says first"
                description="The opening message, and the questions a visitor can tap instead of typing."
              >
                <TextAreaControl
                  label="Greeting"
                  value={content.greeting}
                  rows={2}
                  maxLength={limits.max_greeting_characters}
                  onChange={(value) => patchContent({ greeting: value })}
                  isSet={isSet("content.greeting")}
                  onReset={() => patchContent({ greeting: null })}
                  hint="The assistant's first message."
                />
                <TextControl
                  label="Welcome line"
                  value={content.welcome_message ?? ""}
                  maxLength={limits.max_welcome_characters}
                  placeholder="e.g. Ask about our services or opening hours"
                  onChange={(value) => patchContent({ welcome_message: value })}
                  isSet={isSet("content.welcome_message")}
                  onReset={() => patchContent({ welcome_message: null })}
                  hint="Optional guidance shown above the conversation, in small text."
                />
                <QuestionListControl
                  questions={content.suggested_questions}
                  max={limits.max_suggested_questions}
                  maxLength={limits.max_suggested_question_characters}
                  onChange={(questions) =>
                    patchContent({ suggested_questions: questions })
                  }
                />
              </Panel>
            </>
          ) : null}

          {section === "appearance" ? (
            <>
              <Panel
                title="Colour"
                description="Choose your brand colour and everything else follows it. Change any individual colour only if you need to."
              >
                <ColorControl
                  label="Brand colour"
                  value={colorValue("primary")}
                  presets={options.color_presets}
                  onChange={(value) => patchColors({ primary: value })}
                  isSet={colorIsSet("primary")}
                  onReset={() => patchColors({ primary: null })}
                  hint="Used for the header, the send button and the launcher. Taken from your website when you have not chosen one."
                />

                <details className="group rounded-md border border-ink-100 bg-ink-50/60 px-3 py-2">
                  <summary className="cursor-pointer list-none text-[13px] font-medium text-ink-700">
                    Individual colours
                    <span className="ml-1.5 font-normal text-ink-500">
                      — all derived from your brand colour unless you set them
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
                    {(
                      [
                        ["header_background", "Header background"],
                        ["header_text", "Header text"],
                        ["chat_background", "Chat background"],
                        ["user_bubble", "Visitor's bubble"],
                        ["user_bubble_text", "Visitor's text"],
                        ["ai_bubble", "Assistant's bubble"],
                        ["message_text", "Message text"],
                        ["secondary", "Links and chips"],
                      ] as [ColorKey, string][]
                    ).map(([key, label]) => (
                      <ColorControl
                        key={key}
                        label={label}
                        value={colorValue(key)}
                        onChange={(value) => patchColors({ [key]: value })}
                        isSet={colorIsSet(key)}
                        onReset={() => patchColors({ [key]: null })}
                      />
                    ))}
                    <p className="text-[11px] leading-relaxed text-ink-500">
                      Dark-mode colours are derived from these, so a colour you
                      set here applies in both themes. Header and bubble text
                      are chosen for contrast against their background unless
                      you override them.
                    </p>
                  </div>
                </details>
              </Panel>

              <Panel title="Theme and type">
                <SegmentedControl
                  label="Theme"
                  options={options.themes}
                  value={appearance.theme}
                  onChange={(value) => patchAppearance({ theme: value })}
                  isSet={isSet("appearance.theme")}
                  onReset={() => patchAppearance({ theme: null })}
                  hint="“Match the visitor's device” follows their system setting, light or dark."
                />
                <OptionCards
                  label="Font"
                  options={options.fonts}
                  value={appearance.font}
                  onChange={(value) => patchAppearance({ font: value })}
                  isSet={isSet("appearance.font")}
                  onReset={() => patchAppearance({ font: null })}
                  renderPreview={(option) => (
                    <span
                      className="text-sm text-ink-700"
                      style={{ fontFamily: option.font_stack ?? undefined }}
                    >
                      Hello — how can we help?
                    </span>
                  )}
                  hint="All already on your visitors' devices or served by us — your website never calls Google Fonts."
                />
                <SliderControl
                  label="Corner roundness"
                  value={appearance.border_radius}
                  min={limits.border_radius_range[0]}
                  max={limits.border_radius_range[1]}
                  onChange={(value) => patchAppearance({ border_radius: value })}
                  isSet={isSet("appearance.border_radius")}
                  onReset={() => patchAppearance({ border_radius: null })}
                />
              </Panel>

              <Panel
                title="Chat window size"
                description="Used by the floating widget on desktop. On phones the chat always fills the screen, and the inline iframe is sized by your own page."
              >
                <SliderControl
                  label="Width"
                  value={launcher.window_width}
                  min={limits.window_width_range[0]}
                  max={limits.window_width_range[1]}
                  step={10}
                  onChange={(value) => patchLauncher({ window_width: value })}
                  isSet={isSet("launcher.window_width")}
                  onReset={() => patchLauncher({ window_width: null })}
                />
                <SliderControl
                  label="Height"
                  value={launcher.window_height}
                  min={limits.window_height_range[0]}
                  max={limits.window_height_range[1]}
                  step={10}
                  onChange={(value) => patchLauncher({ window_height: value })}
                  isSet={isSet("launcher.window_height")}
                  onReset={() => patchLauncher({ window_height: null })}
                />
              </Panel>
            </>
          ) : null}

          {section === "launcher" ? (
            <>
              <Panel
                title="The button"
                description="The bubble in the corner of your website. Visitors tap it to open the chat."
              >
                <IconGallery
                  label="Icon"
                  options={options.launcher_icons}
                  value={launcher.icon}
                  accent={launcher.accent_color}
                  customImage={launcher.icon_url}
                  onChange={(value) => patchLauncher({ icon: value, icon_image: null })}
                  onClearCustom={() => patchLauncher({ icon_image: null })}
                />
                <ImageControl
                  label="Or upload your own icon"
                  value={launcher.icon_url}
                  maxBytes={limits.asset_max_bytes}
                  accept={limits.asset_content_types}
                  busy={uploading === "launcher_icon"}
                  onSelect={(data) => void onUpload("launcher_icon", data)}
                  onClear={() => patchLauncher({ icon_image: null })}
                  hint="A square image works best. It replaces the icon above."
                />
                <ColorControl
                  label="Button colour"
                  value={launcher.accent_color}
                  presets={options.color_presets}
                  onChange={(value) => patchLauncher({ accent_color: value })}
                  isSet={isSet("launcher.accent_color")}
                  onReset={() => patchLauncher({ accent_color: null })}
                  hint="Follows your brand colour until you change it here."
                />
                <SegmentedControl
                  label="Shape"
                  options={options.launcher_shapes}
                  value={launcher.shape}
                  onChange={(value) => patchLauncher({ shape: value })}
                  isSet={isSet("launcher.shape")}
                  onReset={() => patchLauncher({ shape: null })}
                />
                <SliderControl
                  label="Size"
                  value={launcher.launcher_size}
                  min={limits.launcher_size_range[0]}
                  max={limits.launcher_size_range[1]}
                  onChange={(value) => patchLauncher({ launcher_size: value })}
                  isSet={isSet("launcher.launcher_size")}
                  onReset={() => patchLauncher({ launcher_size: null })}
                />
                <TextControl
                  label="Button text"
                  value={launcher.label ?? ""}
                  maxLength={limits.max_launcher_label_characters}
                  placeholder="e.g. Chat with us"
                  onChange={(value) => patchLauncher({ label: value })}
                  isSet={isSet("launcher.label")}
                  onReset={() => patchLauncher({ label: null })}
                  hint="Optional. Turns the bubble into a labelled pill, which gets noticed more."
                />
              </Panel>

              <Panel title="Where it sits">
                <SegmentedControl
                  label="Position"
                  options={options.launcher_positions}
                  value={launcher.position}
                  onChange={(value) => patchLauncher({ position: value })}
                  isSet={isSet("launcher.position")}
                  onReset={() => patchLauncher({ position: null })}
                />
                <SliderControl
                  label="Distance from the side"
                  value={launcher.offset_x}
                  min={limits.launcher_offset_range[0]}
                  max={80}
                  onChange={(value) => patchLauncher({ offset_x: value })}
                  isSet={isSet("launcher.offset_x")}
                  onReset={() => patchLauncher({ offset_x: null })}
                />
                <SliderControl
                  label="Distance from the bottom"
                  value={launcher.offset_y}
                  min={limits.launcher_offset_range[0]}
                  max={80}
                  onChange={(value) => patchLauncher({ offset_y: value })}
                  isSet={isSet("launcher.offset_y")}
                  onReset={() => patchLauncher({ offset_y: null })}
                  hint="Raise it if your website already has something in that corner."
                />
              </Panel>

              <Panel
                title="Movement"
                description="Visitors who ask their device for less motion see none of these."
              >
                <SegmentedControl
                  label="Opening"
                  options={options.open_animations}
                  value={launcher.open_animation}
                  onChange={(value) => patchLauncher({ open_animation: value })}
                  isSet={isSet("launcher.open_animation")}
                  onReset={() => patchLauncher({ open_animation: null })}
                />
                <SegmentedControl
                  label="Attention"
                  options={options.attention_animations}
                  value={launcher.attention_animation}
                  onChange={(value) =>
                    patchLauncher({ attention_animation: value })
                  }
                  isSet={isSet("launcher.attention_animation")}
                  onReset={() => patchLauncher({ attention_animation: null })}
                  hint="Runs while the chat is closed. Off by default — an animation that never stops gets tuned out."
                />
                <SegmentedControl
                  label="Closing"
                  options={options.close_animations}
                  value={launcher.close_animation}
                  onChange={(value) => patchLauncher({ close_animation: value })}
                  isSet={isSet("launcher.close_animation")}
                  onReset={() => patchLauncher({ close_animation: null })}
                />
                <ToggleControl
                  label="Open automatically"
                  description="The chat opens by itself when someone arrives. Effective, and some visitors find it intrusive."
                  checked={launcher.open_on_load}
                  onChange={(value) => patchLauncher({ open_on_load: value })}
                />
                <ToggleControl
                  label="Show “Powered by SKANDA AI”"
                  checked={launcher.show_branding}
                  onChange={(value) => patchLauncher({ show_branding: value })}
                />
              </Panel>
            </>
          ) : null}

          {section === "personality" ? (
            <>
              <Panel
                title="How it speaks"
                description="These go straight into the instructions the AI follows, so a change here changes the answers."
              >
                <OptionCards
                  label="Tone"
                  options={options.tones}
                  value={content.tone}
                  onChange={(value) => patchContent({ tone: value })}
                  isSet={isSet("content.tone")}
                  onReset={() => patchContent({ tone: null })}
                />
                <TextAreaControl
                  label="Persona"
                  value={content.persona}
                  rows={2}
                  maxLength={limits.max_persona_characters}
                  onChange={(value) => patchContent({ persona: value })}
                  isSet={isSet("content.persona")}
                  onReset={() => patchContent({ persona: null })}
                  hint="Who the assistant is, in a few words. Your tone choice fills this in until you write your own."
                />
                <TextAreaControl
                  label="Instructions"
                  value={content.instructions}
                  rows={4}
                  maxLength={limits.max_instructions_characters}
                  onChange={(value) => patchContent({ instructions: value })}
                  isSet={isSet("content.instructions")}
                  onReset={() => patchContent({ instructions: null })}
                  hint="Anything specific it should do — mention the showroom, always offer a callback, never quote prices."
                />
              </Panel>

              <Panel title="Answers">
                <SelectControl
                  label="Language"
                  options={options.languages}
                  value={content.language}
                  onChange={(value) => patchContent({ language: value })}
                  isSet={isSet("content.language")}
                  onReset={() => patchContent({ language: null })}
                  hint="“Match the visitor's language” replies in whatever language the question was asked in."
                />
                <SegmentedControl
                  label="Length"
                  options={options.response_lengths}
                  value={content.response_length}
                  onChange={(value) => patchContent({ response_length: value })}
                  isSet={isSet("content.response_length")}
                  onReset={() => patchContent({ response_length: null })}
                />
                <OptionCards
                  label="How closely it sticks to your website"
                  options={options.grounding_levels}
                  value={content.grounding}
                  onChange={(value) => patchContent({ grounding: value })}
                  isSet={isSet("content.grounding")}
                  onReset={() => patchContent({ grounding: null })}
                />
                <TextAreaControl
                  label="When it does not know"
                  value={content.fallback_message}
                  rows={2}
                  maxLength={limits.max_fallback_characters}
                  onChange={(value) => patchContent({ fallback_message: value })}
                  isSet={isSet("content.fallback_message")}
                  onReset={() => patchContent({ fallback_message: null })}
                  hint="Used word for word when your website does not answer the question. Put your phone number or email here."
                />
                <ToggleControl
                  label="Show which pages an answer came from"
                  description="Links to the pages the answer was built from. They are always real pages of your site — the AI cannot invent one."
                  checked={content.cite_sources}
                  onChange={(value) => patchContent({ cite_sources: value })}
                />
              </Panel>
            </>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-100 bg-surface px-4 py-3">
            <p className="max-w-prose text-[11px] leading-relaxed text-ink-500">
              Resetting clears everything you have customised and returns the
              chatbot to your website's own name, colour and icon. Your
              uploaded images are kept.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void onResetAll()}
              disabled={saving || publishing}
              icon={<RotateCcw aria-hidden className="size-3.5" />}
            >
              Reset all customisation
            </Button>
          </div>
        </fieldset>

        <div id="studio-live-canvas" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <StudioPreview
            chatbotId={chatbotId}
            preview={livePreview}
            pending={pending}
            websiteUrl={chatbot.website_url}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

/**
 * Status and the three actions.
 *
 * The status line distinguishes the two ways a customer can be out of date,
 * because the fix is different: unsaved edits need Save, and a saved draft
 * that differs from the published snapshot needs Publish. Collapsing them
 * into one "unsaved" chip is how people end up wondering why their live
 * chatbot has not changed.
 */
function StudioHeader({
  saved,
  dirty,
  resolving,
  saving,
  publishing,
  onSave,
  onDiscard,
  onPublish,
  onUnpublish,
}: {
  saved: Customization;
  dirty: boolean;
  resolving: boolean;
  saving: boolean;
  publishing: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const unpublished = saved.has_unpublished_changes;

  const status = dirty
    ? { tone: "warning" as const, text: "Unsaved changes" }
    : unpublished
      ? { tone: "warning" as const, text: "Saved — not published yet" }
      : saved.is_published
        ? { tone: "live" as const, text: "Published and live" }
        : { tone: "idle" as const, text: "Draft" };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-100 bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            status.tone === "live"
              ? "bg-success-700"
              : status.tone === "warning"
                ? "bg-warning-700"
                : "bg-ink-300",
          )}
        />
        <span className="text-sm font-medium text-ink-900">{status.text}</span>
        {resolving ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
            <Loader2 aria-hidden className="size-3 animate-spin" />
            updating preview
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {saved.is_published && (
          <Button variant="ghost" size="sm" onClick={onUnpublish} disabled={saving || publishing}
            icon={<Power className="size-3.5" />}>Unpublish</Button>
        )}
        {dirty ? (
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving || publishing}>
            Discard changes
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          loading={saving}
          disabled={!dirty || publishing}
          icon={<Save aria-hidden className="size-3.5" />}
        >
          Save draft
        </Button>
        <Button
          size="sm"
          onClick={onPublish}
          loading={publishing}
          // Only pointless in one case: already live, with nothing waiting to
          // be applied. A chatbot that has never been published can always be
          // published, customised or not.
          disabled={saving || !saved.can_publish || (saved.is_published && !dirty && !unpublished)}
          icon={<CheckCircle2 aria-hidden className="size-3.5" />}
        >
          {saved.is_published ? "Publish changes" : "Publish assistant"}
        </Button>
      </div>
    </div>
  );
}
