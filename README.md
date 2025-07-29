# 🎨 Huemanize - Perceptual Color Interpolation Plugin

A Figma plugin that creates beautiful color scales using perceptual color interpolation. Generate harmonious color palettes from a single base color with various interpolation methods.

## Features

- **Perceptual Color Interpolation**: Uses OKLCH color space for perceptually uniform color transitions
- **Multiple Interpolation Methods**: Choose from Linear, Bezier, Catmull-Rom, and easing functions
- **Customizable Scales**: Control the number of steps, lightness range, and chroma range
- **Real-time Preview**: See your color scale before adding it to Figma
- **Figma Variables Integration**: Automatically creates color variables in a "Colors" collection

## How to Use

### 1. Input Base Color
Enter a hex color code (e.g., `#FF6B6B`) in the input field. The plugin will validate the format and show a preview.

### 2. Choose Interpolation Method
Select from different interpolation methods:
- **Linear**: Straight-line interpolation
- **Bezier**: Smooth cubic bezier curve
- **Catmull-Rom**: Smooth spline interpolation
- **Ease In**: Gradual start, fast finish
- **Ease Out**: Fast start, gradual finish
- **Ease In-Out**: Smooth acceleration and deceleration

### 3. Adjust Scale Settings
- **Steps**: Number of colors in the scale (3-20)
- **Lightness**: Range of lightness variation (0-100%)
- **Chroma**: Range of chroma/saturation variation (0-100%)

### 4. Generate and Preview
Click "Generate Scale" to create a preview of your color scale. The colors will be displayed as swatches that you can hover over to see the hex values.

### 5. Add to Figma
Click "Add to Figma Variables" to create color variables in your current file. The plugin will:
- Create a "Colors" collection if it doesn't exist
- Add color variables named "Color Scale [HEX] 1", "Color Scale [HEX] 2", etc.
- Use the default mode for the variables

## Technical Details

### Color Space
The plugin uses the OKLCH color space for interpolation, which provides:
- **Perceptually uniform lightness**: Changes in lightness appear consistent to the human eye
- **Better color transitions**: More natural-looking color scales
- **Accurate color representation**: Maintains color relationships across different displays

### Interpolation Methods
- **Linear**: `f(t) = t`
- **Bezier**: `f(t) = t²(3 - 2t)` (smoothstep function)
- **Catmull-Rom**: Cubic spline interpolation for smooth curves
- **Easing Functions**: Standard CSS-like easing curves

### Building the Plugin

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the plugin:
   ```bash
   npm run build
   ```

3. Load in Figma:
   - Open Figma
   - Go to Plugins > Development > Import plugin from manifest
   - Select the `manifest.json` file

## Development

### Project Structure
```
huemanize/
├── code.ts          # Main plugin logic
├── ui.html          # Plugin UI
├── manifest.json    # Plugin manifest
├── package.json     # Dependencies
├── tsconfig.json    # TypeScript configuration
└── types.d.ts       # Type declarations
```

### Key Dependencies
- **culori**: Color manipulation and interpolation library
- **@figma/plugin-typings**: TypeScript definitions for Figma API

### Color Interpolation Algorithm
1. Convert input hex to OKLCH color space
2. Generate lightness interpolation from 0.1 to 0.9
3. Generate chroma interpolation from 0 to base color chroma
4. Combine both interpolations using the selected easing function
5. Convert back to hex format

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details. 