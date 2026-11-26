"use client";

import { Camera, ImagePlus, Loader2, Maximize2, Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PublicChat } from "@/components/embed/PublicChat";
import { playgroundTransport } from "@/lib/chatTransport";
import { cn, prettyUrl } from "@/lib/utils";
import { api, type WebsiteScreenshot } from "@/lib/api";
import type { ChatbotPreview, CustomizationUpdate } from "@/types";

interface WidgetController {
  open(): void;
  close(): void;
  update(config: Record<string, unknown>): void;
}
type WidgetWindow = Window & { __skandaAI?: WidgetController };

/** The deployed loader runs in a real, isolated viewport. The same PublicChat
 * component is portalled into its iframe, using authenticated unsaved settings.
 */
export function StudioPreview({ chatbotId, preview, pending, websiteUrl }: {
  chatbotId: string; preview: ChatbotPreview; pending: CustomizationUpdate; websiteUrl: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [expanded, setExpanded] = useState(false);
  const [backdrop, setBackdrop] = useState<WebsiteScreenshot | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const screenshot = backdrop?.image_url ? `/api/backend${backdrop.image_url}` : null;
  const [imageError, setImageError] = useState<string | null>(null);
  const [chatRoot, setChatRoot] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef(preview);
  const pendingRef = useRef(pending);
  const observerRef = useRef<MutationObserver | null>(null);
  previewRef.current = preview;
  pendingRef.current = pending;
  const transport = useMemo(() => playgroundTransport(chatbotId, () => pendingRef.current), [chatbotId]);
  const width = device === "mobile" ? 360 : 820;
  const height = device === "mobile" ? 680 : 740;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const next = await api.getScreenshot(chatbotId);
        if (!active) return;
        setBackdrop(next);
        if (next.status === "capturing") timer = setTimeout(load, 4000);
      } catch { if (active) setImageError("The saved backdrop could not be loaded. You can still use the preview."); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [chatbotId, backdrop?.status === "capturing"]);

  async function updateBackdrop(action: () => Promise<WebsiteScreenshot>) {
    setImageBusy(true); setImageError(null);
    try { setBackdrop(await action()); }
    catch (error) { setImageError(error instanceof Error ? error.message : "The screenshot could not be saved."); }
    finally { setImageBusy(false); }
  }

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const resize = () => setScale(Math.min(1, surface.clientWidth / width));
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();
    return () => observer.disconnect();
  }, [width, expanded]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mountRuntime = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    const win = frame.contentWindow as WidgetWindow;
    if (win.__skandaAI) return;
    doc.body.style.cssText = "margin:0;background:#edf0f5;overflow:hidden;font-family:system-ui,sans-serif";
    const backdrop = doc.createElement("div");
    backdrop.id = "website-backdrop";
    backdrop.style.cssText = "position:absolute;inset:0;background-size:cover;background-position:top center";
    // Static, neutral spatial context, not a claimed capture of the website.
    backdrop.innerHTML = '<div style="padding:40px;opacity:.45"><div style="height:26px;width:150px;background:#b5c0d0;border-radius:8px"></div><div style="height:160px;margin-top:45px;background:#cbd3df;border-radius:20px"></div><div style="height:18px;width:65%;margin-top:28px;background:#cbd3df;border-radius:6px"></div><div style="height:18px;width:85%;margin-top:14px;background:#cbd3df;border-radius:6px"></div></div>';
    doc.body.appendChild(backdrop);
    function attachChat() {
      const child = doc!.querySelector<HTMLIFrameElement>(".skanda-ai-widget iframe");
      if (!child) return;
      if (child.dataset.studioObserved) return;
      child.dataset.studioObserved = "true";
      const attach = () => {
        const inner = child.contentDocument;
        if (!inner || inner.getElementById("studio-chat-root")) return;
        inner.documentElement.className = document.documentElement.className;
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((style) => inner.head.appendChild(style.cloneNode(true)));
        const sizing = inner.createElement("style");
        sizing.textContent = "html,body,#studio-chat-root{height:100%;min-height:0;margin:0;overflow:hidden}";
        inner.head.appendChild(sizing);
        const root = inner.createElement("div");
        root.id = "studio-chat-root";
        inner.body.appendChild(root);
        setChatRoot(root);
      };
      child.addEventListener("load", attach, { once: true });
      attach();
    }
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(attachChat);
    observerRef.current.observe(doc.body, { childList: true, subtree: true });
    const script = doc.createElement("script");
    // Backend-generated code: customer strings are JSON-escaped in the loader.
    script.textContent = previewRef.current.widget_script;
    doc.body.appendChild(script);
    attachChat();
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);
  useEffect(() => {
    (frameRef.current?.contentWindow as WidgetWindow | null)?.__skandaAI?.update(preview.widget_config);
  }, [preview.widget_config]);
  useEffect(() => {
    const backdrop = frameRef.current?.contentDocument?.getElementById("website-backdrop");
    if (!backdrop) return;
    backdrop.style.backgroundImage = screenshot ? `url("${screenshot}")` : "none";
    const skeleton = backdrop.firstElementChild as HTMLElement | null;
    if (skeleton) skeleton.style.display = screenshot ? "none" : "block";
  }, [screenshot, chatRoot]);

  function selectScreenshot(file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setImageError("Choose a PNG, JPG or WebP screenshot under 5 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => { void updateBackdrop(() => api.uploadScreenshot(chatbotId, String(reader.result))); };
    reader.onerror = () => setImageError("The screenshot could not be read.");
    reader.readAsDataURL(file);
  }

  return (
    <section className={cn("studio-preview", expanded && "studio-preview-expanded")} aria-label="Interactive assistant preview">
      <header className="studio-preview-toolbar">
        <div><span className="studio-eyebrow">Your assistant, in the wild</span><h3 className="font-semibold text-ink-900">Live canvas</h3></div>
        <div className="flex items-center gap-1">
          {([{ value: "desktop", Icon: Monitor }, { value: "mobile", Icon: Smartphone }] as const).map(({ value, Icon }) => (
            <button key={value} type="button" aria-label={`${value} preview`} aria-pressed={device === value}
              className={cn("studio-tool", device === value && "studio-tool-active")} onClick={() => setDevice(value)}><Icon className="size-4" /></button>
          ))}
          <button type="button" className="studio-tool" aria-label={expanded ? "Exit expanded preview" : "Expand preview"}
            onClick={() => setExpanded((value) => !value)}>{expanded ? <X className="size-4" /> : <Maximize2 className="size-4" />}</button>
        </div>
      </header>
      <div className="studio-browser-bar"><span className="studio-browser-dots" /><span>{prettyUrl(websiteUrl, 42)}</span><span className="ml-auto text-ink-500">{device === "desktop" ? "Desktop" : "Mobile"}</span></div>
      <div ref={surfaceRef} className="studio-canvas-surface" style={{ height: height * scale }}>
        <iframe ref={frameRef} title="Actual floating widget preview" onLoad={mountRuntime}
          srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
          className="absolute left-1/2 top-0 border-0"
          style={{ width, height, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }} />
      </div>
      {chatRoot && createPortal(<PublicChat config={preview.public_config} mode="panel" transport={transport}
        onClose={() => (frameRef.current?.contentWindow as WidgetWindow)?.__skandaAI?.close()} />, chatRoot)}
      <footer className="studio-preview-footer">
        <p>Click the launcher. Ask a real question. Your unsaved personality settings apply here.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="studio-tool-label" onClick={() => (frameRef.current?.contentWindow as WidgetWindow)?.__skandaAI?.open()}>Open assistant</button>
          <button type="button" className="studio-tool-label" disabled={imageBusy} onClick={() => inputRef.current?.click()}><ImagePlus className="size-3.5" />{imageBusy ? "Saving screenshot…" : screenshot ? "Replace screenshot" : "Upload screenshot"}</button>
          {screenshot && <button type="button" className="studio-tool-label" disabled={imageBusy} onClick={() => void updateBackdrop(() => api.removeScreenshot(chatbotId))}><RotateCcw className="size-3.5" />Clear backdrop</button>}
          {!screenshot && backdrop?.status !== "capturing" && <button type="button" className="studio-tool-label" disabled={imageBusy} onClick={() => void updateBackdrop(() => api.captureScreenshot(chatbotId))}><Camera className="size-3.5" />Capture homepage</button>}
          {backdrop?.status === "capturing" && <span role="status" className="inline-flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Capturing homepage…</span>}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose a website screenshot"
            onChange={(event) => { selectScreenshot(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {imageError && <p role="alert" className="text-danger-700">{imageError}</p>}
        <p className="text-ink-500">{screenshot ? `${backdrop?.source === "automatic" ? "Homepage captured automatically" : "Your uploaded screenshot"}. Saved with this assistant.` : backdrop?.message ?? "A neutral backdrop while your homepage screenshot loads."}</p>
      </footer>
    </section>
  );
}
