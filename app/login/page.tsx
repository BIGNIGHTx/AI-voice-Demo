import AuthPageShell from '@/components/auth/AuthPageShell';
import LoginForm from '@/components/auth/LoginForm';

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthPageShell
      title="เข้าสู่ระบบ"
      subtitle="ใช้บัญชีของคุณเพื่อเข้าใช้งานระบบจัดการไฟล์ และเริ่มบันทึกประวัติการใช้งานแบบตรวจสอบย้อนหลังได้"
    >
      <LoginForm initialNextPath={nextPath} />
    </AuthPageShell>
  );
}
