import { describe, it, expect } from 'vitest';
import ads from '../src/core/ads.js';
import fs from 'node:fs';

const { AD_TEMPLATES } = ads;

describe('AD_TEMPLATES', () => {
  it('封面是打包页面内的离线素材，无网络依赖', () => {
    for (const ad of AD_TEMPLATES) {
      for (const product of ad.products) {
        expect(product.icon).toMatch(/^assets\/promotion\/[a-z-]+\.png$/);
        expect(fs.existsSync(new URL('../src/renderer/' + product.icon, import.meta.url))).toBe(true);
      }
    }
  });

  it('每套模板都有渲染所需字段', () => {
    for (const ad of AD_TEMPLATES) {
      expect(typeof ad.id).toBe('string');
      expect(typeof ad.title).toBe('string');
      expect(typeof ad.brand).toBe('string');
      expect(typeof ad.category).toBe('string');
      expect(typeof ad.subtitle).toBe('string');
    }
  });

  it('id 互不相同', () => {
    const ids = AD_TEMPLATES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
