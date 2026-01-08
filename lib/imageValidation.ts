// lib/imageValidation.ts
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  // Validar que no esté vacía
  if (!url || url.trim() === '') {
    return { valid: false, error: "URL vacía" };
  }

  // Validar que sea una URL válida
  try {
    const urlObj = new URL(url);
    
    // Validar que sea HTTP o HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: "Solo se permiten URLs HTTP o HTTPS" };
    }
  } catch {
    return { valid: false, error: "URL inválida" };
  }

  // Validar extensiones permitidas
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );

  if (!hasValidExtension) {
    return { 
      valid: false, 
      error: "Formato no válido. Usa: JPG, PNG, WEBP, GIF, SVG o AVIF" 
    };
  }

  // Validar dominios de confianza (opcional - puedes comentar esto si quieres permitir cualquier dominio)
  const trustedDomains = [
    'postimg.cc',
    'i.postimg.cc',
    'imgur.com',
    'i.imgur.com',
    'cloudinary.com',
    'drive.google.com',
    'img.jan-ku.com',
    'cdn.shopify.com',
    'images.unsplash.com',
    // Agrega tus dominios de confianza aquí
  ];

  const urlObj = new URL(url);
  const isTrusted = trustedDomains.some(domain => 
    urlObj.hostname.includes(domain)
  );

  // Solo advertir en desarrollo, no bloquear
  if (!isTrusted && process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ Dominio no está en la lista de confianza: ${urlObj.hostname}`);
  }

  return { valid: true };
}

export function validateMultipleImageUrls(urls: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  urls.forEach((url, index) => {
    const validation = validateImageUrl(url);
    if (!validation.valid) {
      errors.push(`Imagen ${index + 1}: ${validation.error} - URL: ${url}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// Límites recomendados
export const IMAGE_LIMITS = {
  MAX_ADDITIONAL_IMAGES: 10,
  MAX_URL_LENGTH: 2000,
};