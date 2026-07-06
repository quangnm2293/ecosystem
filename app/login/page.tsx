import Link from 'next/link';
import { GoogleSignInButton } from '@/components/auth/auth';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Đăng nhập',
  description: 'Đăng nhập bằng Google qua Supabase Auth.',
  path: '/login',
});

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') ? params.next : '/';
  const hasError = params.error === 'auth';

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="ui-card p-8">
        <h1 className="text-center text-2xl font-bold text-foreground">Đăng nhập</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Dùng tài khoản Google để lưu lịch sử và truy cập tính năng premium sau này.
        </p>

        {hasError && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Đăng nhập không thành công. Thử lại hoặc kiểm tra cấu hình Google OAuth trên Supabase.
          </p>
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
