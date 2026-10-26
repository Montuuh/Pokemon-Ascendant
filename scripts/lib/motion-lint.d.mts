export interface MotionHit {
  file: string;
  line: number;
  rule: 'transition-all' | 'ease-in' | 'layout-property' | 'scale-zero' | 'literal-duration' | 'ungated-motion' | 'one-switch';
  detail: string;
}
export function lintMotion(file: string, raw: string): MotionHit[];
export function motionFiles(root: string, dirs?: string[]): string[];
export function lintMotionFiles(root: string, files: string[]): MotionHit[];
export function formatMotion(hits: MotionHit[]): string[];
