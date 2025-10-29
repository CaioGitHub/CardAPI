import { OpeningHour, OpeningHourWindow } from "./types"

const WEEKDAY_LABELS_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]

const SHORT_WEEKDAY_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

type NormalizedWindow = OpeningHourWindow & {
  startMinutes: number
  endMinutes: number
}

function timeToMinutes(time: string): number {
  const [hourRaw, minuteRaw] = time.split(":")
  const hours = Number.parseInt(hourRaw ?? "", 10)
  const minutes = Number.parseInt(minuteRaw ?? "", 10)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return -1
  }

  return hours * 60 + minutes
}

function normalizeWindows(windows: OpeningHourWindow[]): NormalizedWindow[] {
  return windows
    .map((window) => {
      const startMinutes = timeToMinutes(window.opensAt)
      const endMinutes = timeToMinutes(window.closesAt)

      if (startMinutes === -1 || endMinutes === -1 || endMinutes <= startMinutes) {
        return null
      }

      return {
        ...window,
        startMinutes,
        endMinutes,
      }
    })
    .filter((window): window is NormalizedWindow => Boolean(window))
    .sort((a, b) => a.startMinutes - b.startMinutes)
}

type DaySchedule = {
  dayOfWeek: number
  windows: NormalizedWindow[]
}

type ZonedNow = {
  dayIndex: number
  minutesSinceMidnight: number
}

function getZonedNow(timezone: string, now = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now)

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  const weekday = partMap.weekday?.toLowerCase() ?? "sun"
  const dayIndex = SHORT_WEEKDAY_TO_INDEX[weekday] ?? 0
  const hour = Number.parseInt(partMap.hour ?? "0", 10) || 0
  const minute = Number.parseInt(partMap.minute ?? "0", 10) || 0

  return {
    dayIndex,
    minutesSinceMidnight: hour * 60 + minute,
  }
}

export type RestaurantStatus = {
  isOpen: boolean
  label: "Aberto" | "Fechado"
  currentDayIndex: number
  todaysWindows: OpeningHourWindow[]
  nextOpen?: {
    dayOfWeek: number
    opensAt: string
  }
  closesAt?: string
}

function buildDaySchedules(openingHours: OpeningHour[]): DaySchedule[] {
  const schedules = new Map<number, NormalizedWindow[]>()

  for (const entry of openingHours) {
    if (!schedules.has(entry.dayOfWeek)) {
      schedules.set(entry.dayOfWeek, [])
    }

    schedules.get(entry.dayOfWeek)!.push(...normalizeWindows(entry.windows))
  }

  return Array.from(schedules.entries())
    .map(([dayOfWeek, windows]) => ({
      dayOfWeek,
      windows: windows.sort((a, b) => a.startMinutes - b.startMinutes),
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

function findTodaySchedule(
  schedules: DaySchedule[],
  dayIndex: number,
): DaySchedule | undefined {
  return schedules.find((schedule) => schedule.dayOfWeek === dayIndex)
}

function findNextWindow(
  schedules: DaySchedule[],
  startingDayIndex: number,
  nowMinutes: number,
): { dayOfWeek: number; opensAt: string } | undefined {
  for (let offset = 0; offset < 7; offset += 1) {
    const dayIndex = (startingDayIndex + offset) % 7
    const schedule = findTodaySchedule(schedules, dayIndex)
    if (!schedule || schedule.windows.length === 0) continue

    const window = schedule.windows.find((win) =>
      offset === 0 ? win.startMinutes > nowMinutes : true,
    )

    if (window) {
      return {
        dayOfWeek: dayIndex,
        opensAt: window.opensAt,
      }
    }
  }

  return undefined
}

export function getRestaurantStatus(
  openingHours: OpeningHour[],
  timezone: string,
  now = new Date(),
): RestaurantStatus {
  if (openingHours.length === 0) {
    return {
      isOpen: true,
      label: "Aberto",
      currentDayIndex: getZonedNow(timezone, now).dayIndex,
      todaysWindows: [
        {
          opensAt: "00:00",
          closesAt: "23:59",
        },
      ],
    }
  }

  const { dayIndex, minutesSinceMidnight } = getZonedNow(timezone, now)
  const schedules = buildDaySchedules(openingHours)
  const todaySchedule = findTodaySchedule(schedules, dayIndex)

  const todaysWindows = todaySchedule?.windows ?? []
  const currentWindow = todaysWindows.find(
    (window) =>
      minutesSinceMidnight >= window.startMinutes &&
      minutesSinceMidnight < window.endMinutes,
  )

  if (currentWindow) {
    return {
      isOpen: true,
      label: "Aberto",
      currentDayIndex: dayIndex,
      todaysWindows: todaysWindows.map(({ opensAt, closesAt }) => ({
        opensAt,
        closesAt,
      })),
      closesAt: currentWindow.closesAt,
    }
  }

  const nextOpen = findNextWindow(schedules, dayIndex, minutesSinceMidnight)

  return {
    isOpen: false,
    label: "Fechado",
    currentDayIndex: dayIndex,
    todaysWindows: todaysWindows.map(({ opensAt, closesAt }) => ({
      opensAt,
      closesAt,
    })),
    nextOpen,
  }
}

export function getWeekdayLabel(dayIndex: number): string {
  return WEEKDAY_LABELS_PT[dayIndex] ?? WEEKDAY_LABELS_PT[0]
}
