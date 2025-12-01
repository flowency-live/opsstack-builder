import SpecPreviewPanel from '@/components/SpecPreviewPanel';

describe('Debug Import', () => {
  it('should import component', () => {
    console.log('Component:', SpecPreviewPanel);
    console.log('Type:', typeof SpecPreviewPanel);
    expect(typeof SpecPreviewPanel).toBe('function');
  });
});
