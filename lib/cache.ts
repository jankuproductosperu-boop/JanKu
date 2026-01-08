type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL = 300000) { // 5 minutos por defecto
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT: ${key}`);
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cache SET: ${key}`);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache DELETE: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache CLEARED');
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache CLEANUP: ${cleaned} entradas eliminadas`);
    }
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const cache = new SimpleCache();

if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 600000); // 10 minutos
}

/**
 * Función helper para fetch con caché automático y retry
 */
export async function fetchWithCache<T = any>(
  url: string, 
  options: {
    ttl?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { ttl, retries = 2, retryDelay = 1000 } = options;
  const cacheKey = `fetch:${url}`;

  // Intentar obtener de caché
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Función de fetch con retry
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 Fetching (intento ${attempt + 1}/${retries + 1}): ${url}`);
      
      const response = await fetch(url, {
        cache: 'no-store', // Evitar caché del navegador
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Validar que sea un array válido
      if (!Array.isArray(data)) {
        console.warn(`⚠️ API no devolvió array: ${url}`, data);
        const emptyArray = [] as T;
        cache.set(cacheKey, emptyArray);
        return emptyArray;
      }

      // Guardar en caché
      cache.set(cacheKey, data);
      return data as T;
      
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Error en fetch (intento ${attempt + 1}):`, error.message);
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < retries) {
        console.log(`⏳ Reintentando en ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  console.error(`💥 Todos los intentos fallaron para: ${url}`);
  
  // Devolver array vacío en lugar de lanzar error
  const emptyArray = [] as T;
  return emptyArray;
}

/**
 * Invalida el caché de una URL específica
 */
export function invalidateCache(url: string): void {
  const cacheKey = `fetch:${url}`;
  cache.delete(cacheKey);
}

/**
 * Invalida todos los cachés que coincidan con un patrón
 */
export function invalidateCachePattern(pattern: string): void {
  const keys = cache.keys();
  let deleted = 0;

  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
      deleted++;
    }
  });

  console.log(`🗑️ Invalidated ${deleted} cache entries matching: ${pattern}`);
}

export default cache;