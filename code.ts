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
  lightness: number;
  chroma: number;
  steps: number;
  method: string;
  groupName?: string;
}

interface PluginResponse {
  type: 'scale-generated' | 'added-to-figma' | 'error' | 'init';
  colors?: string[];
  error?: string;
  defaultColor?: string;
}

// Default number of steps for consistent color scales (similar to Tailwind CSS)
const DEFAULT_STEPS = 11; // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950

// Generate random color in OKLCH space
function generateRandomColor(): string {
  // Generate random values for OKLCH
  const l = 0.3 + Math.random() * 0.4; // Lightness between 0.3 and 0.7 for good visibility
  const c = 0.1 + Math.random() * 0.2; // Chroma between 0.1 and 0.3 for moderate saturation
  const h = Math.random() * 360; // Hue between 0 and 360
  
  const color: Color = {
    mode: 'oklch',
    l,
    c,
    h
  };
  
  return formatHex(color);
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



function generateColorScale(baseColor: string, steps: number, lightness: number, chroma: number, method: string): string[] {
  try {
    // Validate input parameters
    if (!baseColor || typeof baseColor !== 'string') {
      throw new Error('Base color is required');
    }
    
    if (steps < 2 || steps > 50) {
      throw new Error('Steps must be between 2 and 50');
    }
    
    if (lightness < 0 || lightness > 1) {
      throw new Error('Lightness must be between 0 and 1');
    }
    
    if (chroma < 0 || chroma > 1) {
      throw new Error('Chroma must be between 0 and 1');
    }
    
    // Parse the base color
    const parsedColor = oklch(baseColor);
    if (!parsedColor) {
      throw new Error('Invalid color format');
    }

    console.log('Base color parsed:', parsedColor);

    // Generate a proper color scale from light to dark
    const colors: Color[] = [];
    const easing = easingFunctions[method as keyof typeof easingFunctions] || easingFunctions.linear;
    
    // Create a full scale from very light to very dark
    const minLightness = 0.05; // Very light (almost white)
    const maxLightness = 0.95; // Very dark (almost black)
    const baseChroma = parsedColor.c || 0.1;
    const maxChroma = Math.min(0.4, baseChroma * 2);
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const easedT = easing(t);
      
      // Interpolate lightness from very light to very dark
      const interpolatedLightness = minLightness + (maxLightness - minLightness) * easedT;
      const finalLightness = minLightness + (interpolatedLightness - minLightness) * lightness;
      
      // Create a bell curve for chroma - higher in the middle, lower at extremes
      const chromaCurve = Math.sin(easedT * Math.PI);
      const interpolatedChroma = baseChroma * chromaCurve * chroma;
      const finalChroma = Math.min(maxChroma, Math.max(0, interpolatedChroma));
      
      const color: Color = {
        mode: 'oklch',
        l: finalLightness,
        c: finalChroma,
        h: parsedColor.h || 0
      };
      
      colors.push(color);
    }

    console.log('Combined colors:', colors);

    // Convert to hex format
    const hexColors = colors.map(color => {
      const hex = formatHex(color);
      console.log('Color object:', color, '-> Hex:', hex);
      return hex;
    }).filter(Boolean) as string[];

    // Reverse order so lightest is first (top of vertical display)
    const finalColors = hexColors.reverse();

    console.log('Final hex colors with source color naturally included:', finalColors);
    return finalColors;
  } catch (error) {
    console.error('Error generating color scale:', error);
    throw error;
  }
}

// Generate color numbers based on the number of steps
function generateColorNumbers(steps: number): number[] {
  const standardSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  if (steps === 11) {
    return standardSteps;
  } else if (steps < 11) {
    // For fewer steps, use the same names but skip some steps
    // For example, 3 steps: [50, 500, 950]
    // For example, 5 steps: [50, 300, 500, 700, 950]
    const indices = [];
    for (let i = 0; i < steps; i++) {
      const index = Math.round((i / (steps - 1)) * (standardSteps.length - 1));
      indices.push(index);
    }
    return indices.map(i => standardSteps[i]);
  } else {
    // For more steps, add intermediate values with 25 increments
    const numbers: number[] = [];
    
    // Calculate step size to distribute evenly across the range
    const stepSize = 900 / (steps - 1); // 900 is the range from 50 to 950
    
    for (let i = 0; i < steps; i++) {
      let number = Math.round(50 + (stepSize * i));
      
      // Round to nearest 25 for intermediate values (but keep 50 and 950 as is)
      if (number > 50 && number < 950) {
        number = Math.round(number / 25) * 25;
      }
      
      // Ensure we don't have duplicates and stay within bounds
      if (number < 50) number = 50;
      if (number > 950) number = 950;
      
      numbers.push(number);
    }
    
    // Remove duplicates and sort
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);
    
    // If we have fewer numbers than requested steps due to duplicates,
    // add more intermediate values
    if (uniqueNumbers.length < steps) {
      const additionalSteps = steps - uniqueNumbers.length;
      const gaps = [];
      
      // Find gaps between existing numbers
      for (let i = 0; i < uniqueNumbers.length - 1; i++) {
        const gap = uniqueNumbers[i + 1] - uniqueNumbers[i];
        if (gap > 25) {
          gaps.push({
            start: uniqueNumbers[i],
            end: uniqueNumbers[i + 1],
            size: gap
          });
        }
      }
      
      // Add intermediate values in the largest gaps
      gaps.sort((a, b) => b.size - a.size);
      
      for (let i = 0; i < Math.min(additionalSteps, gaps.length); i++) {
        const gap = gaps[i];
        const midPoint = Math.round((gap.start + gap.end) / 2 / 25) * 25;
        if (midPoint > gap.start && midPoint < gap.end) {
          uniqueNumbers.push(midPoint);
        }
      }
      
      return uniqueNumbers.sort((a, b) => a - b);
    }
    
    return uniqueNumbers;
  }
}

// Figma variable management
async function createColorVariables(colors: string[], baseColor: string, groupName: string, steps: number): Promise<void> {
  try {
    // Find or create the "Colors" collection
    let colorsCollection: VariableCollection | undefined;
    
    // Check if a "Colors" collection already exists
    const existingCollections = figma.variables.getLocalVariableCollections();
    colorsCollection = existingCollections.find((collection: VariableCollection) => collection.name === "Colors");

    if (!colorsCollection) {
      // Create a new "Colors" collection if it doesn't exist
      colorsCollection = figma.variables.createVariableCollection("Colors");
    }

    // Generate color numbers based on the number of steps
    const colorNumbers = generateColorNumbers(steps);
    
    // Create variables for each color in the scale
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      if (!color) continue;
      
      const colorNumber = colorNumbers[i];
      const variableName = `${groupName}/${colorNumber}`;
      
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

    figma.notify(`Created ${colors.length} color variables in "${groupName}" group within Colors collection`);
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

      const groupName = msg.groupName || 'My Color Scale';
      await createColorVariables(colors, msg.baseColor, groupName, msg.steps);

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

// Show the UI first
figma.showUI(__html__, { 
  width: 480, 
  height: 416,
  themeColors: true
});

// Send initial random color after UI is shown
const initialColor = generateRandomColor();
figma.ui.postMessage({
  type: 'init',
  defaultColor: initialColor
} as PluginResponse);
