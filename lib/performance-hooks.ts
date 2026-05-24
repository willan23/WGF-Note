/**
 * Hook para memoização de componentes pesados com carregamento sob demanda
 * Implementa lazy loading com React.lazy() e Suspense
 */

import React, { Suspense, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  timeout?: number;
}

/**
 * Componente de fallback padrão para carregamento lazy
 */
export function DefaultLazyFallback() {
  const colors = useColors();
  
  return (
    <View style={[styles.fallbackContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

/**
 * Hook para criar componentes com memoização automática
 * Previne re-renderizações desnecessárias baseadas em props
 */
export function useMemoComponent<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: React.ComponentProps<T>, nextProps: React.ComponentProps<T>) => boolean
): React.MemoExoticComponent<T> {
  return useMemo(() => React.memo(Component, propsAreEqual), [Component]);
}

/**
 * Hook para estabilizar callbacks e prevenir re-criações
 * Versão aprimorada do useCallback com comparação profunda opcional
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[],
  deepCompare?: boolean
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, deps) as T;
}

/**
 * Hook para virtualização de listas longas
 * Renderiza apenas itens visíveis na tela
 */
export interface VirtualListOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

export interface VirtualListState {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
  offsetY: number;
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListState & {
  onScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
} {
  const { itemHeight, overscan = 5, containerHeight = 0 } = options;
  const scrollOffsetRef = useRef(0);
  const [state, setState] = React.useState<VirtualListState>({
    startIndex: 0,
    endIndex: Math.ceil(containerHeight / itemHeight) + overscan,
    visibleItems: items.slice(0, Math.ceil(containerHeight / itemHeight) + overscan),
    totalHeight: items.length * itemHeight,
    offsetY: 0,
  });

  const updateVisibleItems = useCallback((offsetY: number) => {
    scrollOffsetRef.current = offsetY;
    
    const startIndex = Math.max(0, Math.floor(offsetY / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    setState({
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY,
    });
  }, [itemHeight, overscan, containerHeight, items.length]);

  const onScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    updateVisibleItems(event.nativeEvent.contentOffset.y);
  }, [updateVisibleItems]);

  // Atualizar quando items mudarem
  useEffect(() => {
    updateVisibleItems(scrollOffsetRef.current);
  }, [items.length, updateVisibleItems]);

  return { ...state, onScroll };
}

/**
 * HOC para carregamento lazy de componentes
 */
export function withLazyLoad<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<React.ComponentType<P>> {
  const { fallback = <DefaultLazyFallback />, timeout = 3000 } = options;
  
  return React.lazy(() => 
    Promise.race([
      importFunc(),
      new Promise<{ default: React.ComponentType<P> }>((_, reject) => 
        setTimeout(() => reject(new Error('Lazy load timeout')), timeout)
      )
    ])
  );
}

/**
 * Componente wrapper para Suspense com fallback customizado
 */
export function LazyBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback || <DefaultLazyFallback />}>
      {children}
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Hook para debouncing de valores
 * Útil para search inputs, resize events, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttling de funções
 * Limita a taxa de execução de uma função
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now;
      return callbackRef.current(...args);
    }
  }, [delay]) as T;
}

/**
 * Hook para cache de resultados de computações pesadas
 * Similar ao useMemo mas com controle manual de invalidação
 */
export function useCachedValue<T>(
  computeFn: () => T,
  key: string,
  maxSize: number = 100
): T {
  const cacheRef = useRef<Map<string, { value: T; timestamp: number }>>(new Map());
  
  const cached = cacheRef.current.get(key);
  if (cached) {
    return cached.value;
  }
  
  const value = computeFn();
  
  // Limpar cache se exceder tamanho máximo
  if (cacheRef.current.size >= maxSize) {
    const firstKey = cacheRef.current.keys().next().value;
    if (firstKey) {
      cacheRef.current.delete(firstKey);
    }
  }
  
  cacheRef.current.set(key, { value, timestamp: Date.now() });
  
  return value;
}

/**
 * Hook para gerenciar Web Workers de forma simplificada
 */
export function useWorker<T, R>(
  workerFactory: () => Worker,
  onMessage?: (result: R) => void
) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  useEffect(() => {
    const worker = workerFactory();
    workerRef.current = worker;
    
    worker.onmessage = (event) => {
      setIsProcessing(false);
      onMessage?.(event.data);
    };
    
    worker.onerror = () => {
      setIsProcessing(false);
    };
    
    setIsReady(true);
    
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [workerFactory, onMessage]);

  const postMessage = useCallback((data: T) => {
    if (workerRef.current && isReady) {
      setIsProcessing(true);
      workerRef.current.postMessage(data);
    }
  }, [isReady]);

  return { postMessage, isReady, isProcessing };
}

export { DefaultLazyFallback as LazyFallback };
export default LazyBoundary;
