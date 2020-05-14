// Dan Jackson, 2020.
// This is a JavaScript implementation based on the technique used by Lj V. Miranda in "Sprites-as-a-Service": https://github.com/ljvmiranda921/sprites-as-a-service


// Jenkins's "one_at_a_time" hash
function hash(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash += key.charCodeAt(i);
    hash += hash << 10;
    hash ^= hash >>> 6;
  }
  hash += hash << 3;
  hash ^= hash >>> 11;
  hash += hash << 15;
  return hash >>> 0; // unsigned
}

// mwc1616 PRNG
function rngSeed(value) {
  return [value >>> 16, value & 0xffff];  // [1, 2]
}
function rngNext(state) { 
  state[0] = 18030 * (state[0] & 0xffff) + (state[0] >> 16);
  state[1] = 30903 * (state[1] & 0xffff) + (state[1] >> 16);
  return (state[0] << 16) + (state[1] & 0xffff);
}


// Generate a bitmap from an array of RGB-array pixels
function BitmapGenerate(data, width, height)
{
    const bitsPerPixel = 24;
    const bmpHeaderSize = 54
    const paletteSize = ((bitsPerPixel <= 8) ? (1 << bitsPerPixel) : 0) << 2;               // Number of palette bytes
    const stride = 4 * Math.floor((width * Math.floor((bitsPerPixel + 7) / 8) + 3) / 4);    // Byte width of each line
    const biSizeImage = stride * Math.abs(height);                                          // Total number of bytes that will be written
    const bfOffBits = bmpHeaderSize + paletteSize;
    const bfSize = bfOffBits + biSizeImage;
    
    const buffer = new ArrayBuffer(bfSize)
    const view = new DataView(buffer)
    
    // Wrie bitmap header
    view.setUint8(0, 'B'.charCodeAt(0)); view.setUint8(1, 'M'.charCodeAt(0)); // @0 WORD bfType
    view.setUint32(2, bfSize, true);            // @2 DWORD bfSize
    view.setUint16(6, 0, true);                 // @6 WORD bfReserved1
    view.setUint16(8, 0, true);                 // @8 WORD bfReserved2
    view.setUint32(10, bfOffBits, true);        // @10 DWORD bfOffBits
    view.setUint32(14, 40, true);               // @14 DWORD biSize
    view.setUint32(18, width, true);            // @18 DWORD biWidth
    view.setInt32(22, -height, true);           // @22 DWORD biHeight (negative for top-down)
    view.setUint16(26, 1, true);                // @26 WORD biPlanes
    view.setUint16(28, bitsPerPixel, true);     // @28 WORD biBitCount
    view.setUint32(30, 0, true);                // @30 DWORD biCompression (0=BI_RGB, 3=BI_BITFIELDS)
    view.setUint32(34, biSizeImage, true);      // @34 DWORD biSizeImage
    view.setUint32(38, 0, true);                // @38 DWORD biXPelsPerMeter
    view.setUint32(42, 0, true);                // @42 DWORD biYPelsPerMeter
    view.setUint32(46, 0, true);                // @46 DWORD biClrUsed
    view.setUint32(50, 0, true);                // @50 DWORD biClrImportant
    // @54 <end>
    
    // Write pixels
    for (let y = 0; y < height; y++) {
        let offset = bmpHeaderSize + y * stride;
        for (let x = 0; x < width; x++) {
            const value = data[y * width + x];
//console.log(value[0] + '/' + value[1] + '/' + value[2]);
            view.setUint8(offset + 0, value[2]);    // B
            view.setUint8(offset + 1, value[1]);    // G
            view.setUint8(offset + 2, value[0]);    // R
//console.log('...' + view.getUint8(offset + 2) + '/' + view.getUint8(offset + 1) + '/' + view.getUint8(offset + 0));
            offset += 3;
        }
    }
    
    return buffer;
}



export default class Sprite {
  
  constructor(width, height, values) {
    this.width = width;
    this.height = height;
    if (typeof values === 'undefined') {
      this.values = Array(this.width * this.height);
    } else {
      this.values = values.map((x) => x);
    }
  }
  
  fill(value) {
    this.values.fill(value);
  }
  
  fillRandom(seed = "") {
    const rngState = rngSeed(hash(seed));
    this.fill(0);
    this.values = this.values.map((_, i) => rngNext(rngState) & 1);
  }
  
  getCell(x, y) {
    return this.values[y * this.width + x];
  }

  setCell(x, y, value) {
    this.values[y * this.width + x] = value;
  }

  // Count of connected cells
  connectedCells() {
    const output = new Sprite(this.width, this.height);
    for (let oy = 0; oy < this.height; oy++) {
      for (let ox = 0; ox < this.width; ox++) {
        let sum = 0;
        for (let iy = -1; iy <= 1; iy++) {
          for (let ix = -1; ix <= 1; ix++) {
            const y = oy + iy;
            const x = ox + ix;
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            if (iy === 0 && ix === 0) continue; // ignore middle cell
            sum += this.getCell(x, y);
          }
        }
        output.setCell(ox, oy, sum);
      }
    }
    return output;
  }

  // Evolve a new board following "game of life" rules
  evolve(numIterations = 1, extinction = 0.125, survival = 0.375) {
    const output = new Sprite(this.width, this.height, this.values);
    const scale = 8;    // count of connected cells
    const reproductionRule = (current, connected) => (current == 0) && (connected <= extinction * scale);
    const stasisRule = (current, connected) => (current == 1) && ((connected == 2) || (connected == Math.floor(survival * scale)));
    for (let iteration = 0; iteration < numIterations; iteration++) {
      const connected = output.connectedCells();
      output.values = output.values.map((current, i) => (reproductionRule(current, connected.values[i]) || stasisRule(current, connected.values[i])) ? 1 : 0);
    }
    return output;
  }

