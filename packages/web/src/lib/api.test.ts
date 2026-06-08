import { describe, it, expect } from 'vitest';
import { api } from './api';

describe('api', () => {
  it('has trash related functions', () => {
    expect(typeof api.getTrashFiles).toBe('function');
    expect(typeof api.restoreFile).toBe('function');
    expect(typeof api.deleteFilePermanent).toBe('function');
  });
});
