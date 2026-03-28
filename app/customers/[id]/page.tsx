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
  suggested_brand?: string;
  suggested_agent_id?: string;
  suggested_sale_channel?: string;
  nickname?: string;
}

interface CallHistoryItem {
  id: number;
  type: 'inbound' | 'outbound' | 'Unknown';
  date: string;
  time: string;
  file_id: string;
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

interface WarrantyFormState {
  registration_no: string;
  brand: string;
  model: string;
  serial_no: string;
  warranty_period: string;
  purchase_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  sale_channel: string;
  agent_id: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddWarranty, setShowAddWarranty] = useState(false);
  const [savingWarranty, setSavingWarranty] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState<WarrantyFormState>({
    registration_no: '',
    brand: '',
    model: '',
    serial_no: '',
    warranty_period: '12 Months',
    purchase_date: '',
    status: 'ACTIVE',
    sale_channel: 'Manual',
    agent_id: 'N/A',
  });

  const loadCustomerDetails = async () => {
    if (!customerId) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch customer: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setCustomer(data.customer);
      setWarranties(data.warranties || []);
      setCallHistory(data.call_history || []);
      setWarrantyForm((prev) => ({
        ...prev,
        brand: data?.customer?.suggested_brand || '',
        agent_id: data?.customer?.suggested_agent_id || 'N/A',
        sale_channel: data?.customer?.suggested_sale_channel || 'Unknown',
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching customer:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setCustomer(null);
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarranty = async () => {
    if (!warrantyForm.registration_no.trim() || !warrantyForm.model.trim()) {
      setError('กรุณากรอก Registration No. และ Model');
      return;
    }

    if (!warrantyForm.brand.trim()) {
      setError('ไม่พบ Brand จากผลวิเคราะห์ของลูกค้ารายนี้');
      return;
    }

    setSavingWarranty(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...warrantyForm,
          purchase_date: warrantyForm.purchase_date || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create warranty failed: ${res.status}`);
      }

      setShowAddWarranty(false);
      setWarrantyForm({
        registration_no: '',
        brand: customer?.suggested_brand || '',
        model: '',
        serial_no: '',
        warranty_period: '12 Months',
        purchase_date: '',
        status: 'ACTIVE',
        sale_channel: customer?.suggested_sale_channel || 'Unknown',
        agent_id: customer?.suggested_agent_id || 'N/A',
      });
      await loadCustomerDetails();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setSavingWarranty(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
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
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="px-8 py-6">
          <button
            onClick={() => router.push('/customers')}
            className="flex items-center text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={18} className="mr-1" />
            กลับไปหน้ารายชื่อลูกค้า
          </button>
        </div>

        <div className="px-12 max-w-7xl mx-auto space-y-10 pb-20">

          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-blue-100 ring-4 ring-white">
                {customer.first_name?.[0] || 'C'}
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                  Customer {customer.phone}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="flex items-center text-sm font-semibold text-slate-500 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200/50">
                    <User size={14} className="mr-2 opacity-70" /> ID: {customer.customer_id}
                  </span>
                  <span className="flex items-center text-sm font-semibold text-slate-500 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200/50">
                    <Phone size={14} className="mr-2 opacity-70" /> {customer.phone}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddWarranty(true)}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
            >
              เพิ่มประกัน
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Left Column: Customer Profile Details */}
            <div className="lg:col-span-4 space-y-8">
              {/* ข้อมูลพื้นฐาน */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <User size={20} />
                    </div>
                    ข้อมูลพื้นฐาน
                  </h2>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">ชื่อเล่น</span>
                    <span className="font-bold text-slate-800">{customer.nickname || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">เพศ</span>
                    <span className="font-bold text-slate-800">{customer.gender || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">วันเกิด</span>
                    <span className="font-bold text-slate-800">
                      {customer.date_of_birth 
                        ? new Date(customer.date_of_birth).toLocaleDateString('th-TH', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) 
                        : '1 มกราคม 2533'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ที่อยู่ */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <MapPin size={20} />
                    </div>
                    ที่อยู่สำหรับติดต่อ / จัดส่ง
                  </h2>
                </div>
                <div className="p-8 space-y-4">
                  <p className="text-sm font-medium text-slate-400 leading-relaxed">
                    {customer.address || '-'}
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="text-sm">
                      <span className="text-slate-400 font-medium mr-2">เขต/อำเภอ:</span>
                      <span className="font-bold text-slate-800">{customer.district || '-'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-400 font-medium mr-2">จังหวัด:</span>
                      <span className="font-bold text-slate-800">{customer.province || '-'} {customer.postcode || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Warranty / Products List */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <ShieldCheck size={20} />
                    </div>
                    รายการสินค้าที่ลูกค้ามีประกัน
                  </h2>
                  <span className="bg-slate-100 text-slate-500 text-sm font-bold px-4 py-1.5 rounded-full">
                    {warranties.length} รายการ
                  </span>
                </div>

                <div className="p-8 space-y-6 flex-1">
                  {warranties.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Package size={40} className="text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold text-lg">ไม่พบข้อมูลการประกันสินค้า</p>
                      <p className="text-slate-400 text-sm mt-2 max-w-xs">
                        ลูกค้ารายนี้ยังไม่มีการลงทะเบียนประกันสินค้า หรือข้อมูลไม่มี Brand/Product ที่ชัดเจน
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {warranties.map((warranty, index) => (
                        <Link
                          href={`/customers/${customerId}/warranty/${warranty.file_id}`}
                          key={`${warranty.file_id}-${index}`}
                          className="group relative bg-white border border-slate-100 rounded-[1.5rem] p-8 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                <ShieldCheck size={32} />
                              </div>
                              <div className="space-y-2">
                                <h3 className="font-extrabold text-slate-800 text-xl group-hover:text-blue-600 transition-colors">
                                  {warranty.registration_no}
                                </h3>
                                <div className="flex items-center gap-4">
                                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Calendar size={14} /> ลงทะเบียนเมื่อ {new Date(warranty.purchase_date).toLocaleDateString('th-TH')}
                                  </p>
                                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                                    warranty.status === 'ACTIVE' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {warranty.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight size={24} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-8 pt-8 border-t border-slate-50">
                            <div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Brand</p>
                              <p className="text-sm font-bold text-slate-700">{warranty.brand}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Model</p>
                              <p className="text-sm font-bold text-slate-700">{warranty.model}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Serial No.</p>
                              <p className="text-sm font-bold text-slate-700">{warranty.serial_no}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Agent ID</p>
                              <p className="text-sm font-bold text-slate-700">{warranty.agent_id || '-'}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ประวัติการโทร */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <FileAudio size={20} />
                </div>
                ประวัติการโทร
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 w-20">ลำดับ</th>
                    <th className="px-4 py-4">ประเภท</th>
                    <th className="px-4 py-4">วันที่</th>
                    <th className="px-4 py-4">เวลา</th>
                    <th className="px-4 py-4 text-right pr-8">เครื่องมือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {callHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-10 text-center text-slate-400 text-sm font-medium">
                        ไม่พบประวัติการโทร
                      </td>
                    </tr>
                  ) : (
                    callHistory.map((call) => (
                      <tr key={call.file_id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-sm font-bold text-slate-800">{call.id}</td>
                        <td className="px-4 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            call.type === 'inbound' 
                              ? 'bg-blue-100 text-blue-700' 
                              : call.type === 'outbound'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {call.type}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-sm font-bold text-slate-600">{call.date}</td>
                        <td className="px-4 py-5 text-sm font-bold text-slate-600">{call.time}</td>
                        <td className="px-4 py-5 text-right pr-8">
                          <Link 
                            href={`/files/${call.file_id}`}
                            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            ดูไฟล์เสียง <ArrowRight size={14} className="ml-1" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {showAddWarranty && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">เพิ่มข้อมูลประกัน (Manual)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Registration No.*"
                value={warrantyForm.registration_no}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, registration_no: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-600"
                placeholder="Brand (จาก AI)"
                value={warrantyForm.brand}
                readOnly
              />
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Model*"
                value={warrantyForm.model}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, model: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Serial No."
                value={warrantyForm.serial_no}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, serial_no: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Warranty Period"
                value={warrantyForm.warranty_period}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_period: e.target.value })}
              />
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={warrantyForm.purchase_date}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, purchase_date: e.target.value })}
              />
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={warrantyForm.status}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, status: e.target.value as 'ACTIVE' | 'EXPIRED' | 'PENDING' })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-600"
                placeholder="Sale Channel (จาก AI)"
                value={warrantyForm.sale_channel}
                readOnly
              />
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2 bg-slate-100 text-slate-600"
                placeholder="Agent ID (จาก AI)"
                value={warrantyForm.agent_id}
                readOnly
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddWarranty(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600"
                disabled={savingWarranty}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateWarranty}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60"
                disabled={savingWarranty || !warrantyForm.brand.trim()}
              >
                {savingWarranty ? 'กำลังบันทึก...' : 'บันทึกประกัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
