'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CloudUpload, FileText, Folder, BarChart3, Search, Activity } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-slate-50 border-r border-slate-200 flex flex-col justify-between">
      <div>
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white">
            <Folder size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800">File Manager</span>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          <Link href="/dashboard" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/upload" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname === '/upload' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <CloudUpload size={20} />
            <span>Upload File</span>
          </Link>
          <Link href="/files" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname.includes('/files') && !pathname.includes('/analytics') && !pathname.includes('/search') ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <FileText size={20} />
            <span>Files</span>
          </Link>
          <Link href="/analytics" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname === '/analytics' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </Link>
          <Link href="/search" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname === '/search' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Search size={20} />
            <span>Search</span>
          </Link>
          <Link href="/health" className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${pathname === '/health' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Activity size={20} />
            <span>Health Check</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
