// 布局类型
export interface LayoutProps {
  className?: string;
  children?: React.ReactNode;
}

export interface MainLayoutProps extends LayoutProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export interface SidebarProps extends LayoutProps {
  isOpen?: boolean;
  onClose?: () => void;
  width?: number;
  position?: 'left' | 'right';
}

export interface HeaderProps extends LayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export interface FooterProps extends LayoutProps {
  copyright?: string;
  links?: Array<{ label: string; href: string }>;
}