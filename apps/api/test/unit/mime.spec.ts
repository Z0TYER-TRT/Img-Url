import { extFor, kindOf, sniffMime } from '../../src/files/mime';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('mime', () => {
  it('sniffs a png from bytes', () => {
    expect(sniffMime(PNG)).toBe('image/png');
    expect(kindOf('image/png')).toBe('image');
    expect(extFor('image/png')).toBe('png');
  });

  it('maps video mimes to the video kind', () => {
    expect(kindOf('video/mp4')).toBe('video');
    expect(kindOf('video/webm')).toBe('video');
  });

  it('rejects svg so a script cannot run on our origin', () => {
    expect(kindOf('image/svg+xml')).toBeNull();
  });

  it('rejects types it cannot name or serve, such as tiff', () => {
    expect(kindOf('image/tiff')).toBeNull();
    expect(kindOf('application/octet-stream')).toBeNull();
  });

  it('rejects unknown bytes', () => {
    expect(sniffMime(Buffer.from('hello'))).toBeNull();
    expect(kindOf(null)).toBeNull();
  });

  it('falls back to bin for an unmapped mime', () => {
    expect(extFor('image/tiff')).toBe('bin');
  });
});
