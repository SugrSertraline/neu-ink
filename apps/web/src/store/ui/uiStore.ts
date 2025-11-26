import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UiState, UiActions, UiStore, DEFAULT_UI_STATE, createNotification } from './uiTypes';

export const useUiStore = create<UiStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初始状态
        ...DEFAULT_UI_STATE,
        
        // 侧边栏操作
        sidebar: {
          ...DEFAULT_UI_STATE.sidebar,
          open: () => set((state) => { state.sidebar.isOpen = true; }),
          close: () => set((state) => { state.sidebar.isOpen = false; }),
          toggle: () => set((state) => { state.sidebar.isOpen = !state.sidebar.isOpen; }),
          setActivePanel: (panel) => set((state) => { state.sidebar.activePanel = panel; }),
          setWidth: (width) => set((state) => { state.sidebar.width = width; }),
          setCollapsed: (collapsed) => set((state) => { state.sidebar.isCollapsed = collapsed; }),
        },
        
        // 模态框操作
        modals: {
          ...DEFAULT_UI_STATE.modals,
          openMetadataEditor: () => set((state) => { state.modals.metadataEditor = true; }),
          closeMetadataEditor: () => set((state) => { state.modals.metadataEditor = false; }),
          openAbstractEditor: () => set((state) => { state.modals.abstractEditor = true; }),
          closeAbstractEditor: () => set((state) => { state.modals.abstractEditor = false; }),
          openReferenceEditor: () => set((state) => { state.modals.referenceEditor = true; }),
          closeReferenceEditor: () => set((state) => { state.modals.referenceEditor = false; }),
          openParseConfirm: () => set((state) => { state.modals.parseConfirm = true; }),
          closeParseConfirm: () => set((state) => { state.modals.parseConfirm = false; }),
          openDeleteConfirm: () => set((state) => { state.modals.deleteConfirm = true; }),
          closeDeleteConfirm: () => set((state) => { state.modals.deleteConfirm = false; }),
        },
        
        // 面板操作
        panels: {
          ...DEFAULT_UI_STATE.panels,
          notesPanel: {
            ...DEFAULT_UI_STATE.panels.notesPanel,
            open: () => set((state) => { state.panels.notesPanel.isOpen = true; }),
            close: () => set((state) => { state.panels.notesPanel.isOpen = false; }),
            toggle: () => set((state) => {
              state.panels.notesPanel.isOpen = !state.panels.notesPanel.isOpen;
            }),
            setPosition: (position) => set((state) => {
              state.panels.notesPanel.position = position;
            }),
            setWidth: (width) => set((state) => { state.panels.notesPanel.width = width; }),
            setHeight: (height) => set((state) => { state.panels.notesPanel.height = height; }),
          },
          tocPanel: {
            ...DEFAULT_UI_STATE.panels.tocPanel,
            open: () => set((state) => { state.panels.tocPanel.isOpen = true; }),
            close: () => set((state) => { state.panels.tocPanel.isOpen = false; }),
            toggle: () => set((state) => {
              state.panels.tocPanel.isOpen = !state.panels.tocPanel.isOpen;
            }),
            setSticky: (sticky) => set((state) => { state.panels.tocPanel.isSticky = sticky; }),
          },
          attachmentsPanel: {
            ...DEFAULT_UI_STATE.panels.attachmentsPanel,
            open: () => set((state) => { state.panels.attachmentsPanel.isOpen = true; }),
            close: () => set((state) => { state.panels.attachmentsPanel.isOpen = false; }),
            toggle: () => set((state) => {
              state.panels.attachmentsPanel.isOpen = !state.panels.attachmentsPanel.isOpen;
            }),
          },
        },
        
        // 工具栏操作
        toolbar: {
          ...DEFAULT_UI_STATE.toolbar,
          show: () => set((state) => { state.toolbar.isVisible = true; }),
          hide: () => set((state) => { state.toolbar.isVisible = false; }),
          toggle: () => set((state) => {
            state.toolbar.isVisible = !state.toolbar.isVisible;
          }),
          setActiveTools: (tools) => set((state) => { state.toolbar.activeTools = tools; }),
          addTool: (tool) => set((state) => {
            if (!state.toolbar.activeTools.includes(tool)) {
              state.toolbar.activeTools.push(tool);
            }
          }),
          removeTool: (tool) => set((state) => {
            state.toolbar.activeTools = state.toolbar.activeTools.filter(t => t !== tool);
          }),
        },
        
        // 通知操作
        notifications: {
          ...DEFAULT_UI_STATE.notifications,
          add: (notification) => {
            const newNotification = createNotification(notification);
            set((state) => {
              state.notifications.items.push(newNotification);
            });
            
            // 自动移除通知
            if (notification.duration !== 0) {
              setTimeout(() => {
                get().notifications.remove(newNotification.id);
              }, notification.duration || 5000);
            }
            
            return newNotification.id;
          },
          remove: (id) => set((state) => {
            state.notifications.items = state.notifications.items.filter(
              item => item.id !== id
            );
          }),
          clear: () => set((state) => { state.notifications.items = []; }),
          setPosition: (position) => set((state) => {
            state.notifications.position = position;
          }),
        },
        
        // 加载操作
        loading: {
          ...DEFAULT_UI_STATE.loading,
          setGlobal: (loading) => set((state) => { state.loading.global = loading; }),
          setComponent: (component, loading) => set((state) => {
            state.loading.components[component] = loading;
          }),
          clearComponent: (component) => set((state) => {
            delete state.loading.components[component];
          }),
          clearAll: () => set((state) => {
            state.loading.global = false;
            state.loading.components = {};
          }),
        },
        
        // 错误操作
        errors: {
          ...DEFAULT_UI_STATE.errors,
          setGlobal: (error) => set((state) => { state.errors.global = error; }),
          setComponent: (component, error) => set((state) => {
            state.errors.components[component] = error;
          }),
          clearComponent: (component) => set((state) => {
            delete state.errors.components[component];
          }),
          clearAll: () => set((state) => {
            state.errors.global = null;
            state.errors.components = {};
          }),
        },
        
        // 主题操作
        theme: {
          ...DEFAULT_UI_STATE.theme,
          setMode: (mode) => set((state) => { state.theme.mode = mode; }),
          setPrimaryColor: (color) => set((state) => { state.theme.primaryColor = color; }),
        },
        
        // 布局操作
        layout: {
          ...DEFAULT_UI_STATE.layout,
          setHeaderHeight: (height) => set((state) => { state.layout.headerHeight = height; }),
          setFooterHeight: (height) => set((state) => { state.layout.footerHeight = height; }),
          setContentPadding: (padding) => set((state) => { state.layout.contentPadding = padding; }),
        },
        
        // 重置操作
        reset: () => set((state) => {
          Object.assign(state, DEFAULT_UI_STATE);
        }),
      })),
      {
        name: 'ui-store',
      }
    )
  )
);

// 便捷的 hooks
export const useSidebar = () => useUiStore((state) => state.sidebar);
export const useModals = () => useUiStore((state) => state.modals);
export const usePanels = () => useUiStore((state) => state.panels);
export const useToolbar = () => useUiStore((state) => state.toolbar);
export const useNotifications = () => useUiStore((state) => state.notifications);
export const useLoading = () => useUiStore((state) => state.loading);
export const useErrors = () => useUiStore((state) => state.errors);
export const useTheme = () => useUiStore((state) => state.theme);
export const useLayout = () => useUiStore((state) => state.layout);