import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { updateProfile, changePassword } from '../api/auth';

export function Account() {
  const { user, logout, updateUser, isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profilo');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [formData, setFormData] = useState({
    nome: '', cognome: '', telefono: '', indirizzo: '', citta: '', cap: '', provincia: ''
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        cognome: user.cognome || '',
        telefono: user.telefono || '',
        indirizzo: user.indirizzo || '',
        citta: user.citta || '',
        cap: user.cap || '',
        provincia: user.provincia || '',
      });
    }
  }, [user]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateProfile(formData);
      updateUser(updated);
      setMessage('Profilo aggiornato con successo');
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('La nuova password deve avere almeno 6 caratteri');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage('Password cambiata con successo');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Caricamento...</p></div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Ciao, {user.nome}!
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
          >
            Esci
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg shadow p-1">
          {[
            { id: 'profilo', label: 'Profilo' },
            { id: 'ordini', label: 'I miei ordini', link: '/orders' },
            { id: 'preferiti', label: 'Preferiti', link: '/favorites' },
            { id: 'password', label: 'Cambio Password' },
          ].map(tab => (
            tab.link ? (
              <Link
                key={tab.id}
                to={tab.link}
                className="flex-1 text-center py-2 px-4 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {tab.label}
              </Link>
            ) : (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            )
          ))}
        </div>

        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profilo' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Dati Personali</h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  Modifica
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cognome</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.cognome}
                      onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefono</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Indirizzo</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Città</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.citta}
                      onChange={(e) => setFormData({...formData, citta: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CAP</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.cap}
                        onChange={(e) => setFormData({...formData, cap: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Provincia</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.provincia}
                        onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Nome:</span><p className="font-medium">{user.nome}</p></div>
                <div><span className="text-sm text-gray-500">Cognome:</span><p className="font-medium">{user.cognome}</p></div>
                <div><span className="text-sm text-gray-500">Email:</span><p className="font-medium">{user.email}</p></div>
                <div><span className="text-sm text-gray-500">Telefono:</span><p className="font-medium">{user.telefono || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Indirizzo:</span><p className="font-medium">{user.indirizzo || '-'}</p></div>
                <div><span className="text-sm text-gray-500">Città:</span><p className="font-medium">{user.citta ? `${user.citta} (${user.provincia || ''}) ${user.cap || ''}` : '-'}</p></div>
              </div>
            )}
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Cambio Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700">Password attuale</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nuova password</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Conferma nuova password</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Aggiornamento...' : 'Cambia Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Account;
