declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface GridLayoutProps {
    className?: string;
    layout?: LayoutItem[];
    cols?: number;
    rowHeight?: number;
    width: number;
    onLayoutChange?: (layout: LayoutItem[]) => void;
    onDragStop?: (layout: LayoutItem[], oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, e: MouseEvent, element: HTMLElement) => void;
    onResizeStop?: (layout: LayoutItem[], oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, e: MouseEvent, element: HTMLElement) => void;
    draggableHandle?: string;
    isResizable?: boolean;
    isDraggable?: boolean;
    children?: React.ReactNode;
  }

  export interface ResponsiveGridLayoutProps extends Omit<GridLayoutProps, 'cols' | 'layout'> {
    layouts?: { [breakpoint: string]: LayoutItem[] };
    breakpoints?: { [breakpoint: string]: number };
    cols?: { [breakpoint: string]: number };
    onBreakpointChange?: (breakpoint: string, cols: number) => void;
  }

  export function ResponsiveGridLayout(props: ResponsiveGridLayoutProps): React.JSX.Element;
  export function GridLayout(props: GridLayoutProps): React.JSX.Element;
  export default GridLayout;

  export function useContainerWidth(options?: {
    measureBeforeMount?: boolean;
    initialWidth?: number;
  }): { width: number; ref: React.RefCallback<HTMLDivElement> };
}

declare module 'react-grid-layout/css/styles.css' {
  const content: string;
  export default content;
}

declare module 'react-resizable/css/styles.css' {
  const content: string;
  export default content;
}
