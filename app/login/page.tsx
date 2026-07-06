import Link from 'next/link';
import { GoogleSignInButton } from '@/components/auth/auth';
import { buildMetadata } from '@/lib/seo/metadata';
import { SUPABASE_AUTH_CHECKLIST } from '@/lib/auth/oauth';

export const metadata = buildMetadata({
  title: 'Đăng nhập',
  description: 'Đăng nhập bằng Google qua Supabase Auth.',
  path: '/login',
});

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') ? params.next : '/';
  const hasError = params.error === 'auth';
  const reason = params.reason;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="ui-card p-8">
        <h1 className="text-center text-2xl font-bold text-foreground">Đăng nhập</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Dùng tài khoản Google để lưu lịch sử và truy cập tính năng premium sau này.
        </p>

        {hasError && (
          <div className="mt-4 space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p>Đăng nhập không thành công. Kiểm tra cấu hình Google OAuth trên Supabase.</p>
            {reason && (
              <p className="text-xs opacity-90">
                Chi tiết: <code className="break-all">{reason}</code>
              </p>
            )}
            {reason?.toLowerCase().includes('invalid api key') && (
              <p className="text-xs text-destructive/90">
                → Trên <strong>Vercel</strong>, mở Settings → Environment Variables (Production).
                Copy lại <code>NEXT_PUBLIC_SUPABASE_URL</code> và{' '}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> từ Supabase → Settings → API (key{' '}
                <em>anon public</em>, không phải service_role). Redeploy sau khi lưu.
                Kiểm tra: <code>/api/health/supabase</code>
              </p>
            )}
            <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
              {SUPABASE_AUTH_CHECKLIST.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <GoogleSignInButton next={next} className="mt-6" />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Bằng việc đăng nhập, bạn đồng ý với{' '}
          <Link href="/" className="text-primary hover:underline">
            điều khoản
          </Link>{' '}
          của nền tảng.
        </p>
      </div>
    </div>
  );
}