  // Duplicate the board mirrored around the vertical
  unfold() {
    const output = new Sprite(2 * this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = this.getCell(x, y);
        output.setCell(x, y, value);
        output.setCell(this.width * 2 - 1 - x, y, value);
      }
    }
    return output;
  }
  
  // Pad around the board
  pad(padding = 1, value = 1) {
    const output = new Sprite(this.width + 2 * padding, this.height + 2 * padding);
    output.fill(value);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = this.getCell(x, y);
        output.setCell(x + padding, y + padding, value);
      }
    }
    return output;
  }
  
  // Outline
  outline() {
    let output = new Sprite(this.width, this.height);
    output.fill(0.5);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = this.getCell(x, y);
        if (value == 0) {
          output.setCell(x, y, 0);
          if (x > 0) output.setCell(x - 1, y, this.getCell(x - 1, y) == 1 ? 1 : 0);
          if (x < this.width - 1) output.setCell(x + 1, y, this.getCell(x + 1, y) == 1 ? 1 : 0);
          if (y > 0) output.setCell(x, y - 1, this.getCell(x, y - 1) == 1 ? 1 : 0);
          if (y < this.width - 1) output.setCell(x, y + 1, this.getCell(x, y + 1) == 1 ? 1 : 0);
        }
      }
    }
    output = output.pad(1, 0.5);
    return output;
  }
  
  // Vertical gradient
  gradient() {
    const output = new Sprite(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const v1 = this.getCell(x, y);
        const v0 = y > 0 ? this.getCell(x, y - 1) : v1;
        const v2 = y < this.height - 1 ? this.getCell(x, y + 1) : v1;
        const value = ((v2 - v1) + (v1 - v0)) / 2;
        output.setCell(x, y, value);
      }
    }
    return output;
  }
  
  // Rescale values
  rescale(rangeMin = 0.2, rangeMax = 0.25) {
    const min = this.values.reduce((value, min) => (value < min ? value : min), Number.MAX_VALUE);
    const max = this.values.reduce((value, max) => (value > max ? value : max), Number.MIN_VALUE);
    const output = new Sprite(this.width, this.height);
    output.values = this.values.map((value) => ((value - min) / (max - min)) * (rangeMax - rangeMin) + rangeMin);
    return output;
  }
  
  // Combine outline with gradient
  combine(gradient) {
    const output = new Sprite(this.width, this.height);
    output.values = this.values.map((value, i) => (value === 0) ? gradient.values[i] : value);
    return output;
  }
  
  // Color with gradient stops
  applyColorGradient(stops) {
    const output = new Sprite(this.width, this.height);
    output.values = this.values.map((value) => {
        let v = value;
        if (v < 0) v = 0;
        if (v > 1) v = 1;
        const stopIndex = Math.floor(v * (stops.length - 1));
        const stopProp = (v - (stopIndex / (stops.length - 1))) * (stops.length - 1);
        const value0 = stops[stopIndex];
        const value1 = stopIndex + 1 >= stops.length ? value0 : stops[stopIndex + 1];
        const result = Array(value0.length);
        for (let i = 0; i < result.length; i++) {
            result[i] = Math.floor(value0[i] * (1 - stopProp) + value1[i] * stopProp);
        }
        return result;
    });
    return output;
  }
  
  // Enlarge each cell by 'scale' times
  magnify(scale = 15) {
    const output = new Sprite(this.width * scale, this.height * scale);
    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const value = this.getCell(Math.floor(x / scale), Math.floor(y / scale));
        output.setCell(x, y, value);
      }
    }
    return output;
  }
  
  // Debug output a board to the console
  debugOutput() {
    const lines = [];
    for (let y = 0; y < this.height; y++) {
      const line = [];
      for (let x = 0; x < this.width; x++) {
        const value = this.getCell(x, y);
        if (Array.isArray(value)) line.push(JSON.stringify(value))
        else if (value == 0) line.push('#');
        else if (value == 1) line.push(' ');
        else if (value == 0.5) line.push('.');
        else line.push(`<${value.toFixed(2)}>`);
      }
      lines.push(line.join(''));
    }
    console.log(lines.join('\n'));
    return lines;
  }


  static generate(seed) {
    if (typeof seed === 'undefined') {
        seed = (new Date()).toISOString();
    }
    
    let board = new Sprite(4, 8);
    
    board.fillRandom(seed);

    board = board.evolve();
    board = board.unfold();
    board = board.pad();
    const outline = board.outline();
    const gradient = outline.gradient();
    const rescaled = gradient.rescale();
    const combined = outline.combine(rescaled);
    
    const colors = [];
    colors.push([0x00, 0x00, 0x00]);
    colors.push([0xf2, 0xf2, 0xf2]);
    const rngState = rngSeed(hash(seed));
    const randomByte = () => rngNext(rngState) & 0xff;
    const randomColor = () => [randomByte(), randomByte(), randomByte()];
    for (let i = 0; i < 3; i++) colors.push(randomColor());
    colors.reverse();
    
    const result = combined.applyColorGradient(colors);    
    return result;
  }

  asBitmapData() {
    const bmpData = BitmapGenerate(this.values, this.width, this.height);
    return bmpData;
  }
  
  asDataUri() {
    const prefix = 'data:image/bmp;base64,';
    const bmpData = this.asBitmapData();
    if (typeof globalThis.btoa === 'undefined') { // node
      return prefix + Buffer.from(buf).toString('base64');
    } else {
      const values = String.fromCharCode(...new Uint8Array(bmpData));
      return prefix + btoa(values);
    }
  }
  
  

}


