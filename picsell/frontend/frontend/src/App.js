import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [myCollection, setMyCollection] = useState([]); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('gallery'); 
  const [showCart, setShowCart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [resetData, setResetData] = useState({ username: '', newPassword: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({ username: '', password: '' });
  
  // --- ส่วนที่เพิ่มใหม่สำหรับ Admin ดูโปรไฟล์ผู้อื่น ---
  const [viewingUser, setViewingUser] = useState(null); 
  const [viewingSales, setViewingSales] = useState([]);

  const handleAdminViewProfile = async (targetUserId) => {
    try {
        const userRes = await axios.get(`http://localhost:5000/api/admin/users/${targetUserId}`);
        const salesRes = await axios.get(`http://localhost:5000/api/sales/${targetUserId}`);
        setViewingUser(userRes.data);
        setViewingSales(salesRes.data);
        setCurrentView('admin_view_profile');
        window.scrollTo(0, 0);
    } catch (err) { alert("ไม่สามารถดึงข้อมูลโปรไฟล์ได้"); }
  };
  // ------------------------------------------

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [image, setImage] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState({ id: '', title: '', price: '', stock: 0 });

  const [sales, setSales] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
    } catch (err) { console.error("Fetch failed", err); }
  }, []);

  const fetchSales = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/sales/${user.id}`);
      setSales(res.data);
    } catch (err) { console.error("Fetch sales failed", err); }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedCollection = localStorage.getItem('collection');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
        setEditData({ username: parsedUser.username, password: '' });
    }
    if (savedCollection) setMyCollection(JSON.parse(savedCollection));
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (currentView === 'profile' && user) {
        fetchSales();
    }
  }, [currentView, user, fetchSales]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const url = isRegisterMode ? '/api/register' : '/api/login';
    try {
      const res = await axios.post(`http://localhost:5000${url}`, authData);
      if (isRegisterMode) { alert("สมัครสมาชิกสำเร็จ!"); setIsRegisterMode(false); }
      else {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setIsLoggedIn(true);
        setEditData({ username: res.data.user.username, password: '' });
        setShowAuthModal(false);
      }
    } catch (err) { alert(err.response?.data?.message || "Error Auth"); }
  };

  const switchToResetMode = () => {
    setResetData({ ...resetData, username: authData.username });
    setIsResetMode(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/reset-password', {
        username: resetData.username,
        newPassword: resetData.newPassword
      });
      alert(res.data.message);
      setAuthData({ ...authData, username: resetData.username, password: '' });
      setIsResetMode(false);
    } catch (err) {
      alert("Reset failed: " + (err.response?.data?.message || "Server Error"));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editData.password) return alert("กรุณากรอกรหัสผ่านเพื่อยืนยัน");
    try {
        await axios.put(`http://localhost:5000/api/users/${user.id}`, editData);
        alert("แก้ไขสำเร็จ! กรุณา Login ใหม่");
        handleLogout();
    } catch (err) { alert("Update failed"); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false); setUser(null); setCart([]); 
    setCurrentView('gallery'); setIsEditingProfile(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title); formData.append('price', price);
    formData.append('stock', stock); formData.append('image', image);
    formData.append('user_id', user.id);
    try {
      await axios.post('http://localhost:5000/api/products', formData);
      alert("อัปโหลดสำเร็จ!"); 
      setCurrentView('profile'); 
      fetchProducts();
    } catch (err) { alert("Upload failed"); }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'artwork') {
      try {
        await axios.delete(`http://localhost:5000/api/products/${itemToDelete.id}`);
        fetchProducts();
      } catch (err) { alert("ลบไม่สำเร็จ"); }
    } else {
      const newCol = [...myCollection];
      newCol.splice(itemToDelete.index, 1);
      setMyCollection(newCol);
      localStorage.setItem('collection', JSON.stringify(newCol));
    }
    setShowDeleteModal(false);
  };

  const handleUpdateArtwork = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/products/${itemToEdit.id}`, itemToEdit);
      alert("แก้ไขเรียบร้อย!");
      setShowEditModal(false);
      fetchProducts();
    } catch (err) { alert("แก้ไขไม่สำเร็จ"); }
  };

  const confirmPayment = async () => {
    if (!paymentMethod) return alert("กรุณาเลือกช่องทางชำระเงิน");
    try {
      await axios.post('http://localhost:5000/api/checkout', { 
        cart, 
        buyer_id: user.id 
      });
      const purchased = cart.map(c => ({ ...products.find(p => p.id === c.id), buyer_id: user.id }));
      const newCol = [...myCollection, ...purchased];
      setMyCollection(newCol);
      localStorage.setItem('collection', JSON.stringify(newCol));
      
      setCart([]); 
      setShowCart(false); 
      setShowPaymentModal(false); 
      setIsSuccess(true); 
      fetchProducts();
    } catch (err) { alert("Payment failed"); }
  };

  const downloadImage = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url; link.download = fileName; document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] font-serif text-[#333]">
      <nav className="bg-white border-b border-[#E8E6D1] px-10 py-6 sticky top-0 z-[60] flex justify-between items-center shadow-sm">
        <h1 className="text-2xl tracking-[0.3em] uppercase font-light cursor-pointer" onClick={() => setCurrentView('gallery')}>PicSell</h1>
        <div className="flex gap-10 items-center text-[10px] tracking-widest uppercase font-medium">
          <button onClick={() => setCurrentView('gallery')} className={currentView === 'gallery' ? 'underline' : 'text-gray-400'}>Home</button>
          {isLoggedIn && (
            <>
              <button onClick={() => setCurrentView('upload')} className={currentView === 'upload' ? 'underline' : 'text-gray-400'}>Upload</button>
              <button onClick={() => setCurrentView('profile')} className={currentView === 'profile' ? 'underline' : 'text-gray-400'}>My Profile</button>
              <button onClick={() => setShowCart(!showCart)} className="relative flex items-center gap-2">Cart <span className="bg-black text-white px-2 py-0.5 rounded-full text-[8px]">{cart.length}</span></button>
              <button onClick={handleLogout} className="text-red-400">Logout</button>
            </>
          )}
          {!isLoggedIn && <button onClick={() => setShowAuthModal(true)} className="bg-black text-white px-5 py-2">Sign In</button>}
        </div>
      </nav>

      <div className="p-10 max-w-7xl mx-auto">
        {/* --- หน้า Profile ของผู้อื่น (สำหรับ Admin เข้าชม) --- */}
        {currentView === 'admin_view_profile' && viewingUser ? (
            <div className="animate-fadeIn">
                <button onClick={() => setCurrentView('profile')} className="text-[10px] uppercase tracking-widest mb-10 border border-black px-4 py-2">← Back to Dashboard</button>
                <div className="mb-10 border-b pb-10">
                    <h2 className="text-4xl tracking-widest uppercase font-light">User Profile (Admin View)</h2>
                    <p className="text-[10px] text-blue-500 mt-3 italic uppercase font-bold">Username: {viewingUser.username}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Email: {viewingUser.email}</p>
                </div>

                <h3 className="text-[10px] font-bold tracking-widest uppercase mb-10 border-l-2 border-blue-400 pl-4">Artworks by {viewingUser.username}</h3>
                <div className="grid grid-cols-4 gap-10 mb-20">
                    {products.filter(p => p.user_id === viewingUser.id).map((p) => (
                        <div key={p.id} className="bg-white p-5 border">
                            <img src={`http://localhost:5000${p.thumbnail_path}`} className="w-full aspect-[3/4] object-cover mb-2" alt="" />
                            <p className="text-[10px] font-bold uppercase truncate">{p.title}</p>
                            <p className="text-[9px] text-gray-400 uppercase">Price: ฿{p.price}</p>
                        </div>
                    ))}
                </div>

                <h3 className="text-[10px] font-bold tracking-widest uppercase mb-8 border-l-2 border-green-400 pl-4">Sales Report for {viewingUser.username}</h3>
                <div className="bg-white border overflow-hidden shadow-sm mb-20">
                    <table className="w-full text-left text-[10px] uppercase">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-4">Artwork</th>
                                <th className="p-4">Buyer</th>
                                <th className="p-4">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {viewingSales.map((s) => (
                                <tr key={s.id} className="border-b">
                                    <td className="p-4 font-bold">{s.product_name}</td>
                                    <td className="p-4 text-gray-400">{s.buyer_name}</td>
                                    <td className="p-4">฿{s.amount}</td>
                                </tr>
                            ))}
                            {viewingSales.length === 0 && (
                                <tr><td colSpan="3" className="p-10 text-center text-gray-400">No sales history</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : currentView === 'profile' ? (
          <div className="animate-fadeIn">
            <div className="mb-10 border-b pb-10 flex justify-between items-end">
              <div><h2 className="text-4xl tracking-widest uppercase font-light">My Account</h2><p className="text-[10px] text-gray-400 mt-3 italic uppercase">Artist: {user?.username}</p></div>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-[10px] border border-black px-6 py-2 uppercase tracking-widest">{isEditingProfile ? "Close Settings" : "Edit Profile"}</button>
            </div>
            
            {isEditingProfile && (
              <div className="max-w-sm mb-12 bg-white p-8 border shadow-sm">
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <input type="text" value={editData.username} className="w-full border-b py-2 text-sm outline-none" onChange={e => setEditData({...editData, username: e.target.value})} placeholder="Username" required />
                  <input type="password" value={editData.password} className="w-full border-b py-2 text-sm outline-none" onChange={e => setEditData({...editData, password: e.target.value})} placeholder="New Password" required />
                  <button className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest w-full">Save Changes</button>
                </form>
              </div>
            )}

            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-8 border-l-2 border-black pl-4 text-pink-400">My Collection</h3>
            <div className="grid grid-cols-4 gap-10 mb-20">
              {myCollection.map((p, i) => user && p.buyer_id === user.id && (
                  <div key={i} className="bg-white p-5 border group relative">
                    <button onClick={() => {setItemToDelete({index: i, type:'col', title: p.title}); setShowDeleteModal(true);}} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black text-white text-[8px] px-2 py-1">X</button>
                    <img src={`http://localhost:5000${p.thumbnail_path}`} className="w-full aspect-[3/4] object-cover mb-2" alt="" />
                    <p className="text-[10px] font-bold uppercase truncate mb-3">{p.title}</p> 
                    <button onClick={() => downloadImage(`http://localhost:5000${p.thumbnail_path}`, `${p.title}.jpg`)} className="w-full bg-gray-100 py-2 text-[8px] uppercase font-bold">Download</button>
                  </div>
              ))}
            </div>

            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-10 opacity-40 border-l-2 border-black pl-4 text-blue-400">My Artworks</h3>
            <div className="grid grid-cols-4 gap-10 mb-20">
              {products.filter(p => p.user_id === user?.id).map((p) => (
                <div key={p.id} className="bg-white p-5 border group relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                    <button onClick={() => {setItemToEdit(p); setShowEditModal(true);}} className="bg-gray-200 text-[8px] px-2 py-1">✎</button>
                    <button onClick={() => {setItemToDelete({id: p.id, type:'artwork', title: p.title}); setShowDeleteModal(true);}} className="bg-black text-white text-[8px] px-2 py-1">X</button>
                  </div>
                  <img src={`http://localhost:5000${p.thumbnail_path}`} className="w-full aspect-[3/4] object-cover mb-2" alt="" />
                  <p className="text-[10px] font-bold uppercase truncate">{p.title}</p>
                </div>
              ))}
            </div>

            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-8 border-l-2 border-green-400 pl-4">Sales Report</h3>
            <div className="bg-white border overflow-hidden shadow-sm mb-20">
                <table className="w-full text-left text-[10px] uppercase">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4">Artwork</th>
                            <th className="p-4">Buyer</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((s) => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold">{s.product_name}</td>
                                <td className="p-4 text-gray-400">{s.buyer_name}</td>
                                <td className="p-4">฿{s.amount}</td>
                                <td className="p-4 text-green-500 font-bold">{s.status}</td>
                            </tr>
                        ))}
                        {sales.length === 0 && (
                            <tr><td colSpan="4" className="p-10 text-center text-gray-400">No sales history yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {user?.username === 'admin' && (
              <div className="mt-20 border-t-4 border-black pt-10">
                {/* ส่งฟังก์ชัน handleAdminViewProfile ไปให้ AdminDashboard ใช้งาน */}
                <AdminDashboard onViewProfile={handleAdminViewProfile} />
              </div>
            )}

          </div>
        ) : currentView === 'upload' ? (
          <div className="max-w-md mx-auto bg-white p-10 border shadow-sm">
            <h2 className="text-[10px] font-bold tracking-widest uppercase mb-10 text-center border-b pb-4">Publish New Art</h2>
            <form onSubmit={handleUpload} className="space-y-6">
              <input type="text" placeholder="Title" className="w-full border-b py-2 text-sm outline-none" onChange={e => setTitle(e.target.value)} required />
              <input type="number" placeholder="Price (฿)" className="w-full border-b py-2 text-sm outline-none" onChange={e => setPrice(e.target.value)} required />
              <input type="number" placeholder="Stock" className="w-full border-b py-2 text-sm outline-none" onChange={e => setStock(e.target.value)} required />
              <input type="file" className="w-full text-[10px] py-4" onChange={e => setImage(e.target.files[0])} required />
              <button className="w-full bg-black text-white py-4 text-[10px] uppercase tracking-widest">Upload</button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-10 animate-fadeIn">
            {products.map((p) => (
              <div key={p.id} className="bg-white p-5 border hover:shadow-md transition-all group">
                <div className="aspect-[3/4] mb-5 bg-[#F9F9F9] relative overflow-hidden">
                  {p.stock <= 0 && <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center"><span className="border-2 border-white text-white px-4 py-1 text-xs font-bold uppercase -rotate-12">Sold Out</span></div>}
                  <img src={`http://localhost:5000${p.thumbnail_path}`} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="" />
                  {isLoggedIn && p.stock > 0 && <button onClick={() => {setCart([...cart, p]); setShowCart(true);}} className="absolute bottom-0 w-full bg-black text-white py-4 text-[10px] opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-all">Add to Cart</button>}
                </div>
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Artist: {p.owner_name || 'Anonymous'}</p>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold uppercase truncate w-32 leading-tight">{p.title}</h3>
                  <p className="text-sm font-bold">฿{Number(p.price).toLocaleString()}</p>
                </div>
                <p className={`text-[9px] uppercase font-bold ${p.stock <= 3 && p.stock > 0 ? 'text-red-400' : 'text-gray-400'}`}>{p.stock <= 0 ? 'Out of Stock' : `Stock: ${p.stock}`}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-10 max-w-sm w-full text-center relative shadow-2xl">
            <button onClick={() => {setShowAuthModal(false); setIsResetMode(false);}} className="absolute top-4 right-4 text-xl">✕</button>
            <h2 className="text-xl tracking-widest uppercase mb-8 font-light">{isResetMode ? 'Reset Password' : (isRegisterMode ? 'Sign Up' : 'Sign In')}</h2>
            <form onSubmit={isResetMode ? handleResetPassword : handleAuth} className="space-y-6">
                <input type="text" placeholder="Username" value={isResetMode ? resetData.username : authData.username} className="w-full border-b py-2 text-sm outline-none" 
                   onChange={e => isResetMode ? setResetData({...resetData, username: e.target.value}) : setAuthData({...authData, username: e.target.value})} required />
                
                {isRegisterMode && !isResetMode && <input type="email" placeholder="Email" value={authData.email} className="w-full border-b py-2 text-sm outline-none" onChange={e => setAuthData({...authData, email: e.target.value})} required />}
                
                <input type="password" placeholder={isResetMode ? "New Password" : "Password"} value={isResetMode ? resetData.newPassword : authData.password} className="w-full border-b py-2 text-sm outline-none" 
                   onChange={e => isResetMode ? setResetData({...resetData, newPassword: e.target.value}) : setAuthData({...authData, password: e.target.value})} required />
                
                <button className="w-full bg-black text-white py-4 text-[10px] uppercase tracking-widest font-bold">{isResetMode ? 'Update Password' : (isRegisterMode ? 'Register' : 'Login')}</button>
                <div className="flex justify-between mt-4">
                  {!isResetMode && <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[9px] uppercase underline">{isRegisterMode ? 'Back to Login' : 'Create account'}</button>}
                  {!isRegisterMode && !isResetMode && <button type="button" onClick={switchToResetMode} className="text-[9px] uppercase text-red-400 underline">Forgot Password?</button>}
                  {isResetMode && <button type="button" onClick={() => setIsResetMode(false)} className="text-[9px] uppercase text-gray-400 w-full text-center underline">Back to Login</button>}
                </div>
            </form>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed top-20 right-10 w-80 bg-white border shadow-2xl z-[70] p-6 animate-fadeIn">
          <h2 className="text-[10px] font-bold uppercase mb-4 border-b pb-2 tracking-widest">Cart</h2>
          <div className="space-y-3 mb-4 max-h-40 overflow-auto">{cart.map((item, idx) => (<div key={idx} className="flex justify-between text-[10px] uppercase"><span>{item.title}</span><span>฿{item.price} <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 ml-1">✕</button></span></div>))}</div>
          <div className="border-t pt-4"><div className="flex justify-between text-xs font-bold mb-4"><span>TOTAL</span><span>฿{cart.reduce((s,i)=>s+Number(i.price),0)}</span></div><button onClick={() => setShowPaymentModal(true)} className="w-full bg-black text-white py-3 text-[10px] uppercase tracking-widest">Checkout</button></div>
        </div>
      )}
      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white p-10 max-w-sm w-full text-center shadow-2xl border-t-4 border-black">
            <h2 className="text-sm font-bold uppercase mb-2">Delete</h2>
            <p className="text-[10px] text-gray-500 mb-8 uppercase">Confirm to delete "{itemToDelete?.title}"?</p>
            <div className="flex gap-3"><button onClick={() => setShowDeleteModal(false)} className="flex-1 border py-3 text-[10px] uppercase font-bold">Cancel</button><button onClick={confirmDelete} className="flex-1 bg-black text-white py-3 text-[10px] uppercase font-bold">Confirm</button></div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl border-t-4 border-black">
            <h2 className="text-sm font-bold tracking-widest uppercase mb-6 text-center">Edit Artwork</h2>
            <form onSubmit={handleUpdateArtwork} className="space-y-6">
              <input type="text" value={itemToEdit.title} className="w-full border-b py-2 text-sm outline-none" onChange={e => setItemToEdit({...itemToEdit, title: e.target.value})} />
              <input type="number" value={itemToEdit.price} className="w-full border-b py-2 text-sm outline-none" onChange={e => setItemToEdit({...itemToEdit, price: e.target.value})} />
              <input type="number" value={itemToEdit.stock} className="w-full border-b py-2 text-sm outline-none" onChange={e => setItemToEdit({...itemToEdit, stock: e.target.value})} />
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowEditModal(false)} className="flex-1 border py-3 text-[10px] uppercase font-bold">Cancel</button><button type="submit" className="flex-1 bg-black text-white py-3 text-[10px] uppercase font-bold">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 backdrop-blur-sm">
          <div className="bg-white p-10 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-sm font-bold uppercase mb-6 border-b pb-4 tracking-widest">Payment</h2>
            <div className="space-y-3 mb-8 text-left">{['Credit Card', 'Thai QR Payment', 'PayPal'].map(method => (<label key={method} className="flex items-center gap-3 p-4 border cursor-pointer hover:bg-gray-50 transition-all"><input type="radio" name="pay" onChange={() => setPaymentMethod(method)} className="accent-black" /><span className="text-[11px] uppercase tracking-wider">{method}</span></label>))}</div>
            <div className="flex gap-2"><button onClick={() => setShowPaymentModal(false)} className="flex-1 border py-3 text-[10px] uppercase font-bold">Cancel</button><button onClick={confirmPayment} className="flex-1 bg-black text-white py-3 text-[10px] uppercase font-bold tracking-widest">Confirm</button></div>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 animate-fadeIn" onClick={() => setIsSuccess(false)}>
          <div className="bg-white p-16 text-center max-w-md w-full shadow-2xl relative"><div className="text-6xl mb-6">✨</div><h2 className="text-2xl tracking-widest uppercase mb-4 font-light">Success</h2><button onClick={() => {setIsSuccess(false); setCurrentView('profile');}} className="bg-black text-white px-10 py-4 text-[10px] uppercase font-bold tracking-widest">View Collection</button></div>
        </div>
      )}
    </div>
  );
}

export default App;