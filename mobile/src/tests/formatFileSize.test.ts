import { formatFileSize } from '../utils/fileSize';

describe('formatFileSize', () => {
  it('returns empty string for undefined', () => {
    expect(formatFileSize(undefined)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatFileSize(0)).toBe('');
  });

  it('returns empty string for negative values', () => {
    expect(formatFileSize(-1024)).toBe('');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats whole kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats fractional kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats whole megabytes', () => {
    expect(formatFileSize(1_048_576)).toBe('1 MB');
  });

  it('formats fractional megabytes', () => {
    expect(formatFileSize(1_572_864)).toBe('1.5 MB');
  });

  it('formats whole gigabytes', () => {
    expect(formatFileSize(1_073_741_824)).toBe('1 GB');
  });

  it('formats fractional gigabytes', () => {
    expect(formatFileSize(2_684_354_560)).toBe('2.5 GB');
  });
});
