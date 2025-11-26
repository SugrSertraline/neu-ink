/**
 * Store 工具函数
 */

/**
 * 创建选择器函数
 * @param selector 选择器函数
 * @returns 选择器函数
 */
export function createSelector<T, R>(selector: (state: T) => R) {
  return selector;
}

/**
 * 创建多个选择器的组合
 * @param selectors 选择器数组
 * @returns 组合选择器
 */
export function createCombinedSelector<T, R extends any[]>(
  ...selectors: Array<(state: T) => R[number]>
) {
  return (state: T): R => {
    return selectors.map(selector => selector(state)) as R;
  };
}

/**
 * 创建条件选择器
 * @param condition 条件函数
 * @param trueSelector 条件为真时的选择器
 * @param falseSelector 条件为假时的选择器
 * @returns 条件选择器
 */
export function createConditionalSelector<T, R>(
  condition: (state: T) => boolean,
  trueSelector: (state: T) => R,
  falseSelector: (state: T) => R
) {
  return (state: T): R => {
    return condition(state) ? trueSelector(state) : falseSelector(state);
  };
}

/**
 * 创建计算选择器（类似 useMemo）
 * @param dependencies 依赖选择器数组
 * @param compute 计算函数
 * @returns 计算选择器
 */
export function createComputedSelector<T, D extends any[], R>(
  dependencies: Array<(state: T) => D[number]>,
  compute: (...deps: D) => R
) {
  let lastDeps: D | undefined;
  let lastResult: R;

  return (state: T): R => {
    const currentDeps = dependencies.map(dep => dep(state)) as D;
    
    // 简单的依赖比较
    if (!lastDeps || !depsEqual(lastDeps, currentDeps)) {
      lastResult = compute(...currentDeps);
      lastDeps = currentDeps;
    }
    
    return lastResult;
  };
}

/**
 * 简单的依赖比较函数
 */
function depsEqual<T extends any[]>(deps1: T, deps2: T): boolean {
  if (deps1.length !== deps2.length) return false;
  
  return deps1.every((dep, index) => {
    const dep2 = deps2[index];
    if (dep === dep2) return true;
    if (typeof dep !== typeof dep2) return false;
    if (typeof dep === 'object' && dep !== null && dep2 !== null) {
      return JSON.stringify(dep) === JSON.stringify(dep2);
    }
    return false;
  });
}

/**
 * 创建 action 包装器，添加错误处理
 * @param action 原始 action
 * @param errorHandler 错误处理函数
 * @returns 包装后的 action
 */
export function createActionWithErrorHandling<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  errorHandler?: (error: Error, ...args: T) => void
) {
  return async (...args: T): Promise<R> => {
    try {
      return await action(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      errorHandler?.(err, ...args);
      throw err;
    }
  };
}

/**
 * 创建带日志的 action
 * @param action 原始 action
 * @param name Action 名称
 * @returns 带日志的 action
 */
export function createLoggedAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    console.log(`[Action] ${name} started`, args);
    try {
      const result = await action(...args);
      console.log(`[Action] ${name} succeeded`, result);
      return result;
    } catch (error) {
      console.error(`[Action] ${name} failed`, error);
      throw error;
    }
  };
}