import { useCallback, useRef } from 'react';

/**
 * 防抖hook，用于防止函数被频繁调用
 * @param callback 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}

/**
 * API调用防重复hook，确保相同的API调用在短时间内只执行一次
 * @param apiCall API调用函数
 * @param key 唯一标识符
 * @param delay 防重复时间间隔（毫秒）
 * @returns 防重复的API调用函数
 */
export function useApiCallDeduplication<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  key: string,
  delay: number = 1000
): T {
  const lastCallTimeRef = useRef<{ [key: string]: number }>({});
  const pendingCallsRef = useRef<{ [key: string]: Promise<any> }>({});

  const debouncedApiCall = useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now();
      const lastCallTime = lastCallTimeRef.current[key] || 0;

      // 如果距离上次调用时间太短且有正在进行的请求，返回该请求
      if (now - lastCallTime < delay) {
        const pendingCall = pendingCallsRef.current[key];
        if (pendingCall) {
          return pendingCall;
        }
      }

      // 更新最后调用时间
      lastCallTimeRef.current[key] = now;

      // 创建新的API调用
      const promise = apiCall(...args);
      pendingCallsRef.current[key] = promise;

      // 清理完成的请求
      promise.finally(() => {
        delete pendingCallsRef.current[key];
      });

      return promise;
    },
    [apiCall, key, delay]
  ) as T;

  return debouncedApiCall;
}