/**
 * Image Pre-Processing Pipeline for OCR
 * Applies contrast enhancement, sharpening, noise reduction,
 * and grayscale conversion to improve OCR accuracy on real photos.
 */

export interface PreprocessOptions {
  contrast?: number;    // 1.0 = normal, 1.5 = enhanced
  brightness?: number;  // 1.0 = normal
  sharpen?: boolean;
  grayscale?: boolean;
  denoise?: boolean;
  maxWidth?: number;    // downscale large images
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  contrast: 1.6,
  brightness: 1.1,
  sharpen: true,
  grayscale: true,
  denoise: true,
  maxWidth: 2400,
};

/**
 * Preprocesses a document image for better OCR accuracy.
 * Returns a new Blob with the processed image.
 */
export async function preprocessImage(
  input: File | Blob,
  options: PreprocessOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const imageBitmap = await createImageBitmap(input);
  let { width, height } = imageBitmap;

  // Downscale if too large
  if (opts.maxWidth && width > opts.maxWidth) {
    const scale = opts.maxWidth / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  // Draw original image
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  // Get pixel data for manipulation
  let imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Step 1: Grayscale conversion
  if (opts.grayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }

  // Step 2: Contrast & brightness adjustment
  const contrast = opts.contrast ?? 1.0;
  const brightness = opts.brightness ?? 1.0;
  const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      // Apply brightness
      val = val * brightness;
      // Apply contrast
      val = factor * (val - 128) + 128;
      data[i + c] = Math.max(0, Math.min(255, Math.round(val)));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Step 3: Simple noise reduction (3x3 median-like smoothing on dark noise)
  if (opts.denoise) {
    imageData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          // Collect 3x3 neighborhood
          const neighbors: number[] = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              neighbors.push(src[((y + dy) * width + (x + dx)) * 4 + c]);
            }
          }
          neighbors.sort((a, b) => a - b);
          // Use median to reduce salt-and-pepper noise
          dst[idx + c] = neighbors[4]; // median of 9 values
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Step 4: Unsharp mask sharpening
  if (opts.sharpen) {
    imageData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    const amount = 0.6;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          // Laplacian kernel for edge detection
          const center = src[idx + c] * 5;
          const top = src[((y - 1) * width + x) * 4 + c];
          const bottom = src[((y + 1) * width + x) * 4 + c];
          const left = src[(y * width + (x - 1)) * 4 + c];
          const right = src[(y * width + (x + 1)) * 4 + c];
          const sharp = center - top - bottom - left - right;
          dst[idx + c] = Math.max(0, Math.min(255, Math.round(src[idx + c] + amount * sharp)));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Step 5: Adaptive thresholding for document binarization
  // Apply Otsu-like global threshold to make text crisp
  if (opts.grayscale) {
    imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;

    // Compute histogram
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[d[i]]++;

    const total = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];

    let sumB = 0, wB = 0, wF = 0, maxVar = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVar) { maxVar = variance; threshold = t; }
    }

    // Apply mild threshold (blend between original and binary)
    const blend = 0.3; // 30% binarization influence
    for (let i = 0; i < d.length; i += 4) {
      const binary = d[i] > threshold ? 255 : 0;
      const blended = Math.round(d[i] * (1 - blend) + binary * blend);
      d[i] = d[i + 1] = d[i + 2] = blended;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await canvas.convertToBlob({ type: "image/png", quality: 0.95 });
  return blob;
}
