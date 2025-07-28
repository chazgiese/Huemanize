/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 350, height: 600 });

interface ColorScaleMessage {
  type: 'generate-color-scale';
  colors: Array<{ r: number; g: number; b: number }>;
  baseColor: string;
  scaleType: string;
  numShades: number;
  direction: string;
}

interface ColorScale {
  colors: Array<{ r: number; g: number; b: number }>;
  baseColor: string;
  scaleType: string;
  numShades: number;
  direction: string;
}

// Color utility functions
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function interpolateColor(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }, factor: number) {
  return {
    r: color1.r + (color2.r - color1.r) * factor,
    g: color1.g + (color2.g - color1.g) * factor,
    b: color1.b + (color2.b - color1.b) * factor
  };
}

// Enhanced color scale generation with better algorithms
function generateEnhancedColorScale(baseColor: string, scaleType: string, numShades: number, direction: string): Array<{ r: number; g: number; b: number }> {
  const baseRgb = hexToRgb(baseColor);
  if (!baseRgb) return [];

  const colors: Array<{ r: number; g: number; b: number }> = [];
  let steps: number[] = [];

  // Generate step values based on scale type
  switch (scaleType) {
    case 'linear':
      steps = Array.from({ length: numShades }, (_, i) => i / (numShades - 1));
      break;
    case 'exponential':
      steps = Array.from({ length: numShades }, (_, i) => Math.pow(i / (numShades - 1), 2));
      break;
    case 'logarithmic':
      steps = Array.from({ length: numShades }, (_, i) => Math.log(1 + i) / Math.log(numShades));
      break;
    case 'sine':
      steps = Array.from({ length: numShades }, (_, i) => (Math.sin(i / (numShades - 1) * Math.PI) + 1) / 2);
      break;
    default:
      steps = Array.from({ length: numShades }, (_, i) => i / (numShades - 1));
  }

  // Adjust steps based on direction
  if (direction === 'light') {
    steps = steps.map(s => 1 - s);
  } else if (direction === 'dark') {
    steps = steps.map(s => s);
  } else {
    // both - create light to dark scale
    const lightSteps = steps.slice().reverse();
    const darkSteps = steps;
    steps = [...lightSteps, ...darkSteps.slice(1)];
  }

  // Generate colors with improved interpolation
  for (let i = 0; i < steps.length; i++) {
    const factor = steps[i];
    const color = {
      r: baseRgb.r * (1 - factor) + factor,
      g: baseRgb.g * (1 - factor) + factor,
      b: baseRgb.b * (1 - factor) + factor
    };
    colors.push(color);
  }

  return colors;
}

// Create color swatches in Figma
function createColorSwatches(colorScale: ColorScale): SceneNode[] {
  const nodes: SceneNode[] = [];
  const { colors, baseColor, scaleType, numShades, direction } = colorScale;
  
  // Create a frame to contain all swatches
  const frame = figma.createFrame();
  frame.name = `Color Scale - ${baseColor} (${scaleType})`;
  frame.resize(colors.length * 60 + 20, 80);
  frame.x = figma.viewport.center.x - frame.width / 2;
  frame.y = figma.viewport.center.y - frame.height / 2;
  
  // Add some styling to the frame
  frame.cornerRadius = 8;
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  frame.strokeWeight = 1;
  
  // Create color swatches
  colors.forEach((color, index) => {
    const swatch = figma.createRectangle();
    swatch.name = `Swatch ${index + 1} - ${rgbToHex(color.r, color.g, color.b)}`;
    swatch.resize(50, 50);
    swatch.x = 10 + index * 60;
    swatch.y = 15;
    swatch.cornerRadius = 4;
    swatch.fills = [{ type: 'SOLID', color }];
    swatch.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    swatch.strokeWeight = 1;
    
    // Add color value as text
    const text = figma.createText();
    text.characters = rgbToHex(color.r, color.g, color.b);
    text.fontSize = 10;
    text.x = swatch.x;
    text.y = swatch.y + 55;
    text.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }];
    
    frame.appendChild(swatch);
    frame.appendChild(text);
    nodes.push(swatch, text);
  });
  
  figma.currentPage.appendChild(frame);
  nodes.push(frame);
  
  return nodes;
}

// Create a more sophisticated color scale with better naming
function createDesignSystemColorScale(colorScale: ColorScale): SceneNode[] {
  const nodes: SceneNode[] = [];
  const { colors, baseColor, scaleType, numShades, direction } = colorScale;
  
  // Create a main frame
  const mainFrame = figma.createFrame();
  mainFrame.name = `Design System - ${baseColor}`;
  mainFrame.resize(400, colors.length * 60 + 40);
  mainFrame.x = figma.viewport.center.x - mainFrame.width / 2;
  mainFrame.y = figma.viewport.center.y - mainFrame.height / 2;
  mainFrame.cornerRadius = 12;
  mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  mainFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  mainFrame.strokeWeight = 1;
  
  // Add title
  const title = figma.createText();
  title.characters = `Color Scale: ${baseColor}`;
  title.fontSize = 16;
  title.fontWeight = 600;
  title.x = 20;
  title.y = 20;
  title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  mainFrame.appendChild(title);
  
  // Create color rows with labels
  colors.forEach((color, index) => {
    const rowFrame = figma.createFrame();
    rowFrame.name = `Color ${index + 1}`;
    rowFrame.resize(360, 50);
    rowFrame.x = 20;
    rowFrame.y = 60 + index * 60;
    rowFrame.cornerRadius = 6;
    rowFrame.fills = [{ type: 'SOLID', color }];
    
    // Add color information
    const colorInfo = figma.createText();
    const hexValue = rgbToHex(color.r, color.g, color.b);
    const rgbValue = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    colorInfo.characters = `${hexValue}\n${rgbValue}`;
    colorInfo.fontSize = 12;
    colorInfo.x = 15;
    colorInfo.y = 15;
    colorInfo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    // Add scale label
    const scaleLabel = figma.createText();
    scaleLabel.characters = `${index + 1}00`;
    scaleLabel.fontSize = 14;
    scaleLabel.fontWeight = 600;
    scaleLabel.x = 280;
    scaleLabel.y = 18;
    scaleLabel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    rowFrame.appendChild(colorInfo);
    rowFrame.appendChild(scaleLabel);
    mainFrame.appendChild(rowFrame);
    nodes.push(rowFrame);
  });
  
  figma.currentPage.appendChild(mainFrame);
  nodes.push(mainFrame);
  
  return nodes;
}

figma.ui.onmessage = async (msg: ColorScaleMessage) => {
  if (msg.type === 'generate-color-scale') {
    try {
      const colorScale: ColorScale = {
        colors: msg.colors,
        baseColor: msg.baseColor,
        scaleType: msg.scaleType,
        numShades: msg.numShades,
        direction: msg.direction
      };
      
      // Create both simple swatches and design system format
      const swatchNodes = createColorSwatches(colorScale);
      const designSystemNodes = createDesignSystemColorScale(colorScale);
      
      // Select all created nodes
      const allNodes = [...swatchNodes, ...designSystemNodes];
      figma.currentPage.selection = allNodes;
      figma.viewport.scrollAndZoomIntoView(allNodes);
      
      figma.notify(`Generated ${msg.colors.length} color swatches from ${msg.baseColor}`);
    } catch (error) {
      figma.notify('Error generating color scale: ' + error.message, { error: true });
    }
  }
  
  // Don't close the plugin automatically - let users generate multiple scales
  // figma.closePlugin();
}; 