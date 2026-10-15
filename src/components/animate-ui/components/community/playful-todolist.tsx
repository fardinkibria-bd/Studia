"use client";

import * as React from "react";
import { motion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/store/ThemeContext";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";

/**
 * Playful Todolist — from animate-ui (community component by arhamkhnz).
 * https://animate-ui.com/docs/components/community/playful-todolist
 *
 * Installed via `npx shadcn add @animate-ui/components-community-playful-todolist`,
 * then generalized so it can be driven by real app data (to-dos, homework,
 * revisions, schedule items, …) instead of the hardcoded demo list:
 *
 * - `<PlayfulTodolist />` with no props still renders the original self-managed
 *   demo list (upstream behavior).
 * - Pass `items` + `onCheckedChange` to render a controlled checklist.
 * - `<PlayfulStrike />` and `<Checkbox />` are exported for custom layouts
 *   (e.g. the draggable schedule rows).
 *
 * Other adaptations to this codebase: shadcn color tokens are mapped onto the
 * Studia design tokens, and animations are disabled when the user has enabled
 * reduced motion in Settings.
 */

const checkboxItems = [
  {
    id: 1,
    label: "Code in Assembly 💾",
    defaultChecked: false,
  },
  {
    id: 2,
    label: "Present a bug as a feature 🪲",
    defaultChecked: false,
  },
  {
    id: 3,
    label: "Push to prod on a Friday 🚀",
    defaultChecked: false,
  },
];

/** Hand-drawn wavy strikethrough path from the upstream component. */
const STRIKE_PATH =
  "M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36";

const getPathAnimate = (isChecked: boolean) => ({
  pathLength: isChecked ? 1 : 0,
  opacity: isChecked ? 1 : 0,
});

const getPathTransition = (
  isChecked: boolean,
  instant: boolean,
): Transition => ({
  pathLength: { duration: instant ? 0 : 1, ease: "easeInOut" },
  opacity: {
    duration: 0.01,
    delay: isChecked || instant ? 0 : 1,
  },
});

/**
 * Text with the animated wavy strikethrough drawn over it when `checked`.
 * The overlay always spans the text width and retracts with the same 1s
 * ease when the item is unchecked.
 */
export function PlayfulStrike({
  checked,
  children,
  htmlFor,
  className,
  textClassName,
  truncate = true,
}: {
  checked: boolean;
  children: React.ReactNode;
  /** When set, the text becomes a <label> that toggles the given checkbox id. */
  htmlFor?: string;
  className?: string;
  textClassName?: string;
  truncate?: boolean;
}) {
  const { reducedMotion } = useTheme();

  const text = htmlFor ? (
    <Label
      htmlFor={htmlFor}
      className={cn("block", truncate && "truncate", textClassName)}
    >
      {children}
    </Label>
  ) : (
    <span className={cn("block", truncate && "truncate", textClassName)}>
      {children}
    </span>
  );

  return (
    <div className={cn("relative inline-block max-w-full min-w-0", className)}>
      {/*
        Inner box shrink-wraps to the text (`w-fit`) so the scribble only
        spans the label itself, not the whole row when callers stretch this
        wrapper with `flex-1`. `max-w-full` keeps long titles capped at the
        available width so `truncate` still applies.
      */}
      <div className="relative w-fit max-w-full">
        {text}
        <motion.svg
          viewBox="0 0 340 40"
          preserveAspectRatio="none"
          className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-20 h-10 w-full overflow-visible"
          aria-hidden
        >
          <motion.path
            d={STRIKE_PATH}
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
            strokeLinecap="round"
            strokeMiterlimit={10}
            fill="none"
            initial={false}
            animate={getPathAnimate(checked)}
            transition={getPathTransition(checked, reducedMotion)}
            className="stroke-red-500 dark:stroke-red-400"
          />
        </motion.svg>
      </div>
    </div>
  );
}

export type PlayfulCheckboxVariant = "default" | "accent" | "success" | "info";

export interface PlayfulTodolistItem {
  id: string;
  /** Title text — receives the wavy strikethrough when checked. */
  label: React.ReactNode;
  /** `true` = done, `false` = pending, `'indeterminate'` = in progress. */
  checked: boolean | "indeterminate";
  disabled?: boolean;
  /** Checkbox tone. Checked = tone color, indeterminate always renders info. */
  variant?: PlayfulCheckboxVariant;
  /** Secondary line right below the title (description). */
  description?: React.ReactNode;
  /** Badges / dates row rendered under the title. */
  meta?: React.ReactNode;
  /** Right-aligned actions (edit / delete buttons, …) shown on hover. */
  actions?: React.ReactNode;
  /** Extra classes for the title text, e.g. colors or typography. */
  labelClassName?: string;
}

export interface PlayfulTodolistProps {
  /** Omit to render the self-managed demo list (upstream `<PlayfulTodolist />`). */
  items?: PlayfulTodolistItem[];
  onCheckedChange?: (id: string, checked: boolean) => void;
  className?: string;
  /** Classes for each row (borders, background, padding). */
  itemClassName?: string;
  /** Render separators between rows instead of bordered card rows. */
  dividers?: boolean;
  /** Stagger (seconds) between row entrance animations. */
  stagger?: number;
}

function PlayfulTodoRow({
  item,
  onCheckedChange,
  dividers,
  delay,
  className,
}: {
  item: PlayfulTodolistItem;
  onCheckedChange?: (id: string, checked: boolean) => void;
  dividers?: boolean;
  delay: number;
  className?: string;
}) {
  const { reducedMotion } = useTheme();
  const id = `playful-todo-${item.id}`;
  const label = typeof item.label === "string" ? item.label : "item";

  return (
    <motion.div
      layout="position"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "group flex items-start gap-3",
        dividers
          ? "py-5"
          : "rounded-xl bg-bg-base dark:bg-bg-surface border border-bg-surface hover:border-green-500 transition-colors p-4",
        className,
      )}
    >
      <Checkbox
        id={id}
        variant={item.variant ?? "accent"}
        size="default"
        checked={item.checked}
        disabled={item.disabled}
        onCheckedChange={(value) => onCheckedChange?.(item.id, value === true)}
        aria-label={
          item.checked === true
            ? `Mark "${label}" as not done`
            : `Mark "${label}" as done`
        }
        className="mt-0.5 shrink-0 text-white"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <PlayfulStrike
            checked={item.checked === true}
            htmlFor={id}
            className="flex-1 min-w-0"
            textClassName={cn(
              "text-sm text-brand-600/85 font-medium",
              item.checked === true
                ? "text-brand-600/85"
                : item.checked === "indeterminate"
                  ? "text-accent"
                  : "text-brand-600/85",
              item.labelClassName,
            )}
          >
            {item.label}
          </PlayfulStrike>
          {item.actions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              {item.actions}
            </div>
          )}
        </div>
        {item.description && (
          <div className="mt-1 min-w-0">{item.description}</div>
        )}
        {item.meta && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {item.meta}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PlayfulTodolist({
  items,
  onCheckedChange,
  className,
  itemClassName,
  dividers,
  stagger = 0.03,
}: PlayfulTodolistProps) {
  const [demoChecked, setDemoChecked] = React.useState(
    checkboxItems.map((i) => !!i.defaultChecked),
  );

  // Upstream demo mode: `<PlayfulTodolist />` manages its own items.
  if (!items) {
    return (
      <div className={cn("rounded-2xl bg-bg-muted p-6 space-y-6", className)}>
        {checkboxItems.map((item, idx) => (
          <div key={item.id} className="space-y-6">
            <PlayfulTodoRow
              item={{
                id: String(item.id),
                label: item.label,
                checked: demoChecked[idx],
              }}
              dividers
              delay={0}
              onCheckedChange={(id) => {
                setDemoChecked((prev) =>
                  prev.map((c, i) =>
                    String(checkboxItems[i].id) === id ? !c : c,
                  ),
                );
              }}
            />
            {idx !== checkboxItems.length - 1 && (
              <div className="border-t border-border-default" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, idx) => (
        <React.Fragment key={item.id}>
          <PlayfulTodoRow
            item={item}
            onCheckedChange={onCheckedChange}
            dividers={dividers}
            delay={stagger ? idx * stagger : 0}
            className={itemClassName}
          />
          {dividers && idx !== items.length - 1 && (
            <div className="border-t border-border-default" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
