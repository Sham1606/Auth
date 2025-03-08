import { useContext, useState, useEffect, useRef } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from 'react-router-dom';
import { AppContent } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const { userData, backendUrl, setUserData, setIsLoggedin } = useContext(AppContent);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const sendVerificationOtp = async () => {
    try {
      axios.defaults.withCredentials = true;

      const {data} = await axios.post(backendUrl + '/api/auth/send-verify-otp')

      if(data.success) {
        navigate('/email-verify')
        toast.success(data.message)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  const handleLogout = async () => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        setUserData(null);
        setIsLoggedin(false);
        toast.success("Logged out successfully");
        navigate('/');
      } else {
        toast.error(data.message || "Logout failed");
      }
    } catch (error) {
      toast.error(error.message || "Logout failed");
    }
  };

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 absolute top-0">
      <img 
        src={assets.logo} 
        alt="" 
        className="w-28 sm:w-32 cursor-pointer" 
        onClick={() => navigate('/')} 
      />
      
      {userData ? (
        <div className="relative group" ref={dropdownRef}>
          <div 
            className="w-10 h-10 flex justify-center items-center rounded-full bg-black text-white cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 shadow-md"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {userData.name[0].toUpperCase()}
          </div>
          
          <div 
            className={`absolute right-0 top-0 z-10 text-black rounded pt-12 transition-all duration-300 ${dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          >
            <ul className="list-none m-0 p-0 bg-white rounded-lg shadow-lg overflow-hidden min-w-32 border border-gray-200 text-sm">
              <li className="py-2 px-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                <p className="font-medium text-gray-800 truncate">{userData.name}</p>
              </li>
              
              {!userData.isAccountVerified && (
                <li 
                  className="py-2 px-4 hover:bg-blue-50 cursor-pointer transition-colors duration-200 text-blue-600"
                  onClick={sendVerificationOtp}
                >
                  Verify Email
                </li>
              )}
              
              <li 
                className="py-2 px-4 hover:bg-red-50 cursor-pointer transition-colors duration-200 text-red-600"
                onClick={handleLogout}
              >
                Logout
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => navigate('/login')} 
          className="flex items-center gap-2 border border-gray-500 rounded-full px-6 py-2 text-gray-800 hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Login
          <img src={assets.arrow_icon} alt="" />
        </button>
      )}
    </div>
  );
};

export default Navbar;