// 辅助类型
export type Nullable<T> = T | null;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Maybe<T> = T | null | undefined;

export type Awaitable<T> = T | Promise<T>;
export type AsyncFunction<T = void> = () => Promise<T>;
export type SyncFunction<T = void> = () => T;

export type EventHandler<T = Event> = (event: T) => void;
export type AsyncCallback<T = void> = (error: Error | null, result: T | null) => void;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type PickByValue<T, V> = Pick<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;
export type OmitByValue<T, V> = Omit<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;