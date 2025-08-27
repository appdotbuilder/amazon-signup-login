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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-white p-10 border border-gray-100 rounded-2xl shadow-2xl text-center backdrop-blur-sm">
            <div className="text-emerald-500 text-7xl mb-6 animate-pulse">✓</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Welcome to Amazon! 🎉
            </h2>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Your account has been created successfully. Please check your email to verify your account and start shopping.
            </p>
            <Button className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-semibold py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Continue to Amazon
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Enhanced Amazon-style header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                amazon
              </div>
              <div className="text-sm text-gray-500 hidden sm:block">📦</div>
            </div>
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <span>Already have an account?</span>
              <button className="text-orange-600 font-medium hover:text-orange-700 hover:underline transition-colors duration-200">
                Sign in →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced main content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white/95 backdrop-blur-sm p-10 border border-gray-200/50 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Create account
              </h2>
              <p className="text-gray-600 text-sm">Join millions of happy customers worldwide</p>
            </div>

            {error && (
              <Alert className="mb-6 border-red-200/50 bg-red-50/50 backdrop-blur-sm rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="text-red-500 text-lg">⚠️</div>
                  <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div>
                <Label htmlFor="first_name" className="text-sm font-semibold text-gray-800 mb-2 block">
                  Your name ✨
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="First name"
                      value={formData.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange('first_name', e.target.value)
                      }
                      className="border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Last name"
                      value={formData.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange('last_name', e.target.value)
                      }
                      className="border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-gray-800 mb-2 block">
                  Email address 📧
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('email', e.target.value)
                    }
                    className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all duration-200 ${
                      emailAvailable === false ? 'border-red-300 bg-red-50/50' : ''
                    } ${emailAvailable === true ? 'border-green-300 bg-green-50/50' : ''}`}
                    required
                  />
                  {emailChecking && (
                    <div className="absolute right-4 top-3.5">
                      <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {emailAvailable === false && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700 font-medium flex items-center space-x-2">
                      <span>❌</span>
                      <span>This email is already registered.</span>
                    </p>
                    {emailSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-2">💡 Try these instead:</p>
                        <div className="flex flex-wrap gap-2">
                          {emailSuggestions.map((suggestion: string) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleEmailSuggestionClick(suggestion)}
                              className="text-xs px-3 py-1 bg-white hover:bg-orange-50 rounded-full text-orange-600 border border-orange-200 hover:border-orange-300 transition-all duration-200 font-medium"
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
                  <p className="text-sm text-green-700 mt-2 flex items-center space-x-1">
                    <span>✅</span>
                    <span className="font-medium">Email available</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-800 mb-2 block">
                  Password 🔐
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('password', e.target.value)
                  }
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all duration-200"
                  required
                />
                <PasswordStrengthIndicator strength={passwordStrength} password={formData.password} />
              </div>

              <div>
                <Label htmlFor="phone_number" className="text-sm font-semibold text-gray-800 mb-2 block">
                  Mobile number (optional) 📱
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="Mobile number for account security"
                  value={formData.phone_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('phone_number', e.target.value || '')
                  }
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all duration-200"
                />
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <Checkbox
                  id="marketing_emails"
                  checked={formData.marketing_emails || false}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange('marketing_emails', checked)
                  }
                  className="mt-0.5 border-blue-300 data-[state=checked]:bg-blue-500"
                />
                <Label htmlFor="marketing_emails" className="text-sm text-gray-700 leading-relaxed font-medium">
                  💌 I would like to receive promotional emails with exclusive savings and personalized product recommendations.
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || emailAvailable === false}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold py-4 px-6 rounded-xl border-0 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    <span>Creating your account...</span>
                  </div>
                ) : (
                  <span>🚀 Create your Amazon account</span>
                )}
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <GoogleButton 
                  onSuccess={handleGoogleSignIn} 
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="mt-8 text-xs text-gray-600 text-center space-y-3">
              <p className="leading-relaxed">
                By creating an account, you agree to Amazon's{' '}
                <button className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors duration-200">
                  Conditions of Use
                </button>{' '}
                and{' '}
                <button className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors duration-200">
                  Privacy Notice
                </button>
                .
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50">
            <div className="flex items-center justify-center space-x-2">
              <span>Already have an account?</span>
              <button className="text-orange-600 font-semibold hover:text-orange-700 hover:underline transition-colors duration-200">
                Sign in here →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}