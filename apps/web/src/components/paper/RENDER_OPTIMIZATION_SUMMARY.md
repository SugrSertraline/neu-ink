# BlockRenderer 重新渲染问题优化方案

## 问题分析

在切换到编辑模式后，hover 其他 block 会导致编辑组件重新渲染的主要原因：

1. **BlockRenderer 组件依赖项过多**：`renderContent` 函数依赖了太多变量，包括 `streamProgressData`，这会导致任何相关状态变化都触发重新渲染。

2. **BlockEditor 组件的状态管理问题**：`BlockEditor` 中使用了多个 `useEffect` 监听状态变化，可能导致不必要的重新渲染。

3. **PaperBlock 组件的动态导入**：每次渲染都会创建新的 `BlockEditor` 动态导入。

4. **PaperContent 组件的渲染函数不稳定**：`renderSection` 函数依赖了太多变量，导致频繁重新创建。

## 实施的优化方案

### 1. BlockRenderer 组件优化

- **使用 useMemo 优化 inlineRendererBaseProps**：
  ```typescript
  const inlineRendererBaseProps = useMemo(() => ({
    searchQuery,
    highlightedRefs: effectiveHighlightedRefs,
    setHighlightedRefs: handleHighlightedRefs,
    contentRef: effectiveContentRef,
    references,
  }), [searchQuery, effectiveHighlightedRefs, handleHighlightedRefs, effectiveContentRef, references]);
  ```

- **将 renderContent 从 useCallback 改为 useMemo**：
  ```typescript
  const renderContent = useMemo(() => {
    // 渲染逻辑
  }, [/* 优化后的依赖项 */]);
  ```

- **移除不必要的依赖项**：从依赖数组中移除 `streamProgressData`，避免频繁重新渲染。

### 2. BlockEditor 组件优化

- **使用 useMemo 优化 config**：
  ```typescript
  const config = useMemo(() => getBlockTypeConfig(block.type), [block.type]);
  ```

- **优化 useEffect 依赖项**：减少不必要的依赖项，避免频繁触发。

### 3. PaperBlock 组件优化

- **将动态导入移到组件外部**：
  ```typescript
  const BlockEditorComponent = React.lazy(() => import('../editor/BlockEditor'));
  ```

- **避免每次渲染都重新创建动态导入**。

### 4. PaperContent 组件优化

- **优化 renderSection 函数的依赖项**：减少不必要的依赖项，使用更稳定的引用。

## 预期效果

1. **减少不必要的重新渲染**：hover 其他 block 时不会触发编辑组件的重新渲染。
2. **提高性能**：减少组件的重新渲染次数，提升用户体验。
3. **保持功能完整性**：所有原有功能保持不变，只是优化了性能。

## 滚动问题

滚动本身不应该触发重新渲染，但如果滚动导致了某些状态变化（如 activeBlockId），则可能会触发重新渲染。我们的优化方案也考虑了这一点，通过减少依赖项来最小化滚动时的重新渲染。

## 使用方法

优化后的组件与原组件 API 完全兼容，可以直接替换使用。所有优化都是内部实现细节的改变，不影响外部使用方式。

## 测试建议

1. 测试编辑模式的切换是否正常
2. 测试 hover 其他 block 是否不再触发编辑组件重新渲染
3. 测试滚动时是否还有不必要的重新渲染
4. 测试所有编辑功能是否正常工作

## 注意事项

1. 优化主要集中在减少不必要的重新渲染，不改变任何业务逻辑
2. 所有优化都使用了 React 的最佳实践（useMemo, useCallback 等）
3. 保持了组件的原有 API 和行为