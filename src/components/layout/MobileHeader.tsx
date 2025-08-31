import React from 'react';
import { Menu, MapPin, Plus, Upload, Trash2 } from 'lucide-react';
import { Button } from '../ui';

interface MobileHeaderProps {
  onMenuToggle: () => void;
  onAddActivity: () => void;
  onImportJson: () => void;
  onDeleteDuplicates: () => void;
  isMenuOpen: boolean;
  totalActivities: number;
}

export function MobileHeader({ 
  onMenuToggle, 
  onAddActivity, 
  onImportJson,
  onDeleteDuplicates,
  isMenuOpen,
  totalActivities 
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-fixed bg-white border-b border-gray-200 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu and branding */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="p-2 rounded-full lg:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu size={24} />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary">Itinerary Killer</h1>
              <p className="text-xs text-secondary">Orlando Adventures</p>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Activity count badge */}
          {totalActivities > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <span className="text-sm text-secondary">{totalActivities} activities</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onImportJson}
            className="p-2 rounded-full"
            aria-label="Import JSON"
          >
            <Upload size={20} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteDuplicates}
            className="p-2 rounded-full"
            aria-label="Delete duplicates"
          >
            <Trash2 size={20} />
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={onAddActivity}
            className="rounded-full px-4"
            icon={Plus}
          >
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
