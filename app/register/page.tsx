import AuthPageShell from '@/components/auth/AuthPageShell';
import RegisterForm from '@/components/auth/RegisterForm';

interface RegisterPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthPageShell
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีใหม่สำหรับผู้ใช้งานในระบบ โดยข้อมูลจะถูกเก็บลงฐานข้อมูลจริงทันทีและพร้อมสร้าง audit trail"
    >
      <RegisterForm initialNextPath={nextPath} />
    </AuthPageShell>
  );
}
