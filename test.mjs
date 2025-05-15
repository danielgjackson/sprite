import Sprite from './sprite.mjs'
import fs from 'fs';

const seed = process.argv.length > 2 ? process.argv.slice(2).join(' ') : null;
const monochrome = false;

const result = Sprite.generate(seed, monochrome);

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
if (1) {
  const sixelData = generateImageTerminalSixel(colorData, result.width, result.height, 2);
  console.log(sixelData);
}

function outputImageTerminal(colorData, width, height) {
  const t = '██'; // '██'; // '██', '▓▓', '▒▒', '░░'
  for (let y = 0; y < height; y++) {
    const lineParts = [];
    for (let x = 0; x < width; x++) {
      const c = colorData[y * width + x];
      lineParts.push(`\x1B[38;2;${c[0]};${c[1]};${c[2]}m${t}`);
    }
    lineParts.push('\x1B[0m');
    console.log(lineParts.join(''));
  }
}

function outputImageTerminalSmall(colorData, width, height) {
  for (let y = 0; y < height; y += 2) {
    const lineParts = [];
    for (let x = 0; x < width; x++) {
      let c;
      
      // Background color
      if (y + 1 < height) {
        c = colorData[(y + 1) * width + x];
        lineParts.push(`\x1B[48;2;${c[0]};${c[1]};${c[2]}m`);
      } else {
        lineParts.push('\x1B[0m');  // reset (for background)
      }
      
      // Upper/foreground color and character
      c = colorData[y * width + x];
      lineParts.push(`\x1B[38;2;${c[0]};${c[1]};${c[2]}m▀`);
    }
    lineParts.push('\x1B[0m');
    console.log(lineParts.join(''));
  }
}


function generateImageTerminalSixel(colorData, width, height, scale) {
    const LINE_HEIGHT = 6;
    const parts = [];

    // Calculate mapping to sixel color code
    const toCode = {};
    for (let y = 0; y < height; y ++) {
        for (let x = 0; x < width * scale; x += scale) {
            const c = colorData[y * width + x]; // c[0], c[1], c[2]
            if (c == null) continue;
            const r = Math.floor(100 * c[0] / 255);
            const g = Math.floor(100 * c[1] / 255);
            const b = Math.floor(100 * c[2] / 255);
            const code = `${r};${g};${b}`;
            toCode[c] = code;
        }
    }
    // Calculate unique color codes
    const codeMap = {};
    for (const c of Object.values(toCode)) {
      codeMap[c] = true;
    }
    const codes = Object.keys(codeMap);

    // Enter sixel mode
    parts.push('\x1BP7;1q');    // 1:1 ratio, 0 pixels remain at current color
    // Set color map
    parts.push('#0;2;0;0;0');       // Background
    for (let y = 0; y < height * scale; y += LINE_HEIGHT) {
        let passCount = 0;
        for (let pass of codes) {
            // Start a pass in a specific color
            const passStart = (passCount++ == 0 ? '' : '$') + '#' + 1 + ';2;' + pass;
            let lastX = 0;
            // Line data
            for (let x = 0; x < width * scale; x += scale) {
                let value = 0;
                for (let yy = 0; yy < LINE_HEIGHT; yy++) {
                    const c = colorData[Math.floor((y + yy) / scale) * width + Math.floor(x / scale)];
                    if (c == null) continue;
                    const code = toCode[c]; // c[0], c[1], c[2]
                    if (code == null) continue;
                    if (code != pass) {
                        // Not the current color
                        continue;
                    }
                    value |= 1 << yy;
                }
                if (value > 0) {
                  if (lastX == 0) {
                    parts.push(passStart);
                  }
                  const gap = x - lastX;
                  if (gap > 0) {
                    // Gap of empty pixels to the current position
                    if (gap <= 3) {
                      parts.push('?'.repeat(gap));
                    } else {
                      parts.push('!' + gap + '?');
                    }
                  }
                  const code = (scale > 3 ? '!' + scale : '') + String.fromCharCode(value + 63).repeat(scale <= 3 ? scale : 1);
                  // Six pixels strip at 'scale' (repeated) width
                  parts.push(code);
                  lastX = x + scale;
                }
            }
        }
        // Next line
        if (y + LINE_HEIGHT < height * scale) {
            parts.push('-');
        }
    }
    // Exit sixel mode
    parts.push('\x1B\\');
    return parts.join('');
}
