"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  GripVertical,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  Rows3,
  Search,
  X,
} from "lucide-react";
import {
  createAppointment,
  createCustomer,
  rescheduleAppointment,
  resizeAppointment,
  updateAppointmentNotes,
  updateFlexibleAppointment,
  type ActionState,
} from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";
import { useNiche } from "@/components/niche-provider";
import {
  daysBetween,
  shiftDateKey,
  weekDayLabels,
  weekRangeLabel,
} from "@/lib/calendar-date";
import {
  calendarEntitySignature,
  calendarRoute,
  localDateTimeToIso,
  minutesToTime,
  moveGridFocus,
  normalizeSlotInterval,
  reconcileCalendarSnapshot,
  rollbackCalendarEntity,
  snapMinutes,
  timeToMinutes,
  type SlotInterval,
} from "@/lib/calendar-grid";

type CalendarView = "day" | "week" | "month" | "list";
export type CalendarEvent = {
  id: string;
  dateKey: string;
  day: number;
  startMinutes: number;
  durationMinutes: number;
  time: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  title: string;
  description: string;
  location: string;
  color: string;
  customerId: string | null;
  serviceId: string | null;
  status: string;
  client: string;
  service: string;
  phone?: string | null;
  notes?: string | null;
};
export type AppointmentOption = {
  id: string;
  label: string;
  durationMinutes?: number;
  priceCents?: number | null;
  color?: string | null;
};
type Draft = {
  appointmentId: string | null;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  anchorX?: number;
  anchorY?: number;
};
const initialActionState: ActionState = { status: "idle", message: "" };
const HOUR_HEIGHT = 72;
const EVENT_COLORS = [
  "#039BE5",
  "#33B679",
  "#7986CB",
  "#D50000",
  "#F4511E",
  "#F6BF26",
  "#8D6E63",
];
const window = globalThis.window ?? ({ innerWidth: 960 } as Window);

