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

  export interface ReactGridLayoutProps {
    className?: string;
    layout?: LayoutItem[];
    cols?: number;
    rowHeight?: number;
    width?: number;
    onLayoutChange?: (layout: LayoutItem[]) => void;
    onDragStop?: (layout: LayoutItem[], oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, e: MouseEvent, element: HTMLElement) => void;
    onResizeStop?: (layout: LayoutItem[], oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, e: MouseEvent, element: HTMLElement) => void;
    draggableHandle?: string;
    isResizable?: boolean;
    isDraggable?: boolean;
    children?: React.ReactNode;
  }

  export interface ResponsiveProps extends Omit<ReactGridLayoutProps, 'cols' | 'layout'> {
    layouts?: { [breakpoint: string]: LayoutItem[] };
    breakpoints?: { [breakpoint: string]: number };
    cols?: { [breakpoint: string]: number };
  }

  export class Responsive extends React.Component<ResponsiveProps> {}

  export default class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}

  export function WidthProvider<P extends object>(
    component: React.ComponentType<P>
  ): React.ComponentType<Omit<P, 'width'>>;
}

declare module 'react-grid-layout/css/styles.css' {
  const content: string;
  export default content;
}

declare module 'react-resizable/css/styles.css' {
  const content: string;
  export default content;
}
