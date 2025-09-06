export interface Caption {
  start: number;
  end: number;
  text: string;
}

export type HorizontalAlign = 'left' | 'center' | 'right';
export type CaptionEffect = 'none' | 'shadow' | 'outline';

export interface StyleOptions {
    foregroundColor: string;
    foregroundColorOpacity: number;
    backgroundColor: string;
    backgroundOpacity: number;
    fontSize: number; // as a percentage of video height
    maxWidth: number; // as a percentage of video width
    padding: number; // as a percentage of font size
    borderRadius: number; // in pixels
    position: { x: number; y: number }; // x, y as percentages of video dimensions
    horizontalAlign: HorizontalAlign; // text alignment within the box
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    // New properties for effects
    effect: CaptionEffect;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    strokeColor: string;
    strokeWidth: number;
}
