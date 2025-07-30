declare module 'culori' {
  export interface Color {
    l?: number;
    c?: number;
    h?: number;
    r?: number;
    g?: number;
    b?: number;
    [key: string]: any;
  }

  export function oklch(color: string | Color): Color | null;
  export function formatHex(color: Color): string;
  export function interpolate(colors: Color[], mode?: string): (t: number) => Color;
} 