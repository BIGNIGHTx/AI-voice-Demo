'use client';

import Sidebar from '@/components/Sidebar';
import {
  Printer,
  XCircle,
  PenSquare,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  Send,
  FileAudio
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

// ประกาศ Types แบบเดียวกับหน้า UI
interface WarrantyDetail {
  registration_no: string;
  ref_id: string;
  channel: string;
  certificate_no: string;
  category: string;
  brand: string;
  model: string;
  size: string;
  sku: string;
  serial_no: string;
  label_no: string;
  warranty_period: string;
  date_of_purchase: string;
  date_of_delivery: string;
  purchase_channel: string;
  order_number: string;
  expiry_date_of_warranty: string;
  remark: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  created_on: string;
}

interface RegistrantInfo {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  address: string;
  subdistrict: string;
  district: string;
  city_province: string;
  country: string;
  postcode: string;
}

const MOCK_WARRANTY_DETAIL: WarrantyDetail = {
  registration_no: 'W4Z0NQ43GXH',
  ref_id: 'N/A',
  channel: 'Dunlopillo',
  certificate_no: 'B7IUWSAMRNCA',
  category: 'Mattress',
  brand: 'Dunlopillo',
  model: 'N/A',
  size: '5 Ft.',
  sku: '855578182/247',
  serial_no: 'B7IUWSAMRNCA',
  label_no: 'UIKDKNHJTLJND',
  warranty_period: '120 Months',
  date_of_purchase: '15/03/2026',
  date_of_delivery: '28/03/2026',
  purchase_channel: 'Shopee',
  order_number: 'WHshpe29938548',
  expiry_date_of_warranty: '15/03/2036',
  remark: 'N/A',
  status: 'ACTIVE',
  created_on: '20/03/2026 21:18'
};

const MOCK_REGISTRANT_INFO: RegistrantInfo = {
  first_name: 'สมชาย',
  last_name: 'ใจดี',
  phone: '0812345678',
  email: 'somchai@email.com',
  gender: 'MALE',
  date_of_birth: '15/05/1990',
  address: '123/45 ซอยสุขใจ ถนนลาดพร้าว',
  subdistrict: 'จอมพล',
  district: 'จตุจักร',
  city_province: 'กรุงเทพมหานคร',
  country: 'Thailand',
  postcode: '10900'
};

export default function WarrantyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const fileId = params.fileId as string;

  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null);
  const [registrant, setRegistrant] = useState<RegistrantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // จำลองโหลดข้อมูล
    setTimeout(() => {
      setWarranty(MOCK_WARRANTY_DETAIL);
      setRegistrant(MOCK_REGISTRANT_INFO);
      setLoading(false);
    }, 600);
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">กำลังโหลดข้อมูลการรับประกัน...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!warranty || !registrant) return null;

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b-2 border-slate-100 uppercase tracking-wide">
      {title}
    </h3>
  );

  const InfoRow = ({ label, value, bg = false }: { label: string, value: React.ReactNode, bg?: boolean }) => (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 py-3 px-4 ${bg ? 'bg-slate-50 rounded-lg' : ''}`}>
      <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="min-h-[20px] md:col-span-2 text-sm font-bold text-slate-800 break-words">{value || '-'}</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-sm">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        
        {/* Top Navbar / Breadcrumb */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/customers/${customerId}`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push('/customers')}>Customers</span>
              <span>/</span>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push(`/customers/${customerId}`)}>{registrant.first_name}</span>
              <span>/</span>
              <span className="text-slate-800 font-bold">Warranty Detail</span>
            </div>
          </div>
          
          <div className="text-xs text-slate-400">
            Created On {warranty.created_on}
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* Header & Actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  #{warranty.registration_no}
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} /> {warranty.status}
                  </span>
                </h1>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                  <FileAudio size={14} className="text-blue-500"/> ถอดความจากไฟล์เสียง (AI Analysis): 
                  <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/files/${fileId}`)}>{fileId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-colors">
                <Printer size={16} /> Print
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors">
                <XCircle size={16} /> Cancel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold shadow-md shadow-blue-200 transition-colors">
                <PenSquare size={16} /> Update
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Warranty Information */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
              <SectionTitle title="Warranty Information" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                <div className="space-y-1">
                  <InfoRow label="Registration No." value={warranty.registration_no} bg />
                  <InfoRow label="Ref Id" value={warranty.ref_id} />
                  <InfoRow label="Channel" value={warranty.channel} bg />
                  <InfoRow label="Certificate No." value={warranty.certificate_no} />
                  <InfoRow label="Category" value={warranty.category} bg />
                  <InfoRow label="Brand" value={warranty.brand} />
                  <InfoRow label="Model" value={warranty.model} bg />
                  <InfoRow label="Size" value={warranty.size} />
                  <InfoRow label="SKU" value={warranty.sku} bg />
                </div>
                <div className="space-y-1">
                  <InfoRow label="Serial No." value={warranty.serial_no} />
                  <InfoRow label="Label No." value={warranty.label_no} bg />
                  <InfoRow label="Warranty Period" value={warranty.warranty_period} />
                  <InfoRow label="Date Of Purchase" value={warranty.date_of_purchase} bg />
                  <InfoRow label="Date Of Delivery" value={warranty.date_of_delivery} />
                  <InfoRow label="Purchase Channel" value={warranty.purchase_channel} bg />
                  <InfoRow label="Order Number" value={warranty.order_number} />
                  <InfoRow label="Expiry Date" value={warranty.expiry_date_of_warranty} bg />
                  <InfoRow label="Remark" value={warranty.remark} />
                </div>
              </div>
            </div>

            {/* Registrant Information */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <SectionTitle title="Registrant Information" />
              
              <div className="space-y-1">
                <InfoRow label="First Name" value={registrant.first_name} bg />
                <InfoRow label="Last Name" value={registrant.last_name} />
                <InfoRow label="Phone" value={registrant.phone} bg />
                <InfoRow label="Email" value={registrant.email} />
                <InfoRow label="Gender" value={registrant.gender} bg />
                <InfoRow label="Date Of Birth" value={registrant.date_of_birth} />
                <InfoRow label="Address" value={registrant.address} bg />
                <InfoRow label="Subdistrict" value={registrant.subdistrict} />
                <InfoRow label="District" value={registrant.district} bg />
                <InfoRow label="City/Province" value={registrant.city_province} />
                <InfoRow label="Country" value={registrant.country} bg />
                <InfoRow label="Postcode" value={registrant.postcode} />
              </div>
            </div>

            <div className="space-y-8">
              {/* Evidence */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <SectionTitle title="Proof/Evidence Of Purchase" />
                <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                </div>
              </div>

              {/* Activities */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <SectionTitle title="Activities" />
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                    A
                  </div>
                  <div className="flex-1">
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none min-h-[100px]"
                      placeholder="Leave A Comment / Note..."
                    ></textarea>
                    
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                        Internal Note
                      </label>
                      <div className="flex items-center gap-2">
                        <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors text-xs uppercase tracking-widest">
                          Upload File
                        </button>
                        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors text-xs uppercase tracking-widest">
                          Send <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center py-6 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-400">No data</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
