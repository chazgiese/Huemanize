import { formatHex, oklch } from 'culori';

interface Color {
  mode?: string;
  l?: number;
  c?: number;
  h?: number;
  r?: number;
  g?: number;
  b?: number;
  [key: string]: any;
}

interface PluginMessage {
  type: 'generate-scale' | 'add-to-figma';
  baseColor: string;
  steps: number;
  lightness: number;
  chroma: number;
  method: string;
}

interface PluginResponse {
  type: 'scale-generated' | 'added-to-figma' | 'error';
  colors?: string[];
  error?: string;
}

// Interpolation easing functions
const easingFunctions = {
  'linear': (t: number) => t,
  'bezier': (t: number) => t * t * (3 - 2 * t),
  'catmull-rom': (t: number) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * t2 + (-t3 + t2) + (-2 * t3 + 3 * t2) + (t3 - t2));
  },
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => 1 - Math.pow(1 - t, 2),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};

// Color interpolation functions
function interpolateLightness(baseColor: Color, steps: number, lightnessRange: number, method: string): Color[] {
  const baseOklch = oklch(baseColor);
  if (!baseOklch) throw new Error('Invalid color format');

  const colors: Color[] = [];
  const easing = easingFunctions[method as keyof typeof easingFunctions] || easingFunctions.linear;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const easedT = easing(t);
    
    // Interpolate lightness from 0.1 to 0.9, then apply the lightness range
    const minLightness = 0.1;
    const maxLightness = 0.9;
    const interpolatedLightness = minLightness + (maxLightness - minLightness) * easedT;
    const finalLightness = minLightness + (interpolatedLightness - minLightness) * lightnessRange;

    const interpolatedColor: Color = {
      mode: 'oklch',
      l: finalLightness,
      c: baseOklch.c || 0.1,
      h: baseOklch.h || 0
    };

    colors.push(interpolatedColor);
  }

  return colors;
}

function interpolateChroma(baseColor: Color, steps: number, chromaRange: number, method: string): Color[] {
  const baseOklch = oklch(baseColor);
  if (!baseOklch) throw new Error('Invalid color format');

  const colors: Color[] = [];
  const easing = easingFunctions[method as keyof typeof easingFunctions] || easingFunctions.linear;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const easedT = easing(t);
    
    // Interpolate chroma from 0 to the base color's chroma
    const maxChroma = baseOklch.c || 0.1;
    const interpolatedChroma = maxChroma * easedT * chromaRange;

    const interpolatedColor: Color = {
      mode: 'oklch',
      l: baseOklch.l || 0.5,
      c: interpolatedChroma,
      h: baseOklch.h || 0
    };

    colors.push(interpolatedColor);
  }

  return colors;
}

function generateColorScale(baseColor: string, steps: number, lightness: number, chroma: number, method: string): string[] {
  try {
    // Parse the base color
    const parsedColor = oklch(baseColor);
    if (!parsedColor) {
      throw new Error('Invalid color format');
    }

    console.log('Base color parsed:', parsedColor);

    // Generate colors based on lightness interpolation
    const lightnessColors = interpolateLightness(parsedColor, steps, lightness, method);
    
    // Generate colors based on chroma interpolation
    const chromaColors = interpolateChroma(parsedColor, steps, chroma, method);
    
    // Combine both interpolations by averaging the lightness and chroma values
    const combinedColors: Color[] = [];
    
    for (let i = 0; i < steps; i++) {
      const lightnessColor = lightnessColors[i];
      const chromaColor = chromaColors[i];
      
      if (lightnessColor && chromaColor) {
        const combinedColor: Color = {
          mode: 'oklch',
          l: lightnessColor.l || 0.5,
          c: chromaColor.c || 0.1,
          h: parsedColor.h || 0
        };
        combinedColors.push(combinedColor);
      }
    }

    console.log('Combined colors:', combinedColors);

    // Convert to hex format
    const hexColors = combinedColors.map(color => {
      const hex = formatHex(color);
      console.log('Color object:', color, '-> Hex:', hex);
      return hex;
    }).filter(Boolean) as string[];

    console.log('Final hex colors:', hexColors);
    return hexColors;
  } catch (error) {
    console.error('Error generating color scale:', error);
    throw error;
  }
}

// Figma variable management
async function createColorVariables(colors: string[], baseColor: string): Promise<void> {
  try {
    // Find or create the "Colors" collection
    let colorsCollection: VariableCollection | undefined;
    
    // Check if a "Colors" collection already exists
    const existingCollections = figma.variables.getLocalVariableCollections();
    colorsCollection = existingCollections.find((collection: VariableCollection) => collection.name === "Colors");

    if (!colorsCollection) {
      // Create a new collection if it doesn't exist
      colorsCollection = figma.variables.createVariableCollection("Colors");
    }

    // Generate a base name from the input color
    const baseName = `Color Scale ${baseColor.toUpperCase()}`;
    
    // Create variables for each color in the scale
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      if (!color) continue;
      
      const variableName = `${baseName} ${i + 1}`;
      
      // Check if variable already exists
      const existingVariables = figma.variables.getLocalVariables();
      const existingVariable = existingVariables.find((variable: Variable) => 
        variable.name === variableName && variable.variableCollectionId === colorsCollection!.id
      );

      if (existingVariable) {
        // Update existing variable
        existingVariable.setValueForMode(colorsCollection!.defaultModeId, {
          r: parseInt(color.slice(1, 3), 16) / 255,
          g: parseInt(color.slice(3, 5), 16) / 255,
          b: parseInt(color.slice(5, 7), 16) / 255
        });
      } else {
        // Create new variable
        const variable = figma.variables.createVariable(variableName, colorsCollection!, 'COLOR');
        variable.setValueForMode(colorsCollection!.defaultModeId, {
          r: parseInt(color.slice(1, 3), 16) / 255,
          g: parseInt(color.slice(3, 5), 16) / 255,
          b: parseInt(color.slice(5, 7), 16) / 255
        });
      }
    }

    figma.notify(`Created ${colors.length} color variables in "Colors" collection`);
  } catch (error) {
    console.error('Error creating color variables:', error);
    throw new Error('Failed to create color variables in Figma');
  }
}

// Message handling
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === 'generate-scale') {
      const colors = generateColorScale(
        msg.baseColor,
        msg.steps,
        msg.lightness,
        msg.chroma,
        msg.method
      );

      const response: PluginResponse = {
        type: 'scale-generated',
        colors
      };

      figma.ui.postMessage(response);
    } else if (msg.type === 'add-to-figma') {
      const colors = generateColorScale(
        msg.baseColor,
        msg.steps,
        msg.lightness,
        msg.chroma,
        msg.method
      );

      await createColorVariables(colors, msg.baseColor);

      const response: PluginResponse = {
        type: 'added-to-figma'
      };

      figma.ui.postMessage(response);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    const response: PluginResponse = {
      type: 'error',
      error: errorMessage
    };

    figma.ui.postMessage(response);
  }
};

// Show the UI
figma.showUI(__html__, { width: 320, height: 600 });
