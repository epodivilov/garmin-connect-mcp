import { describe, it, expect } from 'vitest';
import { formatDuration, formatPace, formatSwimPace } from '../../src/utils/formatters.js';

describe('formatDuration', () => {
  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(3000)).toBe('50:00');
    expect(formatDuration(421)).toBe('7:01');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(119)).toBe('1:59');
  });

  it('formats hours, minutes, and seconds correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(7261)).toBe('2:01:01');
  });

  it('handles zero correctly', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('pads single-digit values with zeros', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(305)).toBe('5:05');
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('handles large durations', () => {
    expect(formatDuration(36000)).toBe('10:00:00'); // 10 hours
    expect(formatDuration(86400)).toBe('24:00:00'); // 24 hours
  });
});

describe('formatPace', () => {
  it('formats pace correctly', () => {
    expect(formatPace(421)).toBe('7:01 /km');
    expect(formatPace(300)).toBe('5:00 /km');
    expect(formatPace(240)).toBe('4:00 /km');
  });

  it('rounds seconds to nearest whole number', () => {
    expect(formatPace(301.4)).toBe('5:01 /km');
    expect(formatPace(301.6)).toBe('5:02 /km');
  });

  it('handles sub-4-minute pace', () => {
    expect(formatPace(180)).toBe('3:00 /km');
    expect(formatPace(210)).toBe('3:30 /km');
  });

  it('handles slow pace', () => {
    expect(formatPace(600)).toBe('10:00 /km');
    expect(formatPace(720)).toBe('12:00 /km');
  });

  it('pads seconds with zeros', () => {
    expect(formatPace(305)).toBe('5:05 /km');
    expect(formatPace(249)).toBe('4:09 /km');
  });
});

describe('formatSwimPace', () => {
  it('formats swim pace correctly', () => {
    expect(formatSwimPace(105)).toBe('1:45 /100m');
    expect(formatSwimPace(90)).toBe('1:30 /100m');
    expect(formatSwimPace(120)).toBe('2:00 /100m');
  });

  it('rounds seconds to nearest whole number', () => {
    expect(formatSwimPace(90.4)).toBe('1:30 /100m');
    expect(formatSwimPace(90.6)).toBe('1:31 /100m');
  });

  it('handles fast swim pace', () => {
    expect(formatSwimPace(75)).toBe('1:15 /100m');
    expect(formatSwimPace(60)).toBe('1:00 /100m');
  });

  it('handles slow swim pace', () => {
    expect(formatSwimPace(150)).toBe('2:30 /100m');
    expect(formatSwimPace(180)).toBe('3:00 /100m');
  });

  it('pads seconds with zeros', () => {
    expect(formatSwimPace(65)).toBe('1:05 /100m');
    expect(formatSwimPace(129)).toBe('2:09 /100m');
  });
});
