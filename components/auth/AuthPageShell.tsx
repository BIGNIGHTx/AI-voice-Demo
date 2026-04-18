import type { ReactNode } from 'react';

import { Database, History, ShieldCheck } from 'lucide-react';

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const highlights = [
  {
    icon: ShieldCheck,
    title: 'เข้าสู่ระบบแบบมี Session จริง',
    description: 'ใช้ cookie session ฝั่ง server เพื่อกันการเข้าถึงหน้าภายในระบบ'
  },
  {
    icon: Database,
    title: 'บันทึกลงฐานข้อมูลจริง',
    description: 'ผู้ใช้และประวัติการใช้งานถูกเก็บใน SQLite ผ่าน Prisma'
  },
  {
    icon: History,
    title: 'ตรวจสอบย้อนหลังได้',
    description: 'ระบบบันทึกการสมัคร, login, logout และการเปิดหน้าภายในระบบ'
  },
];

export default function AuthPageShell({ title, subtitle, children }: AuthPageShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        <section className="hidden w-[44%] flex-col justify-between bg-[linear-gradient(160deg,#0f172a_0%,#1e293b_52%,#0f766e_100%)] px-8 py-10 text-white lg:flex">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-sky-100 uppercase">
              Secure Access
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold leading-tight">AI Voice File Manager</h1>
              <p className="max-w-md text-sm leading-7 text-slate-200">
                เพิ่มระบบยืนยันตัวตนและ audit log สำหรับงานส่งอาจารย์ โดยยังต่อกับ backend เดิมของคุณได้เหมือนเดิม
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {highlights.map(({ icon: Icon, title: itemTitle, description }) => (
              <div key={itemTitle} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                    <Icon className="h-5 w-5 text-sky-200" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{itemTitle}</p>
                    <p className="text-xs leading-6 text-slate-300">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.98)_100%)] px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(148,163,184,0.18)] sm:p-8">
            <div className="mb-8 space-y-3">
              <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                Auth + Audit Ready
              </span>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
                <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>
            </div>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
