import Sprite from './sprite.mjs'
import fs from 'fs';

const result = Sprite.generate();

// Output as data: URL
const url = result.asDataUri(false);
console.log(url);

// Output to bmp file
const filename = 'output.bmp';
const bmpData = result.magnify().asBitmapData(false);
fs.writeFileSync(filename, Buffer.from(bmpData), 'binary');
console.log(`Written: ${filename}`);

// Output to terminal (uses RGB ANSI sequences)
const colorData = result.createColorData(result.colors);
console.log();
outputImageTerminal(colorData, result.width, result.height);
console.log();
outputImageTerminalSmall(colorData, result.width, result.height);
console.log();

function outputImageTerminal(color, width, height) {
  const t = '██'; // '██'; // '██', '▓▓', '▒▒', '░░'
  for (let y = 0; y < result.height; y++) {
    const lineParts = [];
    for (let x = 0; x < result.width; x++) {
      const c = colorData[y * result.width + x];
      lineParts.push(`\x1B[38;2;${c[0]};${c[1]};${c[2]}m${t}`);
    }
    lineParts.push('\x1B[0m');
    console.log(lineParts.join(''));
  }
}

function outputImageTerminalSmall(color, width, height) {
  for (let y = 0; y < result.height; y += 2) {
    const lineParts = [];
    for (let x = 0; x < result.width; x++) {
      let c;
      
      // Background color
      if (y + 1 < result.height) {
        c = colorData[(y + 1) * result.width + x];
        lineParts.push(`\x1B[48;2;${c[0]};${c[1]};${c[2]}m`);
      } else {
        lineParts.push('\x1B[0m');  // reset (for background)
      }
      
      // Upper/foreground color and character
      c = colorData[y * result.width + x];
      lineParts.push(`\x1B[38;2;${c[0]};${c[1]};${c[2]}m▀`);
    }
    lineParts.push('\x1B[0m');
    console.log(lineParts.join(''));
  }
}
