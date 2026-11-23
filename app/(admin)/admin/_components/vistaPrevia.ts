// Vista previa de una imagen elegida en el panel (fase 28, D-95). Se lee como `data:` porque la CSP permite
// `data:` en img-src y no `blob:` (antes, con URL.createObjectURL, la vista previa salía rota). Lo que se sube
// a Cloudinary sigue siendo el File original; esta URL solo se muestra y nunca se guarda.

export function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") resolve(lector.result);
      else reject(new Error("Vista previa no disponible"));
    };
    lector.onerror = () => reject(lector.error ?? new Error("Vista previa no disponible"));
    lector.readAsDataURL(file);
  });
}
