'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

const CALENDAR_SERVICES = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📅',
    getUrl: (event) => {
      const startDate = new Date(`${event.date}T${event.startTime}:00`);
      const endDate = new Date(`${event.date}T${event.endTime}:00`);
      
      const params = new URLSearchParams({
        text: `Taste of Gratitude at ${event.marketName}`,
        dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
        details: `Visit us at ${event.marketName} for fresh sea moss products! Discover our wildcrafted wellness blends.`,
        location: event.address,
        sf: 'true' // Show only free calendars
      });
      
      // Use the modern event edit URL instead of render
      return `https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`;
    }
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: '📆',
    getUrl: (event) => {
      const startDate = new Date(`${event.date}T${event.startTime}:00`);
      const endDate = new Date(`${event.date}T${event.endTime}:00`);
      
      const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: `Taste of Gratitude at ${event.marketName}`,
        startdt: startDate.toISOString(),
        enddt: endDate.toISOString(),
        body: `Visit us at ${event.marketName} for fresh sea moss products!`,
        location: event.address
      });
      
      return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
    }
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: '📅',
    isDownload: true
  },
  {
    id: 'ics',
    name: 'Download ICS',
    icon: '📋',
    isDownload: true
  }
];

function formatGoogleDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export default function AddToCalendarButton({ 
  marketName, 
  date, 
  startTime, 
  endTime, 
  address,
  className = '',
  variant = 'outline'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const event = {
    marketName,
    date,
    startTime,
    endTime,
    address
  };

  const handleCalendarClick = async (service) => {
    AnalyticsSystem.trackAddToCalendar(marketName, `${date}T${startTime}:00`);
    
    if (service.isDownload) {
      await downloadICS();
    } else {
      const url = service.getUrl(event);
      window.open(url, '_blank');
    }
    
    setIsOpen(false);
    toast.success(`Opening ${service.name}...`);
  };

  const downloadICS = async () => {
    try {
      setDownloading(true);
      
      const params = new URLSearchParams({
        market: marketName,
        date: date,
        startTime: startTime,
        endTime: endTime
      });
      
      const response = await fetch(`/api/ics/market-route?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `taste-of-gratitude-${marketName.toLowerCase().replace(/\s+/g, '-')}-${date}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download calendar file');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download calendar file');
    } finally {
      setDownloading(false);
    }
  };

  if (isOpen) {
    return (
      <div className="relative inline-block">
        <div className="absolute top-full left-0 z-50 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
            Add to Calendar
          </div>
          {CALENDAR_SERVICES.map((service) => (
            <button
              key={service.id}
              onClick={() => handleCalendarClick(service)}
              disabled={downloading && service.isDownload}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <span className="text-base">{service.icon}</span>
              <span>{service.name}</span>
              {service.isDownload && (
                <Download className="w-3 h-3 ml-auto" />
              )}
              {!service.isDownload && (
                <ExternalLink className="w-3 h-3 ml-auto" />
              )}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {/* Backdrop */}
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      </div>
    );
  }

  return (
    <Button 
      variant={variant}
      onClick={() => setIsOpen(true)}
      className={`${className}`}
    >
      <Calendar className="w-4 h-4 mr-2" />
      Add to Calendar
    </Button>
  );
}