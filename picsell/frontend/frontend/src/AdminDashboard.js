import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function AdminDashboard({ onViewProfile, salesStats: propsStats }) {
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [localStats, setLocalStats] = useState({ 
    total_revenue: 0, 
    total_sales: 0, 
    sales_history: [],
    daily_performance: [] 
  });
  const [loading, setLoading] = useState(true);

  // รวมข้อมูล: ถ้า App.js ส่งมาให้ใช้ของ App ถ้าไม่มีให้ใช้ที่ดึงเอง
  const displayStats = propsStats || localStats;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, productRes, salesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users'),
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/admin/sales-stats')
      ]);
      
      setAllUsers(userRes.data || []);
      setAllProducts(productRes.data || []);
      setLocalStats(salesRes.data || { total_revenue: 0, total_sales: 0, sales_history: [], daily_performance: [] });
      
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteUser = async (id, username) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้งาน: ${username}?\n** ข้อมูลและผลงานทั้งหมดจะถูกลบถาวร`)) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/users/${id}`);
        alert("ลบข้อมูลผู้ใช้งานเรียบร้อยแล้ว");
        fetchData(); 
      } catch (err) {
        alert("ไม่สามารถลบผู้ใช้งานได้: " + (err.response?.data?.message || "Internal Error"));
      }
    }
  };

  const deleteProduct = async (id, title) => {
    if (window.confirm(`ยืนยันการลบรูปภาพ: ${title}?\n** ข้อมูลการซื้อขายที่เกี่ยวข้องจะถูกลบออกด้วย`)) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/products/${id}`);
        if (response.data.success) {
          alert("ลบรูปภาพและข้อมูลสำเร็จ");
          fetchData(); 
        }
      } catch (err) {
        alert("ลบไม่สำเร็จ: " + (err.response?.data?.message || "ติดประวัติการขายในระบบ"));
      }
    }
  };

  // --- Logic รวมกลุ่มประวัติการขายตามสลิป (Grouping) ---
  const groupedSales = (displayStats.sales_history || []).reduce((acc, item) => {
    // ใช้สลิปหรือวันที่เป็น Key ในการรวมกลุ่ม
    const key = item.slip_path || item.created_at; 
    if (!acc[key]) {
      acc[key] = {
        ...item,
        items_count: 1,
        total_amount: Number(item.amount),
        artworks: [item.artwork_name || item.product_name]
      };
    } else {
      acc[key].items_count += 1;
      acc[key].total_amount += Number(item.amount);
      acc[key].artworks.push(item.artwork_name || item.product_name);
    }
    return acc;
  }, {});

  const finalSalesHistory = Object.values(groupedSales);

  if (loading && !propsStats) return (
    <div className="p-20 text-center uppercase tracking-widest text-xs animate-pulse text-gray-400">
      Loading Admin Control Panel...
    </div>
  );

  return (
    <div className="p-10 bg-white border-t-4 border-black animate-fadeIn mt-10 shadow-2xl">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl tracking-[0.2em] uppercase font-light">Admin Control Panel</h2>
          <p className="text-[10px] text-gray-400 uppercase italic">Management & Reporting System</p>
        </div>
        <button onClick={fetchData} className="text-[9px] border border-black px-6 py-2 uppercase font-bold hover:bg-black hover:text-white transition-all">
          Refresh Data
        </button>
      </div>

      {/* --- Dashboard Summary --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-black p-8 text-white shadow-lg">
          <p className="text-[9px] uppercase mb-2 opacity-60 tracking-widest">Total System Revenue</p>
          <p className="text-4xl font-serif">฿{Number(displayStats.total_revenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border p-8 shadow-sm">
          <p className="text-[9px] uppercase mb-2 text-gray-400 tracking-widest">Total Items Sold</p>
          <p className="text-4xl font-serif">{displayStats.total_sales || 0}</p>
        </div>
        <div className="bg-white border p-8 shadow-sm border-l-4 border-green-400">
          <p className="text-[9px] uppercase mb-2 text-gray-400 tracking-widest">Active Users</p>
          <p className="text-4xl font-serif">{allUsers.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* --- 1. User Management (ดึงข้อมูลกลับมาแล้ว) --- */}
        <div className="bg-white border p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase mb-6 border-l-2 border-red-500 pl-4 tracking-widest">User Management</h3>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-[10px] uppercase">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr><th className="p-4">User Details</th><th className="p-4 text-center">Action</th></tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold flex items-center gap-2">
                        {u.username}
                        {u.role === 'admin' && <span className="bg-black text-white px-1 py-0.5 text-[7px]">STAFF</span>}
                      </div>
                      <div className="text-[8px] text-gray-400 lowercase">{u.email}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-4 font-bold">
                        <button onClick={() => onViewProfile(u.id)} className="text-blue-500 hover:underline">View</button>
                        {u.username !== 'admin' && (
                          <button onClick={() => deleteUser(u.id, u.username)} className="text-red-500 hover:underline">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 2. All Artworks Management --- */}
        <div className="bg-white border p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase mb-6 border-l-2 border-blue-500 pl-4 tracking-widest">Artwork Repository</h3>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-[10px] uppercase">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr><th className="p-4">Preview</th><th className="p-4">Title</th><th className="p-4 text-center">Action</th></tr>
              </thead>
              <tbody>
                {allProducts.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4"><img src={`http://localhost:5000${p.thumbnail_path}`} className="w-8 h-10 object-cover border bg-gray-50 shadow-sm" alt="" /></td>
                    <td className="p-4 font-bold truncate max-w-[120px]">{p.title}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => deleteProduct(p.id, p.title)} className="text-red-500 font-bold underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- 3. Global Sales History (แบบรวมยอดบิลตามสลิป) --- */}
      <div className="mt-12 bg-white border p-6 shadow-sm">
        <h3 className="text-[10px] font-bold uppercase mb-6 border-l-2 border-green-500 pl-4 tracking-widest">Global Sales (Grouped by Bill)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] uppercase">
            <thead className="bg-gray-50 border-b font-bold text-gray-500">
              <tr>
                <th className="p-4">Artworks / Order Content</th>
                <th className="p-4">Buyer</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4 text-right">Total Price</th>
                <th className="p-4 text-center">Payment Slip</th>
              </tr>
            </thead>
            <tbody>
              {finalSalesHistory.length > 0 ? finalSalesHistory.map((order, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-black">{order.artworks.join(", ")}</div>
                    <div className="text-[8px] text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</div>
                  </td>
                  <td className="p-4 text-gray-500">{order.buyer_name}</td>
                  <td className="p-4 text-center font-bold text-gray-600">{order.items_count} ชิ้น</td>
                  <td className="p-4 text-right font-serif font-bold text-blue-600">
                    ฿{order.total_amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    {order.slip_path ? (
                      <button 
                        onClick={() => window.open(`http://localhost:5000${order.slip_path}`, '_blank')} 
                        className="bg-black text-white px-4 py-2 text-[8px] font-bold uppercase hover:bg-gray-800 transition-all shadow-sm"
                      >
                        View Slip
                      </button>
                    ) : <span className="text-gray-300 italic text-[8px]">No Slip Attached</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">No sales history found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;