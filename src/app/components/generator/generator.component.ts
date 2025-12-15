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
      this.qrUrl = url;
    } catch (err) {
      console.error(err);
      alert('Failed to generate QR code.');
    } finally {
      this.isGenerating = false;
    }
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

  getQrWrapperStyle() {
    return {
      '--dark-color': this.darkColor,
      '--light-color': this.lightColor
    } as any;
  }

  getQrImageStyle() {
    // Convert hex colors to filter values for colorizing the QR code
    const darkRgb = this.hexToRgb(this.darkColor);
    const lightRgb = this.hexToRgb(this.lightColor);

    // Calculate the hue and saturation from the dark color
    const { h, s } = this.rgbToHsl(darkRgb.r, darkRgb.g, darkRgb.b);

    return {
      '--dark-color': this.darkColor,
      '--light-color': this.lightColor,
      'filter': `brightness(0) saturate(100%) invert(1) sepia(1) hue-rotate(${h}deg) saturate(${s}%)`,
      'background-color': this.lightColor
    } as any;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
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

