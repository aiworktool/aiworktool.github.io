import { describe, expect, it } from 'vitest';
import { explainCron } from './explainCron';

describe('explainCron', () => {
  const from = new Date(2023, 10, 15, 6, 10, 30);

  it('lists the next quarter hours after the current minute', () => {
    const result = explainCron('*/15 * * * *', 'zh', from);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].text).toContain('0,15,30,45');
    expect(result.next[0]).toContain('06:15:00');
    expect(result.next[1]).toContain('06:30:00');
    expect(result.next).toHaveLength(5);
  });

  it('treats a restricted day and weekday as either match', () => {
    const result = explainCron('0 0 1 * 1', 'zh', from);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next[0]).toContain('00:00:00');
  });

  it('rejects an expression that is not five fields', () => {
    expect(explainCron('* * *', 'zh', from).ok).toBe(false);
    expect(explainCron('60 * * * *', 'zh', from).ok).toBe(false);
  });
});
