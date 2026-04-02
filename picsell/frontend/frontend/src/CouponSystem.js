import React from 'react';

const CouponSystem = ({ couponCode, setCouponCode, applyCoupon, appliedCoupon, discount }) => {
  return (
    <div className="border-t pt-4 mb-4 animate-fadeIn">
      <p className="text-[9px] font-bold uppercase mb-2 tracking-[0.2em] text-gray-400">Have a Promo Code?</p>
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="ENTER CODE" 
          className="flex-1 border-b border-gray-200 p-2 text-[10px] outline-none bg-transparent focus:border-black transition-colors"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
        <button 
          onClick={applyCoupon}
          className="bg-black text-white px-5 py-2 text-[8px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Apply
        </button>
      </div>
      
      {appliedCoupon && (
        <div className="flex justify-between items-center mt-3 p-3 bg-green-50 border border-green-100 rounded-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-[10px]">✓</span>
            <p className="text-[9px] text-green-600 uppercase font-bold tracking-wider">
              Code: {appliedCoupon}
            </p>
          </div>
          <p className="text-[10px] text-green-600 font-bold">-฿{discount.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default CouponSystem;