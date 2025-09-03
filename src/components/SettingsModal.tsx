import React, { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import { Settings, MapPin, Activity, Palette, Bell, Lock } from 'lucide-react';

interface UserSettings {
  defaultMapView: 'satellite' | 'streets';
  defaultSortMode: 'proximity' | 'priority';
  showNotifications: boolean;
  hideDoneByDefault: boolean;
  defaultActivityDuration: number;
  autoLocationRefresh: boolean;
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultMapView: 'streets',
  defaultSortMode: 'proximity',
  showNotifications: true,
  hideDoneByDefault: true,
  defaultActivityDuration: 60,
  autoLocationRefresh: false,
  theme: 'system',
  units: 'imperial'
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      try {
        const savedSettings = localStorage.getItem('user-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, [isOpen]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('user-settings', JSON.stringify(settings));
      setHasChanges(false);
      
      // You could dispatch events here to notify other components of setting changes
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="space-y-6">
        {/* Map Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Map & Location</h3>
          </div>
          
          <div className="grid gap-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Map Style
              </label>
              <select
                value={settings.defaultMapView}
                onChange={(e) => updateSetting('defaultMapView', e.target.value as 'satellite' | 'streets')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="streets">Streets</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Units
              </label>
              <select
                value={settings.units}
                onChange={(e) => updateSetting('units', e.target.value as 'metric' | 'imperial')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="imperial">Miles (Imperial)</option>
                <option value="metric">Kilometers (Metric)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-refresh locations</label>
                <p className="text-xs text-gray-500">Automatically update activity locations periodically</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoLocationRefresh}
                  onChange={(e) => updateSetting('autoLocationRefresh', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Activity Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Activities</h3>
          </div>
          
          <div className="grid gap-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Sort Mode
              </label>
              <select
                value={settings.defaultSortMode}
                onChange={(e) => updateSetting('defaultSortMode', e.target.value as 'proximity' | 'priority')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="proximity">By Proximity</option>
                <option value="priority">By Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Activity Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={settings.defaultActivityDuration}
                onChange={(e) => updateSetting('defaultActivityDuration', parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Hide completed by default</label>
                <p className="text-xs text-gray-500">Start with completed activities hidden</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hideDoneByDefault}
                  onChange={(e) => updateSetting('hideDoneByDefault', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Appearance</h3>
          </div>
          
          <div className="grid gap-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Dark theme coming soon</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>
          
          <div className="grid gap-4 pl-7">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Show notifications</label>
                <p className="text-xs text-gray-500">Get notified about important updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => updateSetting('showNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Data & Privacy</h3>
          </div>
          
          <div className="grid gap-4 pl-7">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                Your data is stored locally in your browser and in Supabase. We don't share your personal information with third parties.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all settings? This action cannot be undone.')) {
                    localStorage.removeItem('user-settings');
                    localStorage.removeItem('hide-done-activities');
                    localStorage.removeItem('site-authed');
                    handleReset();
                  }
                }}
                className="text-red-600 hover:text-red-700"
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Hook to use settings throughout the app
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Load settings on mount
    try {
      const savedSettings = localStorage.getItem('user-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    // Listen for settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      setSettings(event.detail);
    };

    window.addEventListener('settingsChanged', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange as EventListener);
    };
  }, []);

  return settings;
}
