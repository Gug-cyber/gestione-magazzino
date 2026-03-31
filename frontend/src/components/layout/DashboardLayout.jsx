// frontend/src/components/layout/DashboardLayout.jsx
import React, { useState } from 'react';
import { 
  BarChart3, 
  Package, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  X,
  Home,
  TrendingUp,
  ShoppingCart,
  Warehouse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: true },
    { name: 'Prodotti', href: '/products', icon: Package, current: false },
    { name: 'Magazzino', href: '/inventory', icon: Warehouse, current: false },
    { name: 'Movimenti', href: '/movements', icon: TrendingUp, current: false },
    { name: 'Ordini', href: '/orders', icon: ShoppingCart, current: false },
    { name: 'Clienti', href: '/customers', icon: Users, current: false },
    { name: 'Report', href: '/reports', icon: BarChart3, current: false },
    { name: 'Impostazioni', href: '/settings', icon: Settings, current: false },
  ];

  const stats = [
    { name: 'Prodotti Totali', value: '1,234', change: '+12%', icon: Package },
    { name: 'Stock Basso', value: '23', change: '-5%', icon: Bell },
    { name: 'Movimenti Oggi', value: '156', change: '+18%', icon: TrendingUp },
    { name: 'Valore Stock', value: '€45,678', change: '+8%', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center">
                <Warehouse className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">MagazzinoPro</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    item.current
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col ${sidebarOpen ? '' : 'lg:w-20'}`}>
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <Warehouse className={`h-8 w-8 text-primary-600 ${sidebarOpen ? '' : 'mx-auto'}`} />
              {sidebarOpen && (
                <span className="ml-2 text-xl font-bold text-gray-900">MagazzinoPro</span>
              )}
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    item.current
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={!sidebarOpen ? item.name : ''}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-3">{item.name}</span>}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <div>
                  <img
                    className="inline-block h-9 w-9 rounded-full"
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.username || '')}&background=3b82f6&color=fff`}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                      {user?.role === 'admin' ? 'Amministratore' : 'Operatore'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-1 flex-col ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <button
            type="button"
            className="hidden border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:block"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="flex w-full lg:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    id="search-field"
                    className="block h-full w-full border-transparent py-2 pl-8 pr-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-0 sm:text-sm"
                    placeholder="Cerca prodotti, ordini, clienti..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center lg:ml-6">
              <button
                type="button"
                className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-xs font-medium text-white">
                  3
                </span>
              </button>
              
              {/* User dropdown */}
              <div className="relative ml-3">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    id="user-menu-button"
                  >
                    <img
                      className="h-8 w-8 rounded-full"
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.username || '')}&background=3b82f6&color=fff`}
                      alt=""
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="bg-gray-50 p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
              >
                <dt>
                  <div className="absolute rounded-md bg-primary-500 p-3">
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">{stat.name}</p>
                </dt>
                <dd className="ml-16 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stat.change.startsWith('+') ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    {stat.change}
                  </p>
                </dd>
              </div>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