export function AppointmentManager({
  events,
  customers,
  services,
  demo,
  weekStart,
  anchorDate,
  today,
  initialView,
  allowedWeekdays,
  workingHours,
  slotInterval: rawSlotInterval,
  timeZone,
}: {
  events: CalendarEvent[];
  customers: AppointmentOption[];
  services: AppointmentOption[];
  demo: boolean;
  weekStart: string;
  anchorDate: string;
  today: string;
  initialView: CalendarView;
  allowedWeekdays: number[];
  workingHours: { start: string; end: string };
  slotInterval: SlotInterval;
  timeZone: string;
}) {
  const router = useRouter();
  const { niche } = useNiche();
  const slotInterval = normalizeSlotInterval(rawSlotInterval);
  const dayStart = timeToMinutes(workingHours.start);
  const dayEnd = Math.max(dayStart + 60, timeToMinutes(workingHours.end));
  const timelineMinutes = dayEnd - dayStart;
  const slots = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(timelineMinutes / slotInterval) },
        (_, index) => dayStart + index * slotInterval,
      ),
    [dayStart, slotInterval, timelineMinutes],
  );
  const signature = events.map(calendarEntitySignature).join("¦");
  const [model, setModel] = useState(() => ({ signature, rows: events }));
  const rows = model.rows;
  const setRows = (next: SetStateAction<CalendarEvent[]>) =>
    setModel((current) => ({
      ...current,
      rows: typeof next === "function" ? next(current.rows) : next,
    }));
  const [view, setView] = useState<CalendarView>(initialView);
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selection, setSelection] = useState<Draft | null>(null);
  const selectionAnchor = useRef<Draft | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("#6A2E16");
  const titleDirty = useRef(false);
  const colorDirty = useRef(false);
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [quickCustomerMessage, setQuickCustomerMessage] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [pendingIds, setPendingIds] = useState(() => new Set<string>());
  const pendingIdsRef = useRef(pendingIds);
  const [isUpdating, startUpdating] = useTransition();
  const [isChangingPeriod, startPeriodChange] = useTransition();
  const [createState, createAction, createPending] = useActionState(
    async (previous: ActionState, data: FormData) => {
      const result = await createAppointment(previous, data);
      if (result.status === "success") {
        setDraft(null);
        setFeedback(result.message);
        returnFocusRef.current?.focus();
      }
      return result;
    },
    initialActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    async (previous: ActionState, data: FormData) => {
      const result = await updateFlexibleAppointment(previous, data);
      if (result.status === "success") {
        setDraft(null);
        setFeedback(result.message);
        returnFocusRef.current?.focus();
      }
      return result;
    },
    initialActionState,
  );
  const state = draft?.appointmentId ? updateState : createState;
  const pending = createPending || updatePending;
  const days = weekDayLabels(weekStart);
  const selectedEvent =
    rows.find((event) => event.id === selectedEventId) ?? null;
  const canUseDate = (dateKey: string) =>
    allowedWeekdays.includes(new Date(`${dateKey}T00:00:00Z`).getUTCDay());
  const openDraft = (
    dateKey: string,
    startMinutes = dayStart,
    endMinutes = startMinutes + slotInterval,
    anchor?: { x: number; y: number },
  ) => {
    if (!canUseDate(dateKey)) {
      setFeedback(
        "Este dia está sem atendimento. Altere a disponibilidade em Configurações.",
      );
      return;
    }
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setSelectedServiceId("");
    setSelectedCustomerId("");
    setShowQuickCustomer(false);
    setQuickCustomerMessage("");
    setTitleDraft("");
    setColorDraft(EVENT_COLORS[0]);
    titleDirty.current = false;
    colorDirty.current = false;
    setDraft({
      appointmentId: null,
      dateKey,
      startMinutes,
      endMinutes: Math.min(
        dayEnd,
        Math.max(startMinutes + slotInterval, endMinutes),
      ),
      anchorX: anchor?.x,
      anchorY: anchor?.y,
    });
  };
  if (model.signature !== signature)
    setModel({
      signature,
      rows: reconcileCalendarSnapshot(events, rows, pendingIds),
    });
  useEffect(() => {
    pendingIdsRef.current = pendingIds;
  }, [pendingIds]);
  useEffect(() => {
    const distance = view === "week" || view === "list" ? 7 : 1;
    router.prefetch(
      calendarRoute(
        view,
        view === "month"
          ? shiftMonth(anchorDate, -1)
          : shiftDateKey(anchorDate, -distance),
      ),
    );
    router.prefetch(
      calendarRoute(
        view,
        view === "month"
          ? shiftMonth(anchorDate, 1)
          : shiftDateKey(anchorDate, distance),
      ),
    );
  }, [anchorDate, router, view]);
  useEffect(() => {
    if (!draft || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusables = () => [
      ...dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
      ),
    ];
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDraft(null);
        returnFocusRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [draft]);
  // The grid listener captures the current slot geometry and draft opener for this render.
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>(".calendar-body");
    if (!grid) return;
    grid.setAttribute("role", "grid");
    const cells = [
      ...grid.querySelectorAll<HTMLButtonElement>(".calendar-day > button"),
    ];
    cells.forEach((cell, index) => {
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = index === 0 ? 0 : -1;
    });
    let anchor: number | null = null;
    const onKey = (event: KeyboardEvent) => {
      const index = cells.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      if (event.key === "Escape") {
        anchor = null;
        selectionAnchor.current = null;
        setSelection(null);
        setFeedback("Seleção cancelada.");
        return;
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        selectionAnchor.current
      ) {
        event.preventDefault();
        event.stopPropagation();
        const selected = selectionAnchor.current;
        anchor = null;
        selectionAnchor.current = null;
        setSelection(null);
        openDraft(selected.dateKey, selected.startMinutes, selected.endMinutes);
        return;
      }
      if (!event.key.startsWith("Arrow")) return;
      event.preventDefault();
      let next = moveGridFocus(index, event.key, slots.length, cells.length);
      if (event.shiftKey) {
        anchor ??= index;
        const first = Math.floor(anchor / slots.length) * slots.length;
        next = Math.max(first, Math.min(first + slots.length - 1, next));
        const start = Math.min(anchor % slots.length, next % slots.length),
          end = Math.max(anchor % slots.length, next % slots.length);
        const selected = {
          appointmentId: null,
          dateKey: cells[anchor].dataset.date!,
          startMinutes: slots[start],
          endMinutes: slots[end] + slotInterval,
        };
        selectionAnchor.current = selected;
        setSelection(selected);
        setFeedback(
          `${minutesToTime(selected.startMinutes)}–${minutesToTime(selected.endMinutes)} · Enter para criar`,
        );
      } else {
        anchor = null;
        selectionAnchor.current = null;
        setSelection(null);
      }
      cells.forEach((cell, cellIndex) => {
        cell.tabIndex = cellIndex === next ? 0 : -1;
      });
      cells[next]?.focus();
    };
    grid.addEventListener("keydown", onKey, true);
    return () => grid.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, slotInterval, view, anchorDate]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (event) =>
          `${event.title} ${event.client} ${event.service} ${event.notes ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")) &&
          (serviceFilter === "all" || event.service === serviceFilter),
      ),
    [query, rows, serviceFilter],
  );
  const saveQuickCustomer = () => {
    const name = quickCustomer.name.trim(),
      phone = quickCustomer.phone.trim(),
      email = quickCustomer.email.trim();
    if (name.length < 2 || (!phone && !email)) {
      setQuickCustomerMessage("Informe o nome e ao menos um contato.");
      return;
    }
    if (demo) {
      const option = { id: `demo-${crypto.randomUUID()}`, label: name };
      setCustomerOptions((current) => [...current, option]);
      setSelectedCustomerId(option.id);
      setShowQuickCustomer(false);
      setQuickCustomer({ name: "", phone: "", email: "" });
      setQuickCustomerMessage("Cliente pronto para este evento.");
      return;
    }
    startUpdating(async () => {
      const data = new FormData();
      data.set("name", name);
      data.set("phone", phone);
      data.set("email", email);
      const result = await createCustomer(initialActionState, data);
      setQuickCustomerMessage(result.message);
      if (result.status === "success" && result.data) {
        setCustomerOptions((current) => [...current, result.data!]);
        setSelectedCustomerId(result.data.id);
        setShowQuickCustomer(false);
        setQuickCustomer({ name: "", phone: "", email: "" });
      }
    });
  };
  const visible = filtered.filter((event) =>
    isVisibleInView(event.dateKey, view, anchorDate, weekStart),
  );
  const serviceNames = [...new Set(rows.map((event) => event.service))];
  const startSelection = (
    dateKey: string,
    minute: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0 || !canUseDate(dateKey)) return;
    const column = event.currentTarget
      .closest(".calendar-day")
      ?.getBoundingClientRect();
    if (!column) return;
    const next: Draft = {
      appointmentId: null,
      dateKey,
      startMinutes: minute,
      endMinutes: Math.min(dayEnd, minute + slotInterval),
      anchorX: event.clientX,
      anchorY: event.clientY,
    };
    selectionAnchor.current = next;
    setSelection(next);
    event.currentTarget.setPointerCapture(event.pointerId);
    const onMove = (move: PointerEvent) => {
      const current = next;
      if (!selectionAnchor.current) return;
      const hovered = Math.min(
        dayEnd - slotInterval,
        dayStart +
          snapMinutes(
            ((move.clientY - column.top) / HOUR_HEIGHT) * 60,
            slotInterval,
          ),
      );
      const selected = {
        ...current,
        startMinutes: Math.min(current.startMinutes, hovered),
        endMinutes: Math.max(current.startMinutes, hovered) + slotInterval,
      };
      selectionAnchor.current = selected;
      setSelection(selected);
      setFeedback(
        `${minutesToTime(selected.startMinutes)}–${minutesToTime(selected.endMinutes)} · ${selected.endMinutes - selected.startMinutes} min`,
      );
    };
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      const final = selectionAnchor.current;
      selectionAnchor.current = null;
      setSelection(null);
      if (final)
        openDraft(final.dateKey, final.startMinutes, final.endMinutes, {
          x: final.anchorX ?? 0,
          y: final.anchorY ?? 0,
        });
    };
    const cancel = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      selectionAnchor.current = null;
      setSelection(null);
      window.removeEventListener("keydown", key);
      setFeedback("Seleção cancelada.");
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  };
  const openEvent = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    setNotesDraft(event.notes ?? "");
  };
  const navigate = (distance: number) => {
    const next =
      view === "month"
        ? shiftMonth(anchorDate, distance)
        : shiftDateKey(
            anchorDate,
            distance * (view === "week" || view === "list" ? 7 : 1),
          );
    startPeriodChange(() =>
      router.push(calendarRoute(view, next), { scroll: false }),
    );
  };
  const moveEvent = (
    id: string,
    dateKey: string,
    minute: number,
    original?: CalendarEvent,
  ) => {
    if (pendingIdsRef.current.has(id) && !original) return;
    const previous = original ?? rows.find((item) => item.id === id);
    if (!previous) return;
    if (!canUseDate(dateKey)) {
      setRows((items) => rollbackCalendarEntity(items, previous));
      lockEvent(id, false);
      setFeedback("Este dia está sem atendimento.");
      return;
    }
    try {
      const snapped = snapMinutes(minute - dayStart, slotInterval) + dayStart;
      const startsAt = localDateTimeToIso(
        `${dateKey}T${minutesToTime(snapped)}`,
        timeZone,
      );
      lockEvent(id, true);
      setRows((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                dateKey,
                startMinutes: snapped,
                time: minutesToTime(snapped),
                endTime: minutesToTime(snapped + item.durationMinutes),
                startsAt,
                endsAt: new Date(
                  Date.parse(startsAt) + item.durationMinutes * 60000,
                ).toISOString(),
              }
            : item,
        ),
      );
      if (demo) {
        lockEvent(id, false);
        setFeedback("Horário atualizado nesta demonstração.");
        return;
      }
      setFeedback("Salvando novo horário…");
      startUpdating(async () => {
        try {
          const result = await rescheduleAppointment(id, startsAt);
          setFeedback(result.message);
          if (result.status === "error")
            setRows((items) => rollbackCalendarEntity(items, previous));
        } catch {
          setRows((items) => rollbackCalendarEntity(items, previous));
          setFeedback("Não foi possível mover o evento. Tente novamente.");
        } finally {
          lockEvent(id, false);
        }
      });
    } catch (error) {
      setRows((items) => rollbackCalendarEntity(items, previous));
      lockEvent(id, false);
      setFeedback(error instanceof Error ? error.message : "Horário inválido.");
    }
  };
  const beginMove = (
    pointer: ReactPointerEvent<HTMLElement>,
    event: CalendarEvent,
  ) => {
    if (
      pointer.button !== 0 ||
      pendingIdsRef.current.has(event.id) ||
      (pointer.target as HTMLElement).closest("button")
    )
      return;
    pointer.preventDefault();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    const originX = pointer.clientX,
      originY = pointer.clientY;
    const columns = [
      ...document.querySelectorAll<HTMLElement>(".calendar-day"),
    ].map((column) => ({
      date: column.dataset.date!,
      rect: column.getBoundingClientRect(),
    }));
    let moved = false,
      date = event.dateKey,
      minute = event.startMinutes;
    const move = (current: PointerEvent) => {
      if (
        !moved &&
        Math.hypot(current.clientX - originX, current.clientY - originY) < 6
      )
        return;
      if (!moved) {
        moved = true;
        lockEvent(event.id, true);
      }
      const column = columns.find(
        ({ rect }) =>
          current.clientX >= rect.left && current.clientX <= rect.right,
      );
      if (!column) return;
      date = column.date;
      minute = Math.max(
        dayStart,
        Math.min(
          dayEnd - slotInterval,
          event.startMinutes +
            Math.round(
              (((current.clientY - originY) / HOUR_HEIGHT) * 60) / slotInterval,
            ) *
              slotInterval,
        ),
      );
      setRows((items) =>
        items.map((item) =>
          item.id === event.id
            ? {
                ...item,
                dateKey: date,
                startMinutes: minute,
                time: minutesToTime(minute),
                endTime: minutesToTime(minute + event.durationMinutes),
              }
            : item,
        ),
      );
      setFeedback(
        `${dateLabel(date)} · ${minutesToTime(minute)}–${minutesToTime(minute + event.durationMinutes)}`,
      );
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
    const finish = () => {
      cleanup();
      if (moved) moveEvent(event.id, date, minute, event);
      else openEvent(event);
    };
    const cancel = () => {
      cleanup();
      if (moved) setRows((items) => rollbackCalendarEntity(items, event));
      lockEvent(event.id, false);
      setFeedback("Movimentação cancelada.");
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
    window.addEventListener("keydown", key);
  };
  const lockEvent = (id: string, locked: boolean) => {
    const next = new Set(pendingIdsRef.current);
    if (locked) next.add(id);
    else next.delete(id);
    pendingIdsRef.current = next;
    setPendingIds(next);
  };
  const saveDuration = (
    event: CalendarEvent,
    duration: number,
    alreadyLocked = false,
  ) => {
    if (!alreadyLocked && pendingIdsRef.current.has(event.id)) return;
    const durationMinutes = Math.max(slotInterval, Math.min(1440, duration));
    lockEvent(event.id, true);
    setRows((items) =>
      items.map((item) =>
        item.id === event.id
          ? {
              ...item,
              durationMinutes,
              endTime: minutesToTime(item.startMinutes + durationMinutes),
              endsAt: new Date(
                Date.parse(item.startsAt) + durationMinutes * 60000,
              ).toISOString(),
            }
          : item,
      ),
    );
    if (demo) {
      lockEvent(event.id, false);
      setFeedback("Duração atualizada nesta demonstração.");
      return;
    }
    setFeedback("Salvando duração…");
    startUpdating(async () => {
      try {
        const result = await resizeAppointment(event.id, durationMinutes);
        setFeedback(result.message);
        if (result.status === "error")
          setRows((items) => rollbackCalendarEntity(items, event));
      } catch {
        setRows((items) => rollbackCalendarEntity(items, event));
        setFeedback("Não foi possível alterar a duração. Tente novamente.");
      } finally {
        lockEvent(event.id, false);
      }
    });
  };
  const beginResize = (
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
  ) => {
    if (pendingIdsRef.current.has(event.id)) return;
    lockEvent(event.id, true);
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    const originY = pointerEvent.clientY;
    const previous = event;
    let previewDuration = event.durationMinutes;
    const move = (current: PointerEvent) => {
      const deltaMinutes =
        Math.round(
          (((current.clientY - originY) / HOUR_HEIGHT) * 60) / slotInterval,
        ) * slotInterval;
      previewDuration = Math.max(
        slotInterval,
        Math.min(1440, event.durationMinutes + deltaMinutes),
      );
      setRows((items) =>
        items.map((item) =>
          item.id === event.id
            ? {
                ...item,
                durationMinutes: previewDuration,
                endTime: minutesToTime(item.startMinutes + previewDuration),
                endsAt: new Date(
                  Date.parse(item.startsAt) + previewDuration * 60_000,
                ).toISOString(),
              }
            : item,
        ),
      );
      setFeedback(
        `${event.time}–${minutesToTime(event.startMinutes + previewDuration)} · ${previewDuration} min`,
      );
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
    const finish = () => {
      cleanup();
      if (previewDuration === previous.durationMinutes) {
        lockEvent(event.id, false);
        return;
      }
      saveDuration(previous, previewDuration, true);
    };
    const cancel = () => {
      cleanup();
      setRows((current) => rollbackCalendarEntity(current, previous));
      lockEvent(event.id, false);
      setFeedback("Redimensionamento cancelado.");
    };
    const key = (keyboard: KeyboardEvent) => {
      if (keyboard.key === "Escape") cancel();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
    window.addEventListener("keydown", key);
  };
  const createDemo = (event: FormEvent<HTMLFormElement>) => {
    if (!demo || !draft) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const service = services.find((item) => item.id === form.get("serviceId"));
    const customer = customerOptions.find(
      (item) => item.id === form.get("customerId"),
    );
    const startValue = String(form.get("startsAt"));
    const endValue = String(form.get("endsAt"));
    const dateKey = startValue.slice(0, 10);
    const start = timeToMinutes(startValue.slice(11));
    const end = timeToMinutes(endValue.slice(11));
    const next: CalendarEvent = {
      id: draft.appointmentId ?? `demo-${crypto.randomUUID()}`,
      dateKey,
      day: daysBetween(weekStart, dateKey),
      startMinutes: start,
      durationMinutes: end - start,
      time: minutesToTime(start),
      endTime: minutesToTime(end),
      startsAt: localDateTimeToIso(startValue, timeZone),
      endsAt: localDateTimeToIso(endValue, timeZone),
      title: String(
        form.get("title") || customer?.label || service?.label || "Evento",
      ),
      description: String(form.get("description") || ""),
      location: String(form.get("location") || ""),
      color: String(form.get("color")),
      customerId: customer?.id ?? null,
      serviceId: service?.id ?? null,
      status: "scheduled",
      client: customer?.label ?? "Sem cliente",
      service: service?.label ?? "Evento livre",
      notes: String(form.get("notes") || ""),
      phone: null,
    };
    setRows((current) =>
      draft.appointmentId
        ? current.map((item) => (item.id === draft.appointmentId ? next : item))
        : [...current, next],
    );
    setDraft(null);
    setFeedback(
      draft.appointmentId ? "Evento atualizado." : "Evento incluído na agenda.",
    );
  };
  const applyService = (id: string) => {
    setSelectedServiceId(id);
    const service = services.find((item) => item.id === id);
    if (!service || !draft) return;
    setDraft({
      ...draft,
      endMinutes: Math.min(
        dayEnd,
        draft.startMinutes + (service.durationMinutes ?? slotInterval),
      ),
    });
    if (!titleDirty.current) setTitleDraft(service.label);
    if (!colorDirty.current && service.color) setColorDraft(service.color);
  };
  const renderEvent = (event: CalendarEvent) => (
    <article
      key={event.id}
      className={`calendar-event${pendingIds.has(event.id) ? " calendar-event--pending" : ""}`}
      aria-busy={pendingIds.has(event.id)}
      onPointerDown={(pointer) => beginMove(pointer, event)}
      style={{
        top: `${((event.startMinutes - dayStart) / 60) * HOUR_HEIGHT + 3}px`,
        height: `${Math.max(30, (event.durationMinutes / 60) * HOUR_HEIGHT - 6)}px`,
        borderInlineStartColor: event.color,
      }}
    >
      <div className="calendar-event__time">
        <GripVertical size={13} />
        <strong>
          {event.time}–{event.endTime}
        </strong>
      </div>
      <b>{event.title}</b>
      {event.durationMinutes >= 30 ? <small>{event.service}</small> : null}
      <button
        type="button"
        className="calendar-event__details"
        onClick={(e) => {
          e.stopPropagation();
          openEvent(event);
        }}
      >
        Detalhes
      </button>
      <button
        type="button"
        className="calendar-event__resize"
        disabled={pendingIds.has(event.id)}
        aria-label={`Alterar duração de ${event.title}`}
        onPointerDown={(e) => beginResize(e, event)}
      />
    </article>
  );
  const columnProps = {
    timeZone,
    slots,
    slotInterval,
    dayStart,
    timelineMinutes,
    events: visible,
    openDraft,
    startSelection,
    renderEvent,
    selection,
  };
  const whatsappUrl = selectedEvent?.phone
    ? buildWhatsappUrl(selectedEvent)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Operação · Agenda"
        title="Agenda"
        description={`Organize os horários de ${niche.resource.toLowerCase()} com precisão de ${slotInterval} minutos.`}
        action={null}
      />
      <div className="calendar-commandbar">
        <div className="calendar-commandbar__main">
          <div className="date-switcher">
            <button
              aria-label="Período anterior"
              disabled={isChangingPeriod}
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <strong>
              {isChangingPeriod
                ? "Atualizando…"
                : periodLabel(view, anchorDate, weekStart)}
            </strong>
            <button
              aria-label="Próximo período"
              disabled={isChangingPeriod}
              onClick={() => navigate(1)}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className="calendar-today"
              onClick={() =>
                startPeriodChange(() => router.push(calendarRoute(view, today)))
              }
            >
              Hoje
            </button>
          </div>
          <div className="calendar-view-switch">
            {[
              ["day", CalendarDays, "Dia"],
              ["week", Rows3, "Semana"],
              ["month", LayoutGrid, "Mês"],
              ["list", List, "Lista"],
            ].map(([key, Icon, label]) => (
              <button
                key={String(key)}
                className={view === key ? "active" : ""}
                onClick={() => {
                  setView(key as CalendarView);
                  router.replace(
                    calendarRoute(key as CalendarView, anchorDate),
                    { scroll: false },
                  );
                }}
              >
                <Icon size={15} /> {label as string}
              </button>
            ))}
          </div>
        </div>
        <div className="calendar-commandbar__tools">
          <label className="inline-search agenda-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar evento, cliente ou serviço…"
            />
          </label>
          <label className="chip chip--select">
            <Filter size={15} />
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="all">Todos os serviços</option>
              {serviceNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <button
            className="button button--ghost"
            onClick={() => router.refresh()}
          >
            Atualizar agenda
          </button>
          <button
            className="button button--primary"
            onClick={() => openDraft(anchorDate)}
          >
            Novo evento
          </button>
        </div>
      </div>
      {feedback || state.message ? (
        <div className="agenda-feedback-row">
          <span className="calendar-feedback" aria-live="polite">
            {isUpdating ? "Salvando…" : feedback || state.message}
          </span>
        </div>
      ) : null}
      {view === "week" ? (
        <Timeline
          days={days.map((label, index) => ({
            label,
            dateKey: shiftDateKey(weekStart, index),
          }))}
          today={today}
          {...columnProps}
        />
      ) : null}
      {view === "day" ? (
        <Timeline
          days={[{ label: dateLabel(anchorDate), dateKey: anchorDate }]}
          today={today}
          {...columnProps}
        />
      ) : null}
      {view === "month" ? (
        <MonthCalendar
          anchorDate={anchorDate}
          today={today}
          events={visible}
          openDraft={openDraft}
          openEvent={openEvent}
        />
      ) : null}
      {view === "list" ? (
        <section className="agenda-list">
          {visible.length ? (
            visible
              .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((event) => (
                <button key={event.id} onClick={() => openEvent(event)}>
                  <time>
                    {dateLabel(event.dateKey)} · {event.time}–{event.endTime}
                  </time>
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {event.client} · {event.service}
                    </span>
                  </div>
                  <span>Ver detalhes</span>
                </button>
              ))
          ) : (
            <p className="empty-state">
              Nenhum agendamento neste período. A grade continua disponível para
              criar o primeiro.
            </p>
          )}
        </section>
      ) : null}
      {draft ? createPortal(
        <div className="calendar-modal-layer" style={Object.fromEntries(
          ["--tenant-primary", "--tenant-accent", "--tenant-soft", "--tenant-line"].map((name) => [name, getComputedStyle(document.querySelector(".tenant-root") ?? document.documentElement).getPropertyValue(name)]),
        ) as React.CSSProperties}>
          <button
            className="calendar-popover-backdrop"
            onClick={() => {
              setDraft(null);
              returnFocusRef.current?.focus();
            }}
            aria-label="Fechar evento"
          />
          <section
            ref={dialogRef}
            className="calendar-quick-create"
            role="dialog"
            aria-modal="true"
            aria-label={
              draft.appointmentId ? "Editar evento" : "Criar novo evento"
            }
          >
            <header>
              <div>
                <CalendarDays size={19} />
                <strong>
                  {draft.appointmentId ? "Editar evento" : "Novo evento"}
                </strong>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setDraft(null);
                  returnFocusRef.current?.focus();
                }}
                aria-label="Fechar formulário"
              >
                <X size={18} />
              </button>
            </header>
            <form
              action={
                demo
                  ? undefined
                  : draft.appointmentId
                    ? updateAction
                    : createAction
              }
              onSubmit={createDemo}
            >
              <input
                type="hidden"
                name="appointmentId"
                value={draft.appointmentId ?? ""}
              />
              <label className="field field--wide">
                <span>Título</span>
                <input
                  name="title"
                  maxLength={120}
                  placeholder="Ex.: Reunião de alinhamento"
                  value={titleDraft}
                  onChange={(event) => {
                    titleDirty.current = true;
                    setTitleDraft(event.target.value);
                  }}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label-with-action">
                  Cliente (opcional)
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomer((current) => !current)}
                    aria-label="Cadastrar cliente agora"
                    title="Cadastrar cliente agora"
                  >
                    <Plus size={15} />
                  </button>
                </span>
                <select
                  name="customerId"
                  value={
                    draft.appointmentId
                      ? ((selectedCustomerId ||
                          rows.find((item) => item.id === draft.appointmentId)
                            ?.customerId) ??
                        "")
                      : selectedCustomerId
                  }
                  onChange={(event) =>
                    setSelectedCustomerId(event.target.value)
                  }
                >
                  <option value="">Sem cliente</option>
                  {customerOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Serviço (opcional)</span>
                <select
                  name="serviceId"
                  value={selectedServiceId}
                  onChange={(event) => applyService(event.target.value)}
                >
                  <option value="">Evento livre</option>
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {selectedServiceId &&
                services.find((item) => item.id === selectedServiceId)
                  ?.priceCents != null ? (
                  <small>
                    Valor sugerido:{" "}
                    {formatMoney(
                      services.find((item) => item.id === selectedServiceId)!
                        .priceCents!,
                    )}
                  </small>
                ) : null}
              </label>
              {showQuickCustomer ? (
                <fieldset className="quick-customer field--wide">
                  <legend>Novo cliente</legend>
                  <label>
                    <span>Nome</span>
                    <input
                      value={quickCustomer.name}
                      onChange={(event) =>
                        setQuickCustomer((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Nome completo"
                    />
                  </label>
                  <label>
                    <span>Telefone</span>
                    <input
                      type="tel"
                      value={quickCustomer.phone}
                      onChange={(event) =>
                        setQuickCustomer((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                  <label>
                    <span>E-mail</span>
                    <input
                      type="email"
                      value={quickCustomer.email}
                      onChange={(event) =>
                        setQuickCustomer((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="cliente@email.com"
                    />
                  </label>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={saveQuickCustomer}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Salvando…" : "Adicionar cliente"}
                  </button>
                  {quickCustomerMessage ? (
                    <small>{quickCustomerMessage}</small>
                  ) : null}
                </fieldset>
              ) : null}
              <label className="field">
                <span>Início</span>
                <input
                  name="startsAt"
                  type="datetime-local"
                  value={`${draft.dateKey}T${minutesToTime(draft.startMinutes)}`}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            dateKey: event.target.value.slice(0, 10),
                            startMinutes: timeToMinutes(
                              event.target.value.slice(11),
                            ),
                          }
                        : current,
                    )
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Fim</span>
                <input
                  name="endsAt"
                  type="datetime-local"
                  value={`${draft.dateKey}T${minutesToTime(draft.endMinutes)}`}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            endMinutes: timeToMinutes(
                              event.target.value.slice(11),
                            ),
                          }
                        : current,
                    )
                  }
                  required
                />
              </label>
              <input
                type="hidden"
                name="kind"
                value={selectedServiceId ? "appointment" : "custom"}
              />
              <fieldset className="event-color-picker field--wide">
                <legend>Cor do evento</legend>
                {EVENT_COLORS.map((color, index) => (
                  <label
                    key={color}
                    style={{ "--event-color": color } as React.CSSProperties}
                    title={`Cor ${index + 1}`}
                  >
                    <input
                      name="color"
                      type="radio"
                      value={color}
                      checked={colorDraft === color}
                      onChange={() => {
                        colorDirty.current = true;
                        setColorDraft(color);
                      }}
                    />
                    <span>{colorDraft === color ? "✓" : ""}</span>
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span>Local</span>
                <input
                  name="location"
                  maxLength={240}
                  placeholder="Sala, endereço ou link"
                  defaultValue={
                    draft.appointmentId
                      ? rows.find((item) => item.id === draft.appointmentId)
                          ?.location
                      : ""
                  }
                />
              </label>
              {!draft.appointmentId ? (
                <label className="field">
                  <span>
                    <Bell size={14} /> Lembrete
                  </span>
                  <select name="reminderMinutes" defaultValue="60">
                    <option value="0">Sem lembrete</option>
                    <option value="10">10 minutos antes</option>
                    <option value="30">30 minutos antes</option>
                    <option value="60">1 hora antes</option>
                    <option value="1440">1 dia antes</option>
                  </select>
                </label>
              ) : null}
              <label className="field field--wide">
                <span>Descrição</span>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={1000}
                  defaultValue={
                    draft.appointmentId
                      ? rows.find((item) => item.id === draft.appointmentId)
                          ?.description
                      : ""
                  }
                />
              </label>
              <label className="field field--wide">
                <span>Observações internas</span>
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  defaultValue={
                    draft.appointmentId
                      ? (rows.find((item) => item.id === draft.appointmentId)
                          ?.notes ?? "")
                      : ""
                  }
                />
              </label>
              <footer>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    setDraft(null);
                    returnFocusRef.current?.focus();
                  }}
                >
                  Cancelar
                </button>
                <button className="button button--primary" disabled={pending}>
                  {pending
                    ? "Salvando…"
                    : draft.appointmentId
                      ? "Salvar alterações"
                      : "Salvar evento"}
                </button>
              </footer>
            </form>
          </section>
        </div>,
        document.body,
      ) : null}
      {selectedEvent ? (
        <>
          <button
            className="drawer-backdrop"
            onClick={() => setSelectedEventId(null)}
            aria-label="Fechar detalhes"
          />
          <aside className="detail-drawer appointment-drawer">
            <button
              className="icon-button"
              onClick={() => setSelectedEventId(null)}
              aria-label="Fechar detalhes"
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Evento</p>
            <h2>{selectedEvent.title}</h2>
            <p>
              {selectedEvent.client} · {selectedEvent.service}
            </p>
            <dl>
              <div>
                <dt>Data</dt>
                <dd>{dateLabel(selectedEvent.dateKey)}</dd>
              </div>
              <div>
                <dt>Horário</dt>
                <dd>
                  {selectedEvent.time}–{selectedEvent.endTime}
                </dd>
              </div>
              <div>
                <dt>Duração</dt>
                <dd>{selectedEvent.durationMinutes} min</dd>
              </div>
              <div>
                <dt>Local</dt>
                <dd>{selectedEvent.location || "Não informado"}</dd>
              </div>
            </dl>
            <label className="field">
              <span>Observações</span>
              <textarea
                rows={5}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
              />
            </label>
            <button
              className="button button--secondary drawer-save"
              onClick={() => {
                if (demo)
                  setRows((items) =>
                    items.map((item) =>
                      item.id === selectedEvent.id
                        ? { ...item, notes: notesDraft }
                        : item,
                    ),
                  );
                else
                  startUpdating(async () =>
                    setFeedback(
                      (
                        await updateAppointmentNotes(
                          selectedEvent.id,
                          notesDraft,
                        )
                      ).message,
                    ),
                  );
              }}
              disabled={pendingIds.has(selectedEvent.id)}
            >
              Salvar detalhes
            </button>
            <div className="drawer-actions">
              <button
                className="button button--secondary"
                onClick={() => {
                  setTitleDraft(selectedEvent.title);
                  setColorDraft(
                    EVENT_COLORS.includes(selectedEvent.color)
                      ? selectedEvent.color
                      : EVENT_COLORS[0],
                  );
                  setSelectedServiceId(selectedEvent.serviceId ?? "");
                  titleDirty.current = false;
                  colorDirty.current = false;
                  setDraft({
                    appointmentId: selectedEvent.id,
                    dateKey: selectedEvent.dateKey,
                    startMinutes: selectedEvent.startMinutes,
                    endMinutes:
                      selectedEvent.startMinutes +
                      selectedEvent.durationMinutes,
                  });
                  setSelectedEventId(null);
                }}
              >
                Editar e remarcar
              </button>
              <button
                className="button button--ghost"
                disabled={pendingIds.has(selectedEvent.id)}
                onClick={() =>
                  saveDuration(
                    selectedEvent,
                    selectedEvent.durationMinutes - slotInterval,
                  )
                }
              >
                − {slotInterval} min
              </button>
              <button
                className="button button--ghost"
                disabled={pendingIds.has(selectedEvent.id)}
                onClick={() =>
                  saveDuration(
                    selectedEvent,
                    selectedEvent.durationMinutes + slotInterval,
                  )
                }
              >
                + {slotInterval} min
              </button>
              {whatsappUrl ? (
                <a
                  className="button button--whatsapp"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={17} /> WhatsApp
                </a>
              ) : (
                <button className="button button--whatsapp" disabled>
                  <MessageCircle size={17} /> WhatsApp
                </button>
              )}
            </div>
            <small className="drawer-hint">
              Arraste para mover. Use a borda inferior ou os controles para
              ajustar a duração.
            </small>
          </aside>
        </>
      ) : null}
    </>
  );
}

type TimelineProps = {
  timeZone: string;
  days: { label: string; dateKey: string }[];
  today: string;
  slots: number[];
  slotInterval: SlotInterval;
  dayStart: number;
  timelineMinutes: number;
  events: CalendarEvent[];
  selection: Draft | null;
  openDraft: (date: string, start?: number, end?: number) => void;
  startSelection: (
    date: string,
    minute: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  renderEvent: (event: CalendarEvent) => React.ReactNode;
};
function Timeline({
  timeZone,
  days,
  today,
  slots,
  slotInterval,
  dayStart,
  timelineMinutes,
  events,
  selection,
  openDraft,
  startSelection,
  renderEvent,
}: TimelineProps) {
  const hours = slots.filter((minute) => minute % 60 === 0);
  return (
    <div className="calendar-scroll">
      <section
        className={`calendar-panel${days.length === 1 ? " calendar-panel--day" : ""}`}
        style={
          {
            "--calendar-columns": days.length,
            "--calendar-height": `${(timelineMinutes / 60) * HOUR_HEIGHT}px`,
            "--calendar-slot-height": `${(slotInterval / 60) * HOUR_HEIGHT}px`,
          } as React.CSSProperties
        }
      >
        <div className="calendar-head">
          <span title={timeZone}>Horários</span>
          {days.map((day) => (
            <strong
              key={day.dateKey}
              className={day.dateKey === today ? "today" : ""}
            >
              {day.label}
            </strong>
          ))}
        </div>
        <div className="calendar-body">
          <div className="calendar-times">
            {hours.map((minute) => (
              <span
                key={minute}
                style={{ top: `${((minute - dayStart) / 60) * HOUR_HEIGHT}px` }}
              >
                {minutesToTime(minute)}
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div
              className="calendar-day"
              data-date={day.dateKey}
              key={day.dateKey}
            >
              {slots.map((minute) => (
                <button
                  key={minute}
                  data-date={day.dateKey}
                  data-minute={minute}
                  onPointerDown={(event) =>
                    startSelection(day.dateKey, minute, event)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      openDraft(day.dateKey, minute);
                  }}
                  aria-label={`Criar às ${minutesToTime(minute)} em ${day.label}`}
                />
              ))}
              {selection?.dateKey === day.dateKey ? (
                <div
                  className="calendar-selection"
                  style={{
                    top: `${((selection.startMinutes - dayStart) / 60) * HOUR_HEIGHT}px`,
                    height: `${((selection.endMinutes - selection.startMinutes) / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  {minutesToTime(selection.startMinutes)}–
                  {minutesToTime(selection.endMinutes)}
                </div>
              ) : null}
              {events
                .filter((event) => event.dateKey === day.dateKey)
                .map(renderEvent)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function MonthCalendar({
  anchorDate,
  today,
  events,
  openDraft,
  openEvent,
}: {
  anchorDate: string;
  today: string;
  events: CalendarEvent[];
  openDraft: (date: string) => void;
  openEvent: (event: CalendarEvent) => void;
}) {
  const monthStart = `${anchorDate.slice(0, 7)}-01`;
  const offset = new Date(`${monthStart}T00:00:00Z`).getUTCDay();
  const gridStart = shiftDateKey(monthStart, -offset);
  return (
    <section className="month-calendar">
      <header>
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </header>
      <div>
        {Array.from({ length: 42 }, (_, index) =>
          shiftDateKey(gridStart, index),
        ).map((date) => {
          const dateEvents = events.filter((event) => event.dateKey === date);
          return (
            <article
              key={date}
              className={`${date.slice(0, 7) !== anchorDate.slice(0, 7) ? "outside" : ""} ${date === today ? "today" : ""}`}
            >
              <button
                className="month-calendar__date"
                onClick={() => openDraft(date)}
              >
                {Number(date.slice(8, 10))}
              </button>
              {dateEvents.slice(0, 3).map((event) => (
                <button
                  className="month-calendar__event"
                  key={event.id}
                  onClick={() => openEvent(event)}
                >
                  <time>{event.time}</time> {event.title}
                </button>
              ))}
              {dateEvents.length > 3 ? (
                <a
                  className="month-calendar__more"
                  href={calendarRoute("day", date)}
                >
                  +{dateEvents.length - 3} eventos
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
function isVisibleInView(
  date: string,
  view: CalendarView,
  anchor: string,
  week: string,
) {
  if (view === "day") return date === anchor;
  if (view === "month") return date.slice(0, 7) === anchor.slice(0, 7);
  return date >= week && date <= shiftDateKey(week, 6);
}
function shiftMonth(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 10);
}
function periodLabel(view: CalendarView, anchor: string, week: string) {
  if (view === "day") return dateLabel(anchor);
  if (view === "month")
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`));
  return weekRangeLabel(week);
}
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function buildWhatsappUrl(event: CalendarEvent) {
  const digits = (event.phone ?? "").replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Olá, ${event.client}! Seu evento ${event.title} está marcado para ${dateLabel(event.dateKey)}, das ${event.time} às ${event.endTime}.`)}`;
}
function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
