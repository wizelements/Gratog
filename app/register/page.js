'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Leaf, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  validateConfirmPassword,
  getPasswordStrength
} from '@/lib/auth/validation';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldValidation, setFieldValidation] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    router.push('/profile');
    return null;
  }

  // Real-time validation
  useEffect(() => {
    const validateAllFields = () => {
      const newValidation = {};

      // Validate name if it has been touched
      if (formData.name) {
        const nameResult = validateName(formData.name);
        newValidation.name = nameResult;
      }

      // Validate email if it has been touched
      if (formData.email) {
        const emailResult = validateEmail(formData.email);
        newValidation.email = emailResult;
      }

      // Validate password if it has been touched
      if (formData.password) {
        const passwordResult = validatePassword(formData.password);
        newValidation.password = passwordResult;
        setPasswordStrength(getPasswordStrength(formData.password));
      } else {
        setPasswordStrength(0);
      }

      // Validate confirm password if both password fields are filled
      if (formData.password && formData.confirmPassword) {
        const confirmResult = validateConfirmPassword(formData.password, formData.confirmPassword);
        newValidation.confirmPassword = confirmResult;
      }

      // Validate phone if it has been touched
      if (formData.phone) {
        const phoneResult = validatePhone(formData.phone);
        newValidation.phone = phoneResult;
      }

      setFieldValidation(newValidation);
    };

    const timer = setTimeout(() => {
      validateAllFields();
    }, 300);

    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (fieldErrors[name]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[name];
      setFieldErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {};
    
    const nameValidation = validateName(formData.name);
    if (!nameValidation.valid) errors.name = nameValidation.error;

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) errors.email = emailValidation.error;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) errors.password = passwordValidation.error;

    const confirmValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (!confirmValidation.valid) errors.confirmPassword = confirmValidation.error;

    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) errors.phone = phoneValidation.error;
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.phone
    );

    setLoading(false);

    if (result.success) {
      router.push('/profile');
    } else if (result.error) {
      // Handle specific errors
      if (result.error.includes('Email')) {
        setFieldErrors(prev => ({
          ...prev,
          email: result.error
        }));
      } else {
        setFieldErrors(prev => ({
          ...prev,
          submit: result.error
        }));
      }
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  const isFormValid = 
    formData.name && 
    formData.email && 
    formData.password && 
    formData.confirmPassword && 
    agreedToTerms &&
    fieldValidation.name?.valid &&
    fieldValidation.email?.valid &&
    fieldValidation.password?.valid &&
    fieldValidation.confirmPassword?.valid &&
    (!formData.phone || fieldValidation.phone?.valid);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition">
            <Leaf className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-900">Taste of Gratitude</span>
          </Link>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Start Your Wellness Journey</h1>
          <p className="text-emerald-700">Create an account to unlock exclusive rewards and personalized recommendations</p>
        </div>

        {/* Register Form */}
        <Card className="border-emerald-200 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-emerald-900">Create Account</CardTitle>
            <CardDescription>Join the Taste of Gratitude family</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fieldErrors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {fieldErrors.submit}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                  {fieldValidation.name?.valid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`border-emerald-200 focus:border-emerald-500 ${
                    fieldErrors.name ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  {fieldValidation.email?.valid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`border-emerald-200 focus:border-emerald-500 ${
                    fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">Phone (Optional)</Label>
                  {fieldValidation.phone?.valid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`border-emerald-200 focus:border-emerald-500 ${
                    fieldErrors.phone ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  {fieldValidation.password?.valid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className={`border-emerald-200 focus:border-emerald-500 pr-10 ${
                      fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-semibold ${
                        passwordStrength < 25 ? 'text-red-600' :
                        passwordStrength < 50 ? 'text-orange-600' :
                        passwordStrength < 75 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="text-red-600 text-xs flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
                  {fieldValidation.confirmPassword?.valid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`border-emerald-200 focus:border-emerald-500 pr-10 ${
                      fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-600 mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {fieldErrors.terms && (
                <p className="text-red-600 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.terms}
                </p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center text-sm border-t border-gray-200 pt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
