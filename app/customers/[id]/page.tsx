'use client';

import Sidebar from '@/components/Sidebar';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  FileAudio,
  ChevronLeft,
  ArrowRight,
  Package,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CustomerDetail {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  address: string;
  district: string;
  province: string;
  postcode: string;
}

interface WarrantyItem {
  file_id: string; // อ้างอิงถึงไฟล์เสียงการสนทนา
  registration_no: string;
  brand: string;
  model: string;
  serial_no: string;
  warranty_period: string;
  purchase_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
}

// Mock Data
const MOCK_CUSTOMER: CustomerDetail = {
  customer_id: 'C001',
  first_name: 'สมชาย',
  last_name: 'ใจดี',
  phone: '081-234-5678',
  email: 'somchai@email.com',
  gender: 'ชาย (MALE)',
  date_of_birth: '1990-05-15',
  address: '123/45 ซอยสุขใจ ถนนลาดพร้าว',
  district: 'จตุจักร',
  province: 'กรุงเทพมหานคร',
  postcode: '10900'
};

const MOCK_WARRANTIES: WarrantyItem[] = [
  {
    file_id: 'f-1001',
    registration_no: 'W4Z0NQ43GXH',
    brand: 'Dunlopillo',
    model: 'Fresco 5ft',
    serial_no: 'B7IUWSAMRNCA',
    warranty_period: '120 Months',
    purchase_date: '2026-03-15',
    status: 'ACTIVE'
  },
  {
    file_id: 'f-1002',
    registration_no: 'W9M2KX88PLZ',
    brand: 'Slumberland',
    model: 'Elegance 6ft',
    serial_no: 'SLUM998877XX',
    warranty_period: '120 Months',
    purchase_date: '2025-11-10',
    status: 'ACTIVE'
  }
];

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // จำลองการเรียก API เดี่ยวของลูกค้า
    setTimeout(() => {
      setCustomer({ ...MOCK_CUSTOMER, customer_id: customerId });
      setWarranties(MOCK_WARRANTIES);
      setLoading(false);
    }, 600);
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">กำลังโหลดข้อมูลลูกค้า...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
          <button 
            onClick={() => router.push('/customers')}
            className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" />
            กลับไปหน้ารายชื่อลูกค้า
          </button>
        </div>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-blue-200">
                {customer.first_name[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {customer.first_name} {customer.last_name}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-slate-500">
                  <span className="flex items-center text-sm bg-slate-100 px-3 py-1 rounded-full">
                    <User size={14} className="mr-1.5" /> ID: {customer.customer_id}
                  </span>
                  <span className="flex items-center text-sm">
                    <Phone size={14} className="mr-1.5" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center text-sm">
                      <Mail size={14} className="mr-1.5" /> {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              แก้ไขข้อมูล
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Customer Profile Details */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-blue-600" /> ข้อมูลพื้นฐาน
                  </h2>
                </div>
                <div className="p-6 space-y-4 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">เพศ</span>
                    <span className="col-span-2 font-medium text-slate-800">{customer.gender}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">วันเกิด</span>
                    <span className="col-span-2 font-medium text-slate-800">{new Date(customer.date_of_birth).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" /> ที่อยู่สำหรับติดต่อ / จัดส่ง
                  </h2>
                </div>
                <div className="p-6 text-sm text-slate-700 leading-relaxed bg-slate-50/30">
                  {customer.address} <br/>
                  เขต/อำเภอ: {customer.district} <br/>
                  จังหวัด: {customer.province} {customer.postcode}
                </div>
              </div>
            </div>

            {/* Right Column: Warranty / Products List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={22} className="text-emerald-500" /> 
                    รายการสินค้าที่ลูกค้ามีประกัน
                  </h2>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                    {warranties.length} รายการ
                  </span>
                </div>
                
                <div className="p-6 space-y-4">
                  {warranties.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">ไม่พบข้อมูลการประกันสินค้า</p>
                    </div>
                  ) : (
                    warranties.map((warranty) => (
                      <Link 
                        href={`/customers/${customerId}/warranty/${warranty.file_id}`}
                        key={warranty.registration_no}
                        className="block bg-white border-2 border-slate-100 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
                                {warranty.registration_no}
                              </h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Calendar size={12} /> ลงทะเบียนเมื่อ {new Date(warranty.purchase_date).toLocaleDateString('th-TH')}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                            warranty.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {warranty.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-50">
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Brand</p>
                            <p className="text-sm font-semibold text-slate-800">{warranty.brand}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Model</p>
                            <p className="text-sm font-medium text-slate-700">{warranty.model}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Serial No.</p>
                            <p className="text-sm font-medium text-slate-700">{warranty.serial_no}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Period</p>
                            <p className="text-sm font-medium text-slate-700">{warranty.warranty_period}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center text-sm font-bold text-blue-600 group-hover:text-blue-700">
                          ดูข้อมูลการประกันฉบับเต็ม <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
