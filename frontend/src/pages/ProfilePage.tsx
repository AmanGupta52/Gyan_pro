import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  User as UserIcon,
  School,
  MapPin,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/config/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      institution: user?.institution || '',
      city: user?.city || '',
      state: user?.state || '',
      country: user?.country || 'India',
    },
  });

  const onUpdateProfile = async (data: any) => {
    try {
      await api.patch('/users/me', data);
      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB.');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshUser();
      toast.success('Avatar updated!');
    } catch (err: unknown) {
      toast.error('Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
          Scholar Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, academic affiliation, and verified credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left card: Avatar & Role Summary */}
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col items-center text-center">
          <div className="relative group">
            <Avatar name={user?.name || ''} src={user?.photo} size="xl" className="w-24 h-24 text-2xl" />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Change photo"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {user?.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge variant="info">{user?.educationLevel}</Badge>
            <Badge variant="default" className="capitalize">{user?.role}</Badge>
            {user?.isEmailVerified && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>

          {/* DPDP Under-18 Consent badge if applicable */}
          {user?.isMinor && (
            <div className="mt-6 w-full p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-left">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>DPDP Act Verified Minor</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90">
                Guardian: <strong>{user?.guardianName || 'Parent Verified'}</strong>
              </p>
              {user?.guardianConsentAt && (
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500 mt-1">
                  Consent recorded on {new Date(user.guardianConsentAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Right card: Profile Edit Form */}
        <Card className="md:col-span-2 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Personal Information
            </h3>

            <Input
              label="Full Name"
              leftIcon={<UserIcon className="w-4 h-4" />}
              {...register('name', { required: true, minLength: 2 })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Registered Email (Primary)"
                value={user?.email || ''}
                disabled
                helperText="Email is bound to account credentials"
              />
              <Input
                label="Phone Number"
                value={user?.phone || ''}
                disabled
                helperText="Verified mobile identifier"
              />
            </div>

            <Input
              label="School / College / Institution"
              placeholder="e.g. Kendriya Vidyalaya / IIT Delhi"
              leftIcon={<School className="w-4 h-4" />}
              {...register('institution')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                leftIcon={<MapPin className="w-4 h-4" />}
                {...register('city')}
              />
              <Input label="State" {...register('state')} />
              <Input label="Country" {...register('country')} />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
