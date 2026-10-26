// File type detection. The server is the source of truth; the frontend mirrors this list.
const TEXT = ('txt md markdown html htm css scss js jsx ts tsx json xml sql py java c cpp h hpp cs go rs rb php sh bat ' +
  'yml yaml toml ini log csv tsv').split(' ');
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
const AUDIO = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
const VIDEO = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

const KINDS = ['text', 'image', 'audio', 'video', 'pdf', 'docx', 'xlsx', 'pptx', 'other'];

const extOf = name => (String(name).includes('.') ? String(name).split('.').pop().toLowerCase() : '');

const kindOf = ext =>
  TEXT.includes(ext) ? 'text' : IMAGE.includes(ext) ? 'image' : AUDIO.includes(ext) ? 'audio' :
  VIDEO.includes(ext) ? 'video' : ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' :
  ['xlsx', 'xls'].includes(ext) ? 'xlsx' : ext === 'pptx' ? 'pptx' : 'other';

module.exports = { KINDS, extOf, kindOf };
