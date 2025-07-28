# Huemanize - Figma Plugin

A Figma plugin for adding human elements to your designs.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the plugin:
   ```bash
   npm run build
   ```

3. For development with auto-rebuild:
   ```bash
   npm run dev
   ```

## Plugin Structure

- `manifest.json` - Plugin configuration
- `src/code.ts` - Main plugin logic (compiles to `code.js`)
- `ui.html` - Plugin UI interface
- `dist/` - Compiled JavaScript output

## Usage

1. Build the plugin using `npm run build`
2. In Figma, go to Plugins > Development > Import plugin from manifest
3. Select the `manifest.json` file from this project
4. The plugin will appear in your Plugins menu

## Development Notes

- Uses TypeScript targeting ES2017 for Figma compatibility
- Vanilla JavaScript/TypeScript build process (no bundlers)
- Follows Figma plugin API best practices
- UI is built with vanilla HTML/CSS/JavaScript 