import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, TitleCasePipe],
  templateUrl: './generator.component.html',
  styleUrl: './generator.component.css'
})
export class GeneratorComponent {
  private readonly http = inject(HttpClient);
  readonly apiBase = 'https://qrcode-generator.somee.com';

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
      const blob = await this.http.post(`${this.apiBase}/api/qrcode`, body, { responseType: 'blob' }).toPromise();
      const url = URL.createObjectURL(blob!);
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

