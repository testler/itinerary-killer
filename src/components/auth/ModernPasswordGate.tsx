import React, { useState } from 'react';
import { Lock, Eye, EyeOff, MapPin } from 'lucide-react';
import { Button, Input, Card } from '../ui';

interface ModernPasswordGateProps {
  expectedPassword: string;
  onAuthenticated: () => void;
}

export function ModernPasswordGate({ expectedPassword, onAuthenticated }: ModernPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate validation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === expectedPassword) {
      onAuthenticated();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Itinerary Killer</h1>
          <p className="text-secondary">Enter password to access your Orlando adventure planner</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                <Lock size={20} className="text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold text-primary">Protected Site</h2>
              <p className="text-sm text-secondary mt-1">This site is password protected</p>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                error={error}
                className="pr-12"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={!password.trim()}
            >
              {isLoading ? 'Verifying...' : 'Unlock'}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-secondary">
            🔒 Your data is secure and private
          </p>
        </div>
      </div>
    </div>
  );
}
