import Sprite from './sprite.mjs'
import fs from 'fs';

const result = Sprite.generate();
const magnified = result.magnify();
const bmpData = magnified.asBitmapData();

// Save to file
const filename = 'output.bmp';
fs.writeFileSync(filename, Buffer.from(bmpData), 'binary');
console.log(`Written: ${filename}`);
