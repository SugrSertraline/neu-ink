import { LucideIcon } from 'lucide-react';
import { User } from './user';

// ✅ 删除 'dashboard' 类型
export type TabType = 'library' | 'paper' | 'settings' | 'public-library';

export interface NavItem {
  id: string;
  type: TabType;
  label: string;
  icon: LucideIcon;
  path: string;
  requiresAuth?: boolean;
  badge?: string | ((user: User | null, isAdmin: boolean) => string | undefined);
  activeColor?: 'blue' | 'indigo' | 'cyan' | 'slate' | 'purple';
  closable?: boolean;
  showInSidebar?: boolean;
  isPermanentTab?: boolean;
  disabled?: boolean;
}
