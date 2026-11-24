import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Calendar,
  MapPin,
  School,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  type RegisterFormValues,
} from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Stepper, type StepItem } from '@/components/ui/Stepper';
import { PasswordStrength } from '@/components/ui/PasswordStrength';

const STEPS: StepItem[] = [
  { id: 1, title: 'Account' },
  { id: 2, title: 'Personal' },
  { id: 3, title: 'Education' },
];

const EDUCATION_LEVELS = [
  'Junior KG',
  'Senior KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'Undergraduate',
  'Postgraduate',
  'PhD',
];

export function RegisterForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(
      currentStep === 1
        ? registerStep1Schema
        : currentStep === 2
        ? registerStep2Schema
        : registerStep3Schema
    ),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      dateOfBirth: '',
      city: '',
      state: '',
      country: 'India',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianConsent: false,
      educationLevel: '',
      institution: '',
    },
  });

  const passwordValue = watch('password');
  const dobValue = watch('dateOfBirth');

  // Calculate if the user is a minor (<18 years)
  const isMinor = useMemo(() => {
    if (!dobValue) return false;
    const dob = new Date(dobValue);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age < 18;
  }, [dobValue]);

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(['name', 'email', 'phone', 'password', 'confirmPassword']);
    } else if (currentStep === 2) {
      const step2Fields = ['dateOfBirth', 'city', 'state', 'country'] as (keyof RegisterFormValues)[];
      if (isMinor) {
        step2Fields.push('guardianName', 'guardianPhone', 'guardianEmail', 'guardianConsent');
      }
      isValid = await trigger(step2Fields);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onFinalSubmit = async (formData: RegisterFormValues) => {
    try {
      await registerUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        dateOfBirth: formData.dateOfBirth,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        guardianName: isMinor ? formData.guardianName : undefined,
        guardianPhone: isMinor ? formData.guardianPhone : undefined,
        guardianEmail: isMinor ? formData.guardianEmail : undefined,
        guardianConsent: isMinor ? formData.guardianConsent : undefined,
        educationLevel: formData.educationLevel,
        institution: formData.institution,
      });

      toast.success('Registration successful! Welcome to GYAN-26.');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3-Step Stepper */}
      <div className="pb-4">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-4 pt-2">
        {/* ── STEP 1: ACCOUNT ──────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Input
              label="Full Name"
              placeholder="e.g. Aarav Sharma"
              leftIcon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. aarav@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              placeholder="e.g. 9876543210"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              helperText="10-digit Indian mobile number"
              {...register('phone')}
            />

            <div>
              <Input
                label="Password"
                placeholder="Min. 8 characters"
                isPassword
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordStrength password={passwordValue || ''} />
            </div>

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              isPassword
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="mt-4"
            >
              Continue to Personal Details
            </Button>
          </div>
        )}

        {/* ── STEP 2: PERSONAL ─────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Input
              label="Date of Birth"
              type="date"
              leftIcon={<Calendar className="w-4 h-4" />}
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="e.g. Mumbai"
                leftIcon={<MapPin className="w-4 h-4" />}
                error={errors.city?.message}
                {...register('city')}
              />

              <Input
                label="State"
                placeholder="e.g. Maharashtra"
                error={errors.state?.message}
                {...register('state')}
              />
            </div>

            <Input
              label="Country"
              defaultValue="India"
              error={errors.country?.message}
              {...register('country')}
            />

            {/* Under-18 DPDP Parental Consent Section */}
            {isMinor && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>DPDP Act Minor Protection & Consent</span>
                </div>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                  Participants under 18 years of age require verifiable parental or guardian consent. Minor phone and email are never shown publicly.
                </p>

                <Input
                  label="Parent / Guardian Name"
                  placeholder="e.g. Rajesh Sharma"
                  error={errors.guardianName?.message}
                  {...register('guardianName')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Guardian Phone"
                    placeholder="e.g. 9811122233"
                    error={errors.guardianPhone?.message}
                    {...register('guardianPhone')}
                  />
                  <Input
                    label="Guardian Email"
                    type="email"
                    placeholder="e.g. guardian@example.com"
                    error={errors.guardianEmail?.message}
                    {...register('guardianEmail')}
                  />
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="guardianConsent"
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-brand-blue focus:ring-brand-blue"
                    {...register('guardianConsent')}
                  />
                  <label
                    htmlFor="guardianConsent"
                    className="text-xs text-amber-900 dark:text-amber-200 cursor-pointer"
                  >
                    I hereby declare that I am the parent/legal guardian and consent to the student participating in GYAN-26 under the Digital Personal Data Protection Act.
                  </label>
                </div>
                {errors.guardianConsent && (
                  <p className="text-xs text-rose-500 font-medium">
                    {errors.guardianConsent.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleNextStep}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: EDUCATION ────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Select
              label="Education Level"
              error={errors.educationLevel?.message}
              {...register('educationLevel')}
            >
              <option value="">Select your class / level</option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>

            <Input
              label="School / College / Institution"
              placeholder="e.g. Delhi Public School / IIT Bombay"
              leftIcon={<School className="w-4 h-4" />}
              error={errors.institution?.message}
              {...register('institution')}
            />

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                className="flex-1"
              >
                Complete Registration
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
