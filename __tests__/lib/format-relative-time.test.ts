import { formatRelativeTime } from "@/lib/format-relative-time";

describe("formatRelativeTime", () => {
  const baseTime = new Date("2026-03-07T12:00:00.000Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseTime);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'just now' when date is within the last minute", () => {
    const date = new Date("2026-03-07T11:59:30.000Z");
    expect(formatRelativeTime(date)).toBe("just now");
  });

  it("returns 'X minutes ago' when date is within the last hour", () => {
    const date = new Date("2026-03-07T11:55:00.000Z");
    expect(formatRelativeTime(date)).toBe("5 minutes ago");
  });

  it("returns '1 minute ago' when exactly one minute has passed", () => {
    const date = new Date("2026-03-07T11:59:00.000Z");
    expect(formatRelativeTime(date)).toBe("1 minute ago");
  });

  it("returns 'X hours ago' when date is within the last day", () => {
    const date = new Date("2026-03-07T09:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("3 hours ago");
  });

  it("returns '1 hour ago' when exactly one hour has passed", () => {
    const date = new Date("2026-03-07T11:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("1 hour ago");
  });

  it("returns 'X days ago' when date is within the last 30 days", () => {
    const date = new Date("2026-03-05T12:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("2 days ago");
  });

  it("returns '1 day ago' when exactly one day has passed", () => {
    const date = new Date("2026-03-06T12:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("1 day ago");
  });

  it("returns locale date string when date is older than 30 days", () => {
    const date = new Date("2026-01-01T12:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("Jan 1, 2026");
  });
});
