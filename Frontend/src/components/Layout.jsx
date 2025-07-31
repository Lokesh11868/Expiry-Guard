
import { useState } from 'react';
import { setNotificationsOn as setNotificationsOnBackend, setSchedulerTime } from '../services/notificationService';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Home, Plus, BarChart3, User, ChevronDown, LogOut, Menu } from 'lucide-react';

// Helper: Navigation Links
const NavLinks = ({ navigation, location, onClick }) => (
  <>
    {navigation.map(({ name, href, icon: Icon }) => (
      <Link
        key={name}
        to={href}
        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
          location.pathname === href
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
        <span>{name}</span>
      </Link>
    ))}
  </>
);

// Helper: Profile Details
const ProfileDetails = ({ user, notificationsOn, handleToggleNotifications, hour, minute, handleSchedulerTimeChange, logout }) => (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700">Username</label>
      <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{user?.username}</p>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Email Address</label>
      <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{user?.email}</p>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <span className="font-medium text-sm">Notifications:</span>
      <button
        onClick={handleToggleNotifications}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${notificationsOn ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
      >
        {notificationsOn ? 'On' : 'Off'}
      </button>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <span className="font-medium text-sm">Email Time:</span>
      <input
        type="number"
        name="hour"
        min="0"
        max="23"
        value={hour}
        onChange={handleSchedulerTimeChange}
        className="w-12 px-2 py-1 border rounded text-sm"
      />
      <span>:</span>
      <input
        type="number"
        name="minute"
        min="0"
        max="59"
        value={minute}
        onChange={handleSchedulerTimeChange}
        className="w-12 px-2 py-1 border rounded text-sm"
      />
    </div>
    <div className="pt-2 border-t">
      <button
        onClick={logout}
        className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  </>
);

const Layout = () => {
  const { user, logout } = useAuth();
  const [notificationsOn, setNotificationsOn] = useState(() => {
    const stored = localStorage.getItem('expiryNotifier_notificationsOn');
    return stored === null ? true : stored === 'true';
  });
  const handleToggleNotifications = async () => {
    const newValue = !notificationsOn;
    setNotificationsOn(newValue);
    localStorage.setItem('expiryNotifier_notificationsOn', newValue);
    setNotificationsOnBackend(newValue).catch(() => {});
  };
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const handleSchedulerTimeChange = async (e) => {
    const { name, value } = e.target;
    let newHour = hour, newMinute = minute;
    if (name === 'hour') newHour = value === '' ? '' : Math.max(0, Math.min(23, parseInt(value)));
    if (name === 'minute') newMinute = value === '' ? '' : Math.max(0, Math.min(59, parseInt(value)));
    setHour(newHour);
    setMinute(newMinute);
    if (newHour !== '' && newMinute !== '' && !isNaN(newHour) && !isNaN(newMinute)) {
      try {
        await setSchedulerTime(newHour, newMinute);
      } catch {}
    }
  };
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Add Product', href: '/add-product', icon: Plus },
    { name: 'Statistics', href: '/statistics', icon: BarChart3 },
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">ExpiryGuard</span>
              </Link>
              <div className="hidden md:ml-10 md:flex md:space-x-4">
                <NavLinks navigation={navigation} location={location} onClick={() => setMobileNavOpen(false)} />
              </div>
            </div>
            <div className="flex items-center space-x-4 md:hidden">
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">{user?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">Profile Details</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <ProfileDetails
                        user={user}
                        notificationsOn={notificationsOn}
                        handleToggleNotifications={handleToggleNotifications}
                        hour={hour}
                        minute={minute}
                        handleSchedulerTimeChange={handleSchedulerTimeChange}
                        logout={logout}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      {showProfileDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
      )}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-30" onClick={() => setMobileNavOpen(false)}>
          <div
            className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="text-lg font-bold text-gray-900">Menu</span>
              <button onClick={() => setMobileNavOpen(false)} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="flex-1 flex flex-col space-y-2 p-4">
              <NavLinks navigation={navigation} location={location} onClick={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t p-4 space-y-4">
              <ProfileDetails
                user={user}
                notificationsOn={notificationsOn}
                handleToggleNotifications={handleToggleNotifications}
                hour={hour}
                minute={minute}
                handleSchedulerTimeChange={handleSchedulerTimeChange}
                logout={logout}
              />
            </div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto py-6 px-2 sm:px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;