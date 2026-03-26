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
  customer_phone?: string;
  agent_id?: string;
  warranty_period: string;
  purchase_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  sale_channel?: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomerDetails() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/customers/${customerId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch customer: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setCustomer(data.customer);
        setWarranties(data.warranties || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching customer:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        // ไม่ใช้ mock data - แสดง error แทน
        setCustomer(null);
        setWarranties([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerDetails();
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

  if (error || !customer) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลลูกค้า</h2>
            <p className="text-slate-500 mb-4">{error || 'Customer not found'}</p>
            <button
              onClick={() => router.push('/customers')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              กลับไปหน้ารายชื่อลูกค้า
            </button>
          </div>
        </main>
      </div>
    );
  }

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
          <div className="flex items-start justify-between overflow-hidden">
            <div className="flex items-start gap-6 min-w-0 flex-1">
              <div className="shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-blue-200">
                {customer.first_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-slate-800 break-all lg:break-words">
                  {customer.first_name} {customer.last_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-slate-500">
                  <span className="flex items-start text-sm bg-slate-100 px-3 py-1.5 rounded-xl break-all">
                    <User size={14} className="mr-1.5 shrink-0 mt-1" /> <span>ID: {customer.customer_id}</span>
                  </span>
                  <span className="flex items-start text-sm bg-slate-100 px-3 py-1.5 rounded-xl break-all">
                    <Phone size={14} className="mr-1.5 shrink-0 mt-1" /> <span>{customer.phone}</span>
                  </span>
                  {customer.email && (
                    <span className="flex items-start text-sm bg-slate-100 px-3 py-1.5 rounded-xl break-all">
                      <Mail size={14} className="mr-1.5 shrink-0 mt-1" /> <span>{customer.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="shrink-0 ml-4 px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
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
                    <span className="col-span-2 font-medium text-slate-800">{new Date(customer.date_of_birth).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                  {customer.address} <br />
                  เขต/อำเภอ: {customer.district} <br />
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
                      <p className="text-slate-400 text-sm mt-2">ลูกค้ารายนี้ยังไม่มีการลงทะเบียนประกันสินค้า</p>
                      <p className="text-slate-400 text-xs mt-1">หรือข้อมูลไม่มี Brand/Product ที่ชัดเจน</p>
                    </div>
                  ) : (
                    warranties.map((warranty, index) => (
                      <Link
                        href={`/customers/${customerId}/warranty/${warranty.file_id}`}
                        key={`${warranty.file_id}-${warranty.registration_no}-${warranty.serial_no || 'na'}-${index}`}
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
                          <div className="flex flex-col gap-1 items-end">
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${warranty.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {warranty.status}
                            </span>
                            {/* Type badge (Inbound/Outbound) */}
                            {warranty.sale_channel && (
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                                warranty.sale_channel.toLowerCase().includes('inbound') 
                                  ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                  : warranty.sale_channel.toLowerCase().includes('outbound')
                                    ? 'bg-orange-50 text-orange-600 border-orange-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                                {warranty.sale_channel === 'Unknown' ? '-' : warranty.sale_channel}
                              </span>
                            )}
                          </div>
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
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Agent ID</p>
                            <p className="text-sm font-medium text-slate-700">{warranty.agent_id || '-'}</p>
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
