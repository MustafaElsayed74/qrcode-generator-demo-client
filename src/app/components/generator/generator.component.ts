import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, TitleCasePipe, NgStyle } from '@angular/common';

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, TitleCasePipe, NgStyle],
  templateUrl: './generator.component.html',
  styleUrl: './generator.component.css'
})
export class GeneratorComponent {
  private readonly http = inject(HttpClient);
  readonly apiBase = '';

  title = 'QR Code Generator';

  // Type arrays
  typeOptions: Array<'text' | 'url' | 'image' | 'social'> = ['text', 'url', 'image', 'social'];
  eccOptions: Array<'L' | 'M' | 'Q' | 'H'> = ['L', 'M', 'Q', 'H'];

  type: 'text' | 'url' | 'image' | 'social' = 'text';
  text = '';
  url = '';
  imageUrl = '';
  uploadedFileName = '';
  platform: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'linkedin' | 'youtube' = 'instagram';
  username = '';

  darkColor = '#000000';
  lightColor = '#ffffff';
  ecc: 'L' | 'M' | 'Q' | 'H' = 'Q';
  size = 10;

  isGenerating = false;
  qrUrl: string | null = null;

  setType(t: 'text' | 'url' | 'image' | 'social') {
    this.type = t;
    this.qrUrl = null;
  }

  canGenerate(): boolean {
    if (this.type === 'text') return this.text.trim().length > 0;
    if (this.type === 'url') return this.url.trim().length > 0;
    if (this.type === 'image') return this.imageUrl.trim().length > 0;
    if (this.type === 'social') return this.username.trim().length > 0;
    return false;
  }

  async generate() {
    if (!this.canGenerate()) return;
    this.isGenerating = true;
    this.qrUrl = null;
    const body: any = {
      Type: this.type,
      Text: this.text,
      Url: this.type === 'url' ? this.url : this.type === 'image' ? this.imageUrl : undefined,
      Platform: this.type === 'social' ? this.platform : undefined,
      Username: this.type === 'social' ? this.username : undefined,
      Foreground: this.darkColor,
      Background: this.lightColor,
      PixelsPerModule: this.size,
      Ecc: this.ecc
    };
    try {
      const arrayBuffer = await this.http.post(`${this.apiBase}/api/qrcode`, body, { responseType: 'arraybuffer' }).toPromise();
      const blob = new Blob([arrayBuffer!], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      // Apply color recoloring using Canvas
      const img = new Image();
      img.onload = () => {
        const coloredUrl = this.colorizeQRCode(img, this.darkColor, this.lightColor);
        this.qrUrl = coloredUrl;
        this.isGenerating = false;
      };
      img.onerror = () => {
        this.qrUrl = url; // Fallback to original
        this.isGenerating = false;
      };
      img.src = url;
    } catch (err) {
      console.error(err);
      alert('Failed to generate QR code.');
      this.isGenerating = false;
    }
  }

  private colorizeQRCode(img: HTMLImageElement, darkColor: string, lightColor: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Parse colors
    const darkRgb = this.hexToRgb(darkColor);
    const lightRgb = this.hexToRgb(lightColor);

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Get the brightness of the pixel
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

      // If mostly black, replace with dark color
      if (brightness < 128) {
        data[i] = darkRgb.r;
        data[i + 1] = darkRgb.g;
        data[i + 2] = darkRgb.b;
      } else {
        // If mostly white, replace with light color
        data[i] = lightRgb.r;
        data[i + 1] = lightRgb.g;
        data[i + 2] = lightRgb.b;
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  }

  download() {
    if (!this.qrUrl) return;
    const a = document.createElement('a');
    a.href = this.qrUrl;
    a.download = `qr-${this.type}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'text': return '📝';
      case 'url': return '🔗';
      case 'image': return '🖼️';
      case 'social': return '👤';
      default: return '🎯';
    }
  }

  getEccTooltip(level: string): string {
    const tooltips: { [key: string]: string } = {
      'L': 'Low: ~7% error correction',
      'M': 'Medium: ~15% error correction',
      'Q': 'Quartile: ~25% error correction',
      'H': 'High: ~30% error correction'
    };
    return tooltips[level] || '';
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  onImageFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.uploadedFileName = file.name;
    const formData = new FormData();
    formData.append('file', file);

    // Upload the image to the backend
    this.http.post(`${this.apiBase}/api/upload`, formData, {
      responseType: 'json'
    }).subscribe({
      next: (response: any) => {
        // Backend returns the image URL
        this.imageUrl = response.url;
        console.log('Image uploaded successfully:', this.imageUrl);
      },
      error: (err) => {
        console.error('Image upload failed:', err);
        alert('Failed to upload image. Make sure the backend is running.');
      }
    });
  }
}

