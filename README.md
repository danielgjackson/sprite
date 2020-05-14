## Sprite Generator

This is an 8-bit pixel art style sprite generator, suitable for avatars.  

This is an entirely JavaScript implementation based on the techniques used by Lj V. Miranda for the Python/Seagull/Matplotlib-based: [Sprites-as-a-Service](https://github.com/ljvmiranda921/sprites-as-a-service).  As such, this version may be easily run client- or server-side.

See also:

  * [Demo](https://danielgjackson.github.io/sprite/)
  * [Infinite Sprites!](https://danielgjackson.github.io/sprite/infinite.html)
  * [Sprites-as-a-Service](https://github.com/ljvmiranda921/sprites-as-a-service) -- the original implementation, whose techniques are recreated in this library.

## Usage

Import the module:

```javascript
import Sprite from './sprite.mjs'
```

Generate a `.bmp` image data for a sprite:

```javascript
// Generate .bmp data for a sprite
const spriteData = Sprite.generate(seed).magnify(12).asBitmapData();
```

Generate a `data:` URI for a sprite:

```javascript
// Generate a data: uri for a sprite
const spriteUri = Sprite.generate(seed).asDataUri();
```

When magnifying pixel art, use the CSS:

```css
img {
  image-rendering: pixelated;
}
```
