'use client';

import React, { useState, useRef } from 'react';
import { ScanLine, Download, Printer, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function QRGeneratorPage() {
  const [tableId, setTableId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQR = () => {
    const baseUrl = window.location.origin;
    const orderUrl = `${baseUrl}/order/start?market=serenbe-farmers-market${tableId ? `&table=${tableId}` : ''}&source=qr`;
    
    // Generate QR code using Google Chart API
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(orderUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `gratog-qr-${tableId || 'general'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR code downloaded');
  };

  const copyLink = () => {
    const baseUrl = window.location.origin;
    const orderUrl = `${baseUrl}/order/start?market=serenbe-farmers-market${tableId ? `&table=${tableId}` : ''}`;
    
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">QR Code Generator</h1>

      <Card className="p-6 space-y-6">
        <div>
          <Label htmlFor="tableId">Table/Location ID (optional)</Label>
          <Input
            id="tableId"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            placeholder="e.g., Table-A1, Front-Table, etc."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank for general market QR code
          </p>
        </div>

        <Button onClick={generateQR} className="w-full">
          <ScanLine className="w-4 h-4 mr-2" />
          Generate QR Code
        </Button>

        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadQR} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button variant="outline" onClick={copyLink} className="flex-1">
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                )}
              </Button>
            </div>

            <div className="bg-muted p-3 rounded text-sm font-mono break-all">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/order/start?market=serenbe-farmers-market${tableId ? `&table=${tableId}` : ''}`}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground mb-2">Printing Tips:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Print on cardstock for durability</li>
          <li>Recommended size: 4"×4" minimum</li>
          <li>Place at eye level for easy scanning</li>
          <li>Test with your phone before printing</li>
        </ul>
      </div>
    </div>
  );
}
