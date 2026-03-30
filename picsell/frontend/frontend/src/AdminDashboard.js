import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ onViewProfile }) {
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  // State สำหรับยอดขายที่ดึงมาจาก Node.js Port 5000
  const [salesStats, setSalesStats] = useState({ 
    total_revenue: 0, 
    total_sales: 0, 
    sales_history: [],
    daily_performance: [] 
  });
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลทั้งหมดจาก Port 5000 (Single Port System)
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูล Users, Products และ Sales Stats พร้อมกัน
      const [userRes, productRes, salesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users'),
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/admin/sales-stats')
      ]);
      
      setAllUsers(userRes.data);
      setAllProducts(productRes.data);
      setSalesStats(salesRes.data); 
      
      setLoading(false);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. ฟังก์ชันลบผู้ใช้งาน (ลบผู้ใช้ + ผลงานทั้งหมดของผู้ใช้นั้น)
  const deleteUser = async (id, username) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้งาน: ${username}?\n** ข้อมูลและผลงานทั้งหมดของผู้ใช้นี้จะถูกลบออกจากระบบถาวร`)) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/users/${id}`);
        alert("ลบข้อมูลผู้ใช้งานเรียบร้อยแล้ว");
        fetchData(); // อัปเดต UI ทันที
      } catch (err) {
        alert("ไม่สามารถลบผู้ใช้งานได้");
      }
    }
  };

  // 3. ฟังก์ชันลบรูปภาพโดยแอดมิน (ลบรูป + ประวัติการซื้อที่เกี่ยวข้อง)
  const deleteProduct = async (id, title) => {
    if (window.confirm(`ยืนยันการลบรูปภาพ: ${title}?\n** ประวัติการซื้อขายที่เกี่ยวข้องกับรูปนี้จะถูกลบออกด้วย`)) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/products/${id}`);
        if (response.data.success) {
          alert("ลบรูปภาพและข้อมูลที่เกี่ยวข้องสำเร็จ");
          fetchData(); // รีโหลดข้อมูลเพื่อให้ยอดเงินและรายการอัปเดตทันที
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert(err.response?.data?.message || "ไม่สามารถลบรูปภาพได้");
      }
    }
  };

  if (loading) return <div className="p-10 text-center uppercase tracking-widest text-xs">Loading Admin Panel...</div>;

  return (
    <div className="p-10 bg-white border-t-4 border-black animate-fadeIn">
      <div className="mb-10">
        <h2 className="text-2xl tracking-[0.2em] uppercase font-light mb-2">Admin Control Panel</h2>
        <p className="text-[10px] text-gray-400 uppercase italic">จัดการระบบหลังบ้าน PicSell (Total Management)</p>
      </div>

      {/* --- Sales Summary UI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-black p-8 text-white shadow-lg">
          <h3 className="text-[10px] tracking-widest uppercase mb-4 opacity-70 border-l border-white pl-3">Total Revenue</h3>
          <p className="text-4xl font-serif">฿{Number(salesStats.total_revenue).toLocaleString()}</p>
        </div>
        <div className="bg-white border p-8 shadow-sm">
          <h3 className="text-[10px] tracking-widest uppercase mb-4 text-gray-400 border-l border-black pl-3">Total Sales</h3>
          <p className="text-4xl font-serif">{salesStats.total_sales} <span className="text-sm uppercase text-gray-400">Items</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* ส่วนที่ 1: จัดการผู้ใช้งาน */}
        <div>
          <h3 className="text-[10px] font-bold tracking-widest uppercase mb-6 border-l-2 border-red-500 pl-4">User Management ({allUsers.length})</h3>
          <div className="border overflow-x-auto shadow-sm">
            <table className="w-full text-left text-[10px] uppercase">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Username</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-400">#{u.id}</td>
                    <td className="p-4 font-bold">{u.username}</td>
                    <td className="p-4 flex justify-center gap-4">
                      <button 
                        onClick={() => onViewProfile(u.id)}
                        className="text-blue-500 hover:underline font-bold"
                      >
                        View Profile
                      </button>
                      {u.username !== 'admin' && (
                        <button 
                          onClick={() => deleteUser(u.id, u.username)}
                          className="text-red-500 hover:underline font-bold"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ส่วนที่ 2: จัดการรูปภาพทั้งหมด (ลบได้โดยตรง) */}
        <div>
          <h3 className="text-[10px] font-bold tracking-widest uppercase mb-6 border-l-2 border-blue-500 pl-4">All Artworks ({allProducts.length})</h3>
          <div className="border overflow-x-auto shadow-sm">
            <table className="w-full text-left text-[10px] uppercase">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">Preview</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <img src={`http://localhost:5000${p.thumbnail_path}`} className="w-8 h-10 object-cover border" alt="" />
                    </td>
                    <td className="p-4 font-bold truncate max-w-[100px]">{p.title}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => deleteProduct(p.id, p.title)}
                        className="text-red-500 hover:underline font-bold"
                      >
                        Remove Art
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- ส่วนที่ 3: Sales History Table --- */}
      <div className="mt-12">
        <h3 className="text-[10px] font-bold tracking-widest uppercase mb-6 border-l-2 border-green-500 pl-4">Recent Sales History</h3>
        <div className="border overflow-x-auto">
           <table className="w-full text-left text-[10px] uppercase">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">Artwork</th>
                  <th className="p-4">Buyer</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {salesStats.sales_history && salesStats.sales_history.map((sale, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4 font-bold">{sale.artwork_name}</td>
                    <td className="p-4">{sale.buyer_name}</td>
                    <td className="p-4 text-right font-serif">฿{Number(sale.amount).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full">{sale.status}</span>
                    </td>
                  </tr>
                ))}
                {(!salesStats.sales_history || salesStats.sales_history.length === 0) && (
                   <tr><td colSpan="4" className="p-10 text-center text-gray-400">No Sales Record Found</td></tr>
                )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;