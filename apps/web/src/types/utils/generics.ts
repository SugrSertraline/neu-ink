// 泛型类型
export type Constructor<T = {}> = new (...args: any[]) => T;
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

export type AnyFunction<T extends any[] = any[], R = any> = (...args: T) => R;
export type PromiseFunction<T extends any[] = any[], R = any> = (...args: T) => Promise<R>;

export type ComponentType<P = {}> = React.ComponentType<P>;
export type ReactNode = React.ReactNode;

export type ElementOf<T> = T extends (infer E)[] ? E : never;
export type LengthOf<T extends readonly any[]> = T['length'];
export type FirstOf<T extends readonly any[]> = T[0];

// 条件类型
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type Not<C extends boolean> = C extends true ? false : true;
export type And<A extends boolean, B extends boolean> = A extends true ? B : false;
export type Or<A extends boolean, B extends boolean> = A extends true ? true : B;
export type Xor<A extends boolean, B extends boolean> = A extends B ? false : true;