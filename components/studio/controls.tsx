"use client";

import { Check, RotateCcw, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { OptionItem } from "@/types";

/**
 * The studio's control vocabulary.
 *
 * Every control here is driven by values the backend serves
 * (`CustomizationOptions`), so the studio cannot offer a choice the API would
 * refuse. Each one also takes an `onReset` when the setting it edits is
 * currently derived rather than chosen — that is what lets a customer undo
 * one colour without resetting their whole design.
 *
 * Two deliberate restraints:
 *
 *   * Native inputs where a native input is better. `<input type="color">` is
 *     the operating system's own picker: it has an eyedropper, recent colours
 *     and full keyboard support that a hand-rolled wheel would not.
 *   * Motion is used to show change, not to decorate. Controls animate on
 *     state change and nothing animates on a timer; `prefers-reduced-motion`
 *     is honoured globally in app/globals.css.
 */

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-ink-100 bg-surface">
      <header className="border-b border-ink-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </section>
  );
}

export function Control({
  label,
  hint,
  htmlFor,
  isSet = false,
  onReset,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  /** True when the customer has chosen this value rather than inherited it. */
  isSet?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-ink-900"
        >
          {label}
        </label>
        {isSet && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-ink-500 underline-offset-2 transition-colors hover:text-burgundy-700 hover:underline"
          >
            <RotateCcw aria-hidden className="size-2.5" />
            Use the default
          </button>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-ink-500">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text                                                               */
/* ------------------------------------------------------------------ */

const FIELD_CLASS =
  "block w-full rounded-md border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 " +
  "placeholder:text-ink-300 transition-colors hover:border-ink-300 focus:border-burgundy-600 focus:outline-none";

export function TextControl({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  isSet,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  isSet?: boolean;
  onReset?: () => void;
}) {
  const id = useId();
  return (
    <Control label={label} hint={hint} htmlFor={id} isSet={isSet} onReset={onReset}>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      />
    </Control>
  );
}

export function TextAreaControl({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  rows = 3,
  isSet,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  rows?: number;
  isSet?: boolean;
  onReset?: () => void;
}) {
  const id = useId();
  const remaining = maxLength ? maxLength - value.length : null;
  return (
    <Control label={label} hint={hint} htmlFor={id} isSet={isSet} onReset={onReset}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FIELD_CLASS, "resize-y leading-relaxed")}
      />
      {remaining !== null && remaining < 80 ? (
        <p className="text-right text-xs text-ink-400">
          {remaining} characters left
        </p>
      ) : null}
    </Control>
  );
}

/* ------------------------------------------------------------------ */
/* Choice                                                             */
/* ------------------------------------------------------------------ */

/** A small set of mutually exclusive choices, shown as one segmented row. */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  hint,
  isSet,
  onReset,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  isSet?: boolean;
  onReset?: () => void;
}) {
  return (
    <Control label={label} hint={hint} isSet={isSet} onReset={onReset}>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-md border border-ink-100 bg-ink-50 p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.description ?? undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex-1 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-surface text-ink-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-900",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Control>
  );
}

/**
 * A longer list of choices, as the browser's own select.
 *
 * Used for languages, where there are a dozen options and several are in
 * non-Latin scripts: the native control gets the device's font handling, its
 * type-to-search and its mobile picker for free, all of which a custom
 * dropdown would have to reimplement worse.
 */
export function SelectControl({
  label,
  options,
  value,
  onChange,
  hint,
  isSet,
  onReset,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  isSet?: boolean;
  onReset?: () => void;
}) {
  const id = useId();
  return (
    <Control label={label} hint={hint} htmlFor={id} isSet={isSet} onReset={onReset}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FIELD_CLASS, "cursor-pointer")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Control>
  );
}

/** Choices that need their description to be readable, shown as cards. */
export function OptionCards({
  label,
  options,
  value,
  onChange,
  hint,
  isSet,
  onReset,
  renderPreview,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  isSet?: boolean;
  onReset?: () => void;
  renderPreview?: (option: OptionItem) => React.ReactNode;
}) {
  return (
    <Control label={label} hint={hint} isSet={isSet} onReset={onReset}>
      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "group relative rounded-md border px-3 py-2.5 text-left transition-all duration-150",
                active
                  ? "border-burgundy-600 bg-burgundy-50/60 ring-1 ring-burgundy-600/20"
                  : "border-ink-200 bg-surface hover:border-ink-300 hover:bg-ink-50",
              )}
            >
              {active ? (
                <Check
                  aria-hidden
                  className="absolute right-2 top-2 size-3.5 text-burgundy-700"
                />
              ) : null}
              <span className="block pr-5 text-sm font-medium text-ink-900">
                {option.label}
              </span>
              {renderPreview ? (
                <span className="mt-1.5 block">{renderPreview(option)}</span>
              ) : null}
              {option.description ? (
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Control>
  );
}

