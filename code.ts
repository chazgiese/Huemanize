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
  exportMode?: 'light' | 'dark' | 'both';
}

interface PluginResponse {
  type: 'scale-generated' | 'added-to-figma' | 'error' | 'init';
  colors?: string[];
  darkColors?: string[];
  error?: string;
  defaultColor?: string;
}

// Default number of steps for consistent color scales (similar to Tailwind CSS)
const DEFAULT_STEPS = 11; // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950

// Generate random color in OKLCH space
function generateRandomColor(): string {
  // Generate random values for OKLCH
  const l = 0.3 + Math.random() * 0.4; // Lightness between 0.3 and 0.7 for good visibility
  const c = 0.15 + Math.random() * 0.25; // Chroma between 0.15 and 0.4 for better saturation
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



function generateColorScale(baseColor: string, steps: number, lightness: number, chroma: number, method: string, mode: 'light' | 'dark' = 'light'): string[] {
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
    
    // Get base color properties
    const baseHue = parsedColor.h || 0;
    const baseChroma = parsedColor.c || 0.1;
    
    // Check if the base color is achromatic (white, black, or gray)
    const isAchromatic = baseChroma < 0.01 || (parsedColor.l !== undefined && (parsedColor.l > 0.99 || parsedColor.l < 0.01));
    
    // Dark mode adjustments
    const chromaReduction = mode === 'dark' ? 0.9 : 1.0; // Reduce chroma by 10% in dark mode
    const adjustedBaseChroma = isAchromatic ? 0 : baseChroma * chromaReduction;
    const maxChroma = isAchromatic ? 0 : Math.min(0.5, adjustedBaseChroma * 2.5); // Allow higher max chroma for better saturation
    
    // Define lightness ranges based on mode and method
    let minLightness: number, maxLightness: number;
    
    // Catmull-Rom gets extra affordance for more extreme values
    const isCatmullRom = method === 'catmull-rom';
    
    if (mode === 'light') {
      if (isCatmullRom) {
        // Catmull-Rom: maximum affordance for light mode
        minLightness = 0.995; // Nearly pure white, sacrificing some hue
        maxLightness = 0.03; // Nearly pure black but still tinted
      } else {
        // Other methods: standard light mode range
        minLightness = 0.98; // Very light, sacrificing some hue
        maxLightness = 0.12; // Very dark but not pure black
      }
    } else {
      if (isCatmullRom) {
        // Catmull-Rom: maximum affordance for dark mode
        minLightness = 0.02; // Nearly pure black but still tinted
        maxLightness = 0.98; // Nearly pure white, sacrificing some hue
      } else {
        // Other methods: standard dark mode range
        minLightness = 0.08; // Very dark but not pure black
        maxLightness = 0.95; // Very light, sacrificing some hue
      }
    }
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const easedT = easing(t);
      
      // Interpolate lightness (order is handled by min/max values)
      let interpolatedLightness: number;
      
      if (method === 'catmull-rom') {
        // Catmull-Rom needs special handling to prevent overshoot
        const clampedT = Math.max(0, Math.min(1, easedT));
        interpolatedLightness = minLightness + (maxLightness - minLightness) * clampedT;
      } else {
        interpolatedLightness = minLightness + (maxLightness - minLightness) * easedT;
      }
      
      // Apply lightness adjustment parameter
      const finalLightness = minLightness + (interpolatedLightness - minLightness) * lightness;
      
      // Method-specific chroma curves for better results
      let chromaCurve: number;
      let minChroma: number;
      
      switch (method) {
        case 'linear':
          // Linear interpolation works well with a simple bell curve
          chromaCurve = 0.3 + 0.7 * Math.sin(easedT * Math.PI);
          minChroma = 0.05;
          break;
          
        case 'bezier':
          // Bezier has smooth transitions, use a gentler curve
          chromaCurve = 0.4 + 0.6 * Math.sin(easedT * Math.PI);
          minChroma = 0.08;
          break;
          
        case 'catmull-rom':
          // Catmull-Rom can have overshoot, especially with more steps
          // Use a more conservative approach and clamp the eased value
          const clampedT = Math.max(0, Math.min(1, easedT));
          const smoothedT = Math.sin(clampedT * Math.PI * 0.5);
          chromaCurve = 0.5 + 0.5 * smoothedT;
          minChroma = 0.1;
          break;
          
        case 'ease-in':
          // Ease-in starts slow, so we need more chroma at the beginning
          chromaCurve = 0.6 + 0.4 * (1 - Math.pow(1 - easedT, 2));
          minChroma = 0.08;
          break;
          
        case 'ease-out':
          // Ease-out ends slow, so we need more chroma at the end
          chromaCurve = 0.6 + 0.4 * Math.pow(easedT, 2);
          minChroma = 0.08;
          break;
          
        case 'ease-in-out':
          // Ease-in-out is smooth, use a balanced curve
          chromaCurve = 0.35 + 0.65 * Math.sin(easedT * Math.PI);
          minChroma = 0.06;
          break;
          
        default:
          // Fallback to linear
          chromaCurve = 0.3 + 0.7 * Math.sin(easedT * Math.PI);
          minChroma = 0.05;
      }
      
      const interpolatedChroma = adjustedBaseChroma * chromaCurve * chroma;
      const finalChroma = isAchromatic ? 0 : Math.min(maxChroma, Math.max(minChroma, interpolatedChroma));
      
      // Final safety check for lightness bounds - allow more sacrifice of hue at light end
      const minBound = isCatmullRom ? 0.01 : 0.03;
      const maxBound = isCatmullRom ? 0.999 : 0.99; // Allow nearly pure white for all methods
      const clampedLightness = Math.max(minBound, Math.min(maxBound, finalLightness));
      
      const color: Color = {
        mode: 'oklch',
        l: clampedLightness,
        c: finalChroma,
        h: baseHue
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

    // Order colors appropriately for each mode
    // Light mode: lightest first (top of vertical display)
    // Dark mode: darkest first (top of vertical display)
    const finalColors = hexColors;

    console.log(`Final hex colors for ${mode} mode:`, finalColors);
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
async function createColorVariables(lightColors: string[], darkColors: string[] | undefined, baseColor: string, groupName: string, steps: number, exportMode: 'light' | 'dark' | 'both'): Promise<void> {
  try {
    // Find or create the "Colors" collection
    let colorsCollection: VariableCollection | undefined;
    
    // Check if a "Colors" collection already exists
    const existingVariables = await figma.variables.getLocalVariablesAsync();
    
    // Find the Colors collection
    let colorsCollectionId: string | undefined;
    for (const variable of existingVariables) {
      const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      if (collection?.name === "Colors") {
        colorsCollectionId = variable.variableCollectionId;
        break;
      }
    }
    
    colorsCollection = colorsCollectionId ? 
      await figma.variables.getVariableCollectionByIdAsync(colorsCollectionId) : 
      undefined;

    if (!colorsCollection) {
      // Create a new "Colors" collection if it doesn't exist
      colorsCollection = figma.variables.createVariableCollection("Colors");
    }

    // Handle modes for light and dark
    let lightModeId: string;
    let darkModeId: string;

    // Check if Light and Dark modes already exist
    const existingModes = colorsCollection.modes;
    const lightMode = existingModes.find(mode => mode.name === "Light");
    const darkMode = existingModes.find(mode => mode.name === "Dark");

    if (lightMode) {
      lightModeId = lightMode.modeId;
    } else if (exportMode === 'light' || exportMode === 'both') {
      // Create Light mode only if we need it
      lightModeId = colorsCollection.addMode("Light");
    }

    if (darkMode) {
      darkModeId = darkMode.modeId;
    } else if (exportMode === 'dark' || exportMode === 'both') {
      // Create Dark mode only if we need it
      darkModeId = colorsCollection.addMode("Dark");
    }

    // Generate color numbers based on the number of steps
    const colorNumbers = generateColorNumbers(steps);
    
    // Create variables for each color in the scale
    for (let i = 0; i < Math.max(lightColors.length, darkColors?.length || 0); i++) {
      const colorNumber = colorNumbers[i];
      const variableName = `${groupName}/${colorNumber}`;
      
      // Check if variable already exists
      const allVariables = await figma.variables.getLocalVariablesAsync();
      const existingVariable = allVariables.find((variable: Variable) => 
        variable.name === variableName && variable.variableCollectionId === colorsCollection!.id
      );

      if (existingVariable) {
        // Update existing variable based on export mode
        if (exportMode === 'light' || exportMode === 'both') {
          const lightColor = lightColors[i];
          if (lightColor && lightModeId) {
            existingVariable.setValueForMode(lightModeId, {
              r: parseInt(lightColor.slice(1, 3), 16) / 255,
              g: parseInt(lightColor.slice(3, 5), 16) / 255,
              b: parseInt(lightColor.slice(5, 7), 16) / 255
            });
          }
        }

        if (exportMode === 'dark' || exportMode === 'both') {
          const darkColor = darkColors?.[i];
          if (darkColor && darkModeId) {
            existingVariable.setValueForMode(darkModeId, {
              r: parseInt(darkColor.slice(1, 3), 16) / 255,
              g: parseInt(darkColor.slice(3, 5), 16) / 255,
              b: parseInt(darkColor.slice(5, 7), 16) / 255
            });
          }
        }
      } else {
        // Create new variable
        const variable = figma.variables.createVariable(variableName, colorsCollection!, 'COLOR');
        
        // Set values based on export mode
        if (exportMode === 'light' || exportMode === 'both') {
          const lightColor = lightColors[i];
          if (lightColor && lightModeId) {
            variable.setValueForMode(lightModeId, {
              r: parseInt(lightColor.slice(1, 3), 16) / 255,
              g: parseInt(lightColor.slice(3, 5), 16) / 255,
              b: parseInt(lightColor.slice(5, 7), 16) / 255
            });
          }
        }

        if (exportMode === 'dark' || exportMode === 'both') {
          const darkColor = darkColors?.[i];
          if (darkColor && darkModeId) {
            variable.setValueForMode(darkModeId, {
              r: parseInt(darkColor.slice(1, 3), 16) / 255,
              g: parseInt(darkColor.slice(3, 5), 16) / 255,
              b: parseInt(darkColor.slice(5, 7), 16) / 255
            });
          }
        }
      }
    }

    // Create appropriate notification message
    let modeText = '';
    if (exportMode === 'light') {
      modeText = ' with Light mode only';
    } else if (exportMode === 'dark') {
      modeText = ' with Dark mode only';
    } else if (exportMode === 'both') {
      modeText = ' with Light and Dark modes';
    }

    const colorCount = exportMode === 'both' ? Math.max(lightColors.length, darkColors?.length || 0) : 
                      exportMode === 'light' ? lightColors.length : 
                      darkColors?.length || 0;

    figma.notify(`Created ${colorCount} color variables in "${groupName}" group within Colors collection${modeText}`);
  } catch (error) {
    console.error('Error creating color variables:', error);
    throw new Error('Failed to create color variables in Figma');
  }
}

// Message handling
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === 'generate-scale') {
      const lightColors = generateColorScale(
        msg.baseColor,
        msg.steps,
        msg.lightness,
        msg.chroma,
        msg.method,
        'light'
      );

      // Always generate dark colors for preview
      const darkColors = generateColorScale(
        msg.baseColor,
        msg.steps,
        msg.lightness,
        msg.chroma,
        msg.method,
        'dark'
      );

      const response: PluginResponse = {
        type: 'scale-generated',
        colors: lightColors,
        darkColors
      };

      figma.ui.postMessage(response);
    } else if (msg.type === 'add-to-figma') {
      const lightColors = generateColorScale(
        msg.baseColor,
        msg.steps,
        msg.lightness,
        msg.chroma,
        msg.method,
        'light'
      );

      let darkColors: string[] | undefined;
      if (msg.exportMode === 'dark' || msg.exportMode === 'both') {
        darkColors = generateColorScale(
          msg.baseColor,
          msg.steps,
          msg.lightness,
          msg.chroma,
          msg.method,
          'dark'
        );
      }

      const groupName = msg.groupName || 'My Color Scale';
      await createColorVariables(lightColors, darkColors, msg.baseColor, groupName, msg.steps, msg.exportMode || 'light');

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
  height: 400,
  themeColors: true
});

// Send initial random color after UI is shown
const initialColor = generateRandomColor();
figma.ui.postMessage({
  type: 'init',
  defaultColor: initialColor
} as PluginResponse);
