import Sprite from './sprite.mjs'
import fs from 'fs';

const seed = process.argv.length > 2 ? process.argv.slice(2).join(' ') : null;
const monochrome = false;

const result = Sprite.generate(seed, monochrome);

console.log(`Seed: ${result.seed}`);

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
if (0) {
  const sixelData = generateImageTerminalSixel(colorData, result.width, result.height, 2);
  console.log(sixelData);
}
if (1) {
  const graphicsProtocolData = generateImageTerminalGraphicsProtocol(colorData, result.width, result.height, 2);
  console.log(graphicsProtocolData);
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


function generateImageTerminalGraphicsProtocol(colorData, width, height, scale, alpha = false) {
    const MAX_CHUNK_SIZE = 4096;

    // Create buffer for scaled image data
    const buffer = new Uint8Array((width * scale) * (height * scale) * (alpha ? 4 : 3));
    for (let y = 0; y < height * scale; y++) {
      for (let x = 0; x < width * scale; x++) {
        const c = colorData[Math.floor(y / scale) * width + Math.floor(x / scale)];
        if (c == null) continue;
        const ofs = (y * (width * scale) + x) * (alpha ? 4 : 3);
        buffer[ofs + 0] = c[0]; // r
        buffer[ofs + 1] = c[1]; // g
        buffer[ofs + 2] = c[2]; // b
        if (alpha) buffer[ofs + 3] = c[3]; // a
      }
    }

    // Convert to base64
    let encodedParts = [];
    // Manual code to convert to base64
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < buffer.byteLength; i += 3) {
        let b1 = buffer[i];
        let b2 = (i + 1 < buffer.byteLength) ? buffer[i + 1] : 0;
        let b3 = (i + 2 < buffer.byteLength) ? buffer[i + 2] : 0;
        let combined = (b1 << 16) | (b2 << 8) | (b3 << 0);
        encodedParts.push(base64Chars[(combined >> 18) & 0x3F]);
        encodedParts.push(base64Chars[(combined >> 12) & 0x3F]);
        encodedParts.push(base64Chars[(combined >>  6) & 0x3F]);
        encodedParts.push(base64Chars[(combined >>  0) & 0x3F]);
    }
    // Handle padding
    if (buffer.byteLength % 3 === 1) {
        encodedParts[encodedParts.byteLength - 1] = '=';
        encodedParts[encodedParts.byteLength - 2] = '=';
    } else if (buffer.byteLength % 3 === 2) {
        encodedParts[encodedParts.byteLength - 1] = '=';
    }
    const encoded = encodedParts.join('');

    // Chunked output
    const parts = [];
    for (let i = 0; i < encoded.length; i += MAX_CHUNK_SIZE) {
        const chunk = encoded.slice(i, i + MAX_CHUNK_SIZE);
        // action transmit and display (a=T), direct transfer (t=d), uncompressed (o=), 3/4 bytes per pixel (f=24/32 bits per pixel), no responses at all (q=2)
        const initialControls = (i == 0) ? `a=T,f=${alpha ? 32 : 24},s=${width * scale},v=${height * scale},t=d,q=2,` : '';
        const nonTerminal = (i + MAX_CHUNK_SIZE < encoded.length) ? 1 : 0;
        parts.push(`\x1B_G${initialControls}m=${nonTerminal};${chunk}\x1B\\`);
    }

    return parts.join('');
}