/** The launcher icon gallery: the real glyphs, at the real launcher colour. */
export function IconGallery({
  label,
  options,
  value,
  onChange,
  accent,
  hint,
  customImage,
  onClearCustom,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  accent: string;
  hint?: string;
  /** When set, an uploaded image is in use and overrides the chosen glyph. */
  customImage?: string | null;
  onClearCustom?: () => void;
}) {
  return (
    <Control label={label} hint={hint}>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-3"
      >
        {options.map((option) => {
          const active = option.value === value && !customImage;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 transition-all duration-150",
                active
                  ? "border-transparent shadow-md ring-2 ring-offset-2"
                  : "border-ink-200 bg-surface hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-sm",
              )}
              style={
                active
                  ? {
                      backgroundColor: accent,
                      color: "#ffffff",
                      // Tailwind cannot generate a ring colour for a database
                      // value, so the ring is drawn with a box-shadow.
                      boxShadow: `0 0 0 2px #ffffff, 0 0 0 4px ${accent}55`,
                    }
                  : { color: accent }
              }
            >
              <LauncherGlyph path={option.svg_path} className="size-7" />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}

        {customImage ? (
          <span className="flex items-center gap-2 rounded-xl border border-burgundy-600 bg-burgundy-50/60 p-1.5 pl-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customImage} alt="" className="size-8 rounded object-contain" />
            <span className="text-xs font-medium text-burgundy-700">
              Your image
            </span>
            {onClearCustom ? (
              <button
                type="button"
                onClick={onClearCustom}
                title="Use an icon instead"
                className="rounded p-1 text-ink-500 transition-colors hover:bg-surface hover:text-danger-700"
              >
                <X aria-hidden className="size-3.5" />
                <span className="sr-only">Remove the uploaded icon</span>
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    </Control>
  );
}

/**
 * One launcher glyph, drawn from the path data the backend serves.
 *
 * The same `svg_path` the generated loader writes into the customer's page,
 * so the gallery, the preview and the live website cannot disagree about what
 * an icon looks like. `dangerouslySetInnerHTML` is safe here in a way it is
 * not elsewhere: this string is a constant in backend/helpers/icons.py, never
 * customer input.
 */
export function LauncherGlyph({
  path,
  className,
}: {
  path: string | null;
  className?: string;
}) {
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Colour                                                             */
/* ------------------------------------------------------------------ */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * A colour.
 *
 * Two inputs over one value: the operating system's picker, and a hex field
 * for someone pasting a brand colour from a style guide. The hex field keeps
 * its own text while being typed — committing "#0f7" halfway through would
 * flash an unintended colour into the preview — and commits only a complete,
 * valid value, which is also the only kind the API accepts.
 */
export function ColorControl({
  label,
  value,
  onChange,
  hint,
  isSet,
  onReset,
  presets,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  isSet?: boolean;
  onReset?: () => void;
  presets?: OptionItem[];
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  // Follow the resolved value unless the customer is mid-edit.
  const shown = focused ? text : value;

  function commit(next: string) {
    setText(next);
    if (HEX.test(next.trim())) onChange(next.trim().toLowerCase());
  }

  return (
    <Control label={label} hint={hint} htmlFor={id} isSet={isSet} onReset={onReset}>
      <div className="flex items-center gap-2">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-ink-200">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-f]{3}$/i.test(value) ? "#" + value.slice(1).split("").map((c) => c + c).join("") : HEX.test(value) ? value : "#000000"}
            onChange={(event) => {
              setText(event.target.value);
              onChange(event.target.value.toLowerCase());
            }}
            // Sized larger than its box so no browser's default chrome shows.
            className="absolute -left-2 -top-2 size-14 cursor-pointer border-0 bg-transparent p-0"
            aria-label={`${label} colour picker`}
          />
        </span>
        <input
          type="text"
          value={shown}
          onChange={(event) => commit(event.target.value)}
          onFocus={() => {
            setText(value);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          className={cn(FIELD_CLASS, "font-mono text-sm uppercase")}
          aria-label={`${label} hex value`}
        />
      </div>

      {presets && presets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              onClick={() => {
                setText(preset.value);
                onChange(preset.value);
              }}
              className={cn(
                "size-5 rounded-full border transition-transform duration-150 hover:scale-110",
                preset.value.toLowerCase() === value.toLowerCase()
                  ? "border-ink-900 ring-1 ring-ink-900/20"
                  : "border-ink-900/15",
              )}
              style={{ backgroundColor: preset.value }}
            >
              <span className="sr-only">{preset.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </Control>
  );
}

/* ------------------------------------------------------------------ */
/* Numbers and switches                                               */
/* ------------------------------------------------------------------ */

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
  hint,
  isSet,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  hint?: string;
  isSet?: boolean;
  onReset?: () => void;
}) {
  const id = useId();
  return (
    <Control label={label} hint={hint} htmlFor={id} isSet={isSet} onReset={onReset}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-100 accent-burgundy-600"
        />
        <span className="w-16 shrink-0 text-right font-mono text-[12px] text-ink-700">
          {value}
          {unit}
        </span>
      </div>
    </Control>
  );
}

export function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink-900">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-burgundy-600" : "bg-ink-200",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform duration-150",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Suggested questions                                                */
/* ------------------------------------------------------------------ */

/**
 * The starter questions shown before a visitor types anything.
 *
 * A list rather than a textarea because each entry has its own length limit
 * and its own button in the chat window, and because an empty list is a valid
 * and common answer — a chatbot that suggests questions it cannot answer is
 * worse than one that suggests none.
 */
export function QuestionListControl({
  questions,
  onChange,
  max,
  maxLength,
}: {
  questions: string[];
  onChange: (questions: string[]) => void;
  max: number;
  maxLength: number;
}) {
  const [draft, setDraft] = useState("");
  const full = questions.length >= max;

  function add() {
    const value = draft.trim().slice(0, maxLength);
    if (!value || full || questions.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...questions, value]);
    setDraft("");
  }

  return (
    <Control
      label="Suggested questions"
      hint={
        full
          ? `You have added the maximum of ${max}.`
          : `Shown as buttons before the visitor types. Up to ${max}. Leave empty if you are not sure what your chatbot can answer.`
      }
    >
      <ul className="space-y-1.5">
        {questions.map((question, index) => (
          <li
            key={question}
            className="flex items-center gap-2 rounded-md border border-ink-100 bg-ink-50 px-2.5 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
              {question}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange(questions.filter((_, position) => position !== index))
              }
              title="Remove"
              className="rounded p-1 text-ink-400 transition-colors hover:bg-surface hover:text-danger-700"
            >
              <X aria-hidden className="size-3.5" />
              <span className="sr-only">{`Remove "${question}"`}</span>
            </button>
          </li>
        ))}
      </ul>

      {!full ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={maxLength}
            placeholder="e.g. What are your opening hours?"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            className={FIELD_CLASS}
            aria-label="New suggested question"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="shrink-0 rounded-md border border-ink-200 bg-surface px-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}
    </Control>
  );
}

/* ------------------------------------------------------------------ */
/* Image upload                                                       */
/* ------------------------------------------------------------------ */

/**
 * An avatar, logo or launcher icon.
 *
 * Reads the file with `FileReader` and hands the backend the data URL, which
 * identifies the image from its own bytes. The size is checked here too, so
 * someone who picks a 4 MB photo is told immediately instead of after the
 * upload.
 */
export function ImageControl({
  label,
  hint,
  value,
  maxBytes,
  accept,
  busy = false,
  onSelect,
  onClear,
}: {
  label: string;
  hint?: string;
  /** The resolved URL currently in use, if any. */
  value: string | null;
  maxBytes: number;
  accept: string[];
  busy?: boolean;
  onSelect: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function choose(file: File | undefined) {
    setProblem(null);
    if (!file) return;
    if (file.size > maxBytes) {
      setProblem(
        `That image is ${Math.round(file.size / 1024)} KB. Please choose one under ${Math.round(maxBytes / 1024)} KB.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setProblem("That file could not be read.");
    reader.onload = () => {
      if (typeof reader.result === "string") onSelect(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Control label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-ink-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-contain p-1" />
          ) : (
            <Upload aria-hidden className="size-4 text-ink-300" />
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-50"
          >
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2.5 py-1.5 text-sm text-ink-500 transition-colors hover:text-danger-700"
            >
              Remove
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            // Reset, so choosing the same file twice still fires a change.
            event.target.value = "";
          }}
        />
      </div>

      {problem ? (
        <p role="alert" className="text-xs font-medium text-danger-700">
          {problem}
        </p>
      ) : null}
    </Control>
  );
}
