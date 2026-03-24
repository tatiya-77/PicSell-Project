import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ onViewProfile }) {
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลทั้งหมด (Users & Products)
  const fetchData = async () => {
    try {
      setLoading(true);
      const userRes = await axios.get('http://localhost:5000/api/admin/users');
      const productRes = await axios.get('http://localhost:5000/api/products');
      setAllUsers(userRes.data);
      setAllProducts(productRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. ฟังก์ชันลบผู้ใช้งาน
  const deleteUser = async (id, username) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้งาน: ${username}? (การกระทำนี้ย้อนกลับไม่ได้)`)) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/users/${id}`);
        alert("ลบผู้ใช้งานสำเร็จ");
        fetchData(); // รีเฟรชข้อมูล
      } catch (err) {
        alert("ไม่สามารถลบผู้ใช้งานได้");
      }
    }
  };

  // 3. ฟังก์ชันลบรูปภาพ (Admin Power)
  const deleteProduct = async (id, title) => {
    if (window.confirm(`ยืนยันการลบรูปภาพ: ${title}?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/products/${id}`);
        alert("ลบรูปภาพสำเร็จ");
        fetchData(); // รีเฟรชข้อมูล
      } catch (err) {
        alert("ไม่สามารถลบรูปภาพได้");
      }
    }
  };

  if (loading) return <div className="p-10 text-center uppercase tracking-widest text-xs">Loading Admin Panel...</div>;

  return (
    <div className="p-10 bg-white border-t-4 border-black animate-fadeIn">
      <div className="mb-10">
        <h2 className="text-2xl tracking-[0.2em] uppercase font-light mb-2">Admin Control Panel</h2>
        <p className="text-[10px] text-gray-400 uppercase italic">จัดการระบบหลังบ้าน PicSell</p>
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
                      {/* ปุ่มดูโปรไฟล์ (เพิ่มเข้ามาใหม่) */}
                      <button 
                        onClick={() => onViewProfile(u.id)}
                        className="text-blue-500 hover:underline font-bold"
                      >
                        View Profile
                      </button>

                      {/* ปุ่มลบผู้ใช้งาน (ต้องไม่ลบตัวเองที่เป็น admin) */}
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

        {/* ส่วนที่ 2: จัดการรูปภาพทั้งหมด */}
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
    </div>
  );
}

export default AdminDashboard;