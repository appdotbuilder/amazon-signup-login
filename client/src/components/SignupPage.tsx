import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { GoogleButton } from './GoogleButton';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { RegisterUserInput, GoogleSignInInput, AuthResponse } from '../../../server/src/schema';

export function SignupPage() {
  const [formData, setFormData] = useState<RegisterUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    phone_number: '',
    marketing_emails: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Check email availability with debouncing
  const checkEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setEmailChecking(true);
    try {
      const result = await trpc.checkEmailAvailability.query({ email });
      setEmailAvailable(result.available);
      setEmailSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Email check failed:', error);
    } finally {
      setEmailChecking(false);
    }
  }, []);

  // Debounced email checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmail(formData.email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, checkEmail]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleInputChange = (field: keyof RegisterUserInput, value: string | boolean) => {
    setFormData((prev: RegisterUserInput) => ({ ...prev, [field]: value }));
    setError(''); // Clear errors when user starts typing
  };

  const handleEmailSuggestionClick = (suggestion: string) => {
    setFormData((prev: RegisterUserInput) => ({ ...prev, email: suggestion }));
    setEmailAvailable(null);
    setEmailSuggestions([]);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response: AuthResponse = await trpc.registerUser.mutate(formData);
      setSuccess(true);
      console.log('Registration successful:', response);
      
      // In a real app, you would:
      // - Store the JWT token
      // - Redirect to email verification page or dashboard
      // - Handle the authentication state
      
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (googleData: GoogleSignInInput) => {
    setError('');
    setIsLoading(true);

    try {
      const response: AuthResponse = await trpc.googleSignIn.mutate(googleData);
      setSuccess(true);
      console.log('Google sign-in successful:', response);
      
      // In a real app, you would:
      // - Store the JWT token
      // - Redirect to dashboard
      // - Handle the authentication state
      
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white p-8 border border-gray-200 rounded-lg text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Amazon!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. Please check your email to verify your account.
            </p>
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black">
              Continue to Amazon
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Amazon-style header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">amazon</h1>
            </div>
            <div className="text-sm text-gray-600">
              Already have an account? <span className="text-blue-600 cursor-pointer hover:underline">Sign in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div className="bg-white p-8 border border-gray-200 rounded-lg">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
            </div>

            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  Your name
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('first_name', e.target.value)
                    }
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('last_name', e.target.value)
                    }
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('email', e.target.value)
                    }
                    className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500 ${
                      emailAvailable === false ? 'border-red-300' : ''
                    } ${emailAvailable === true ? 'border-green-300' : ''}`}
                    required
                  />
                  {emailChecking && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {emailAvailable === false && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600">This email is already registered.</p>
                    {emailSuggestions.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-600">Try these instead:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {emailSuggestions.map((suggestion: string) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleEmailSuggestionClick(suggestion)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-blue-600"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {emailAvailable === true && (
                  <p className="text-sm text-green-600 mt-1">✓ Email available</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('password', e.target.value)
                  }
                  className="mt-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
                <PasswordStrengthIndicator strength={passwordStrength} password={formData.password} />
              </div>

              <div>
                <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700">
                  Mobile number (optional)
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="Mobile number for account security"
                  value={formData.phone_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('phone_number', e.target.value || '')
                  }
                  className="mt-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="marketing_emails"
                  checked={formData.marketing_emails || false}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange('marketing_emails', checked)
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="marketing_emails" className="text-sm text-gray-600 leading-5">
                  I would like to receive promotional emails with savings and product recommendations.
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || emailAvailable === false}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded border border-yellow-600 focus:ring-2 focus:ring-yellow-300"
              >
                {isLoading ? 'Creating your account...' : 'Create your Amazon account'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="mt-4">
                <GoogleButton 
                  onSuccess={handleGoogleSignIn} 
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-600 text-center space-y-2">
              <p>
                By creating an account, you agree to Amazon's{' '}
                <span className="text-blue-600 cursor-pointer hover:underline">
                  Conditions of Use
                </span>{' '}
                and{' '}
                <span className="text-blue-600 cursor-pointer hover:underline">
                  Privacy Notice
                </span>
                .
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <Separator className="my-4" />
            Already have an account?{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Sign in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}