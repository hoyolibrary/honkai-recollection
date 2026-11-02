import pMap from 'p-map';

interface IterationOption {
  concurrency?: number;
  signal?: AbortSignal;
  /** 遇到错误时是否立即停止 */
  stopOnError?: boolean;
}

/** 详细的错误记录接口 */
interface IterationError<T> {
  index: number;
  item: T;
  error: any;
}

interface ForEachAsyncResult<T> {
  errors: IterationError<T>[];
  isCanceled: boolean;
}

// 定义一个辅助函数：用于创建一个可以被中断的任务包装器
const wrapWithAbort = <R>(task: Promise<R>, signal?: AbortSignal): Promise<R> => {
  if (!signal) return task;
  return Promise.race([
    task,
    new Promise<never>((_, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort);
    })
  ]);
};

/**
 * 增强型异步循环：支持并发控制、底层信号透传、错误上下文收集
 */
export async function forEachAsync<T>(
  source: T[],
  fn: (value: T, index: number, signal?: AbortSignal) => Promise<void>,
  options: IterationOption = {}
): Promise<ForEachAsyncResult<T>> {
  const { 
    concurrency = Infinity, 
    signal, 
    stopOnError = false 
  } = options;

  const errors: IterationError<T>[] = [];

  try {
    await pMap(
      source,
      async (item, index) => {
        // 运行前检查取消状态
        if (signal?.aborted) return;

        try {
          // 透传 signal 供 fn 内部优化（如 fetch(url, { signal })）
          // 同时通过 wrapWithAbort 确保 fn 哪怕不处理 signal 也能被外部强制熔断
          await wrapWithAbort(fn(item, index, signal), signal);
        } catch (err) {
          // 如果错误是由信号取消引发的，则不视为执行错误
          if (err === signal?.reason || signal?.aborted) {
            return;
          }

          errors.push({ index, item, error: err });

          if (stopOnError) throw err;
        }
      },
      { 
        concurrency,
        stopOnError 
      }
    );
  } catch (err) {
    // 捕获 stopOnError 引发的退出
  }

  return {
    errors,
    isCanceled: signal?.aborted ?? false
  };
}