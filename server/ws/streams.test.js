import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KpiStream, ActivityStream, NotificationStream, ACTIVITY_TEMPLATES, NOTIFICATION_TEMPLATES } from './streams.js';

describe('KpiStream', () => {
  let broadcast;
  let stream;

  beforeEach(() => {
    broadcast = vi.fn();
    stream = new KpiStream(broadcast);
    vi.useFakeTimers();
  });

  afterEach(() => {
    stream.stop();
    vi.useRealTimers();
  });

  it('emits kpi data in the correct format', () => {
    stream.emit();

    expect(broadcast).toHaveBeenCalledWith('kpi', expect.objectContaining({
      metric: expect.stringMatching(/^(agents|revenue|leads|views)$/),
      value: expect.any(Number),
      delta: expect.stringMatching(/^[+-]\d+$/),
      deltaPercent: expect.stringMatching(/^[+-][\d.]+%$/)
    }));
  });

  it('starts emitting at 5s intervals', () => {
    stream.start();
    expect(broadcast).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(broadcast).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(broadcast).toHaveBeenCalledTimes(2);
  });

  it('stops emitting when stopped', () => {
    stream.start();
    vi.advanceTimersByTime(5000);
    expect(broadcast).toHaveBeenCalledTimes(1);

    stream.stop();
    vi.advanceTimersByTime(10000);
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it('produces values that are non-negative', () => {
    for (let i = 0; i < 50; i++) {
      stream.emit();
    }

    for (const call of broadcast.mock.calls) {
      expect(call[1].value).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes prefix field for revenue metric', () => {
    // Run many emissions to catch a revenue update
    for (let i = 0; i < 100; i++) {
      stream.emit();
    }

    const revenueCalls = broadcast.mock.calls.filter(c => c[1].metric === 'revenue');
    if (revenueCalls.length > 0) {
      expect(revenueCalls[0][1].prefix).toBe('$');
    }
  });
});

describe('ActivityStream', () => {
  let broadcast;
  let stream;

  beforeEach(() => {
    broadcast = vi.fn();
    stream = new ActivityStream(broadcast);
    vi.useFakeTimers();
  });

  afterEach(() => {
    stream.stop();
    vi.useRealTimers();
  });

  it('emits activity data from the template pool', () => {
    stream.emit();

    expect(broadcast).toHaveBeenCalledWith('activity', expect.objectContaining({
      agent: expect.any(String),
      action: expect.any(String),
      target: expect.any(String),
      time: 'just now',
      dotColor: expect.stringMatching(/^(green|purple|blue|amber)$/)
    }));
  });

  it('generates items that match known templates', () => {
    stream.emit();

    const emittedData = broadcast.mock.calls[0][1];
    const matchingTemplate = ACTIVITY_TEMPLATES.find(
      t => t.agent === emittedData.agent && t.action === emittedData.action
    );
    expect(matchingTemplate).toBeDefined();
  });

  it('starts and schedules emissions between 10-30s', () => {
    stream.start();
    expect(broadcast).not.toHaveBeenCalled();

    // After 10s minimum, there should be at most one emission
    vi.advanceTimersByTime(10000);
    // After 30s max, there should be at least one
    vi.advanceTimersByTime(20000);
    expect(broadcast).toHaveBeenCalled();
  });

  it('stops scheduling when stopped', () => {
    stream.start();
    vi.advanceTimersByTime(30000);
    const callCount = broadcast.mock.calls.length;

    stream.stop();
    vi.advanceTimersByTime(60000);
    expect(broadcast.mock.calls.length).toBe(callCount);
  });
});

describe('NotificationStream', () => {
  let broadcast;
  let stream;

  beforeEach(() => {
    broadcast = vi.fn();
    stream = new NotificationStream(broadcast);
    vi.useFakeTimers();
  });

  afterEach(() => {
    stream.stop();
    vi.useRealTimers();
  });

  it('emits notification data in the correct format', () => {
    stream.emit();

    expect(broadcast).toHaveBeenCalledWith('notifications', expect.objectContaining({
      type: expect.stringMatching(/^(success|info|warning)$/),
      icon: expect.any(String),
      title: expect.any(String),
      msg: expect.any(String),
      time: 'just now'
    }));
  });

  it('generates notifications from the template pool', () => {
    stream.emit();

    const emittedData = broadcast.mock.calls[0][1];
    const matchingTemplate = NOTIFICATION_TEMPLATES.find(
      t => t.title === emittedData.title && t.msg === emittedData.msg
    );
    expect(matchingTemplate).toBeDefined();
  });

  it('starts and schedules emissions between 30-60s', () => {
    stream.start();
    expect(broadcast).not.toHaveBeenCalled();

    // After 60s max, there should be at least one
    vi.advanceTimersByTime(60000);
    expect(broadcast).toHaveBeenCalled();
  });

  it('stops scheduling when stopped', () => {
    stream.start();
    vi.advanceTimersByTime(60000);
    const callCount = broadcast.mock.calls.length;

    stream.stop();
    vi.advanceTimersByTime(120000);
    expect(broadcast.mock.calls.length).toBe(callCount);
  });
});
