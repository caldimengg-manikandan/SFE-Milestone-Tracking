import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, X, Phone, User as UserIcon, Loader2, ChevronDown, Eye } from 'lucide-react';
import { customerAPI } from '../services/api';

export default function CustomerMaster() {
  const [customers, setCustomers] = useState([]);
  const [nameFilter, setNameFilter] = useState('All');
  const [codeFilter, setCodeFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const [form, setForm] = useState({
    country: 'India',
    name: '',
    code: '',
    street: '',
    state: '',
    address: '',
    designation: '',
    contacts: [{ person: '', email: '', phone: '+91 ' }]
  });

  const countryCodeMap = {
    'India': '+91 ',
    'USA': '+1 ',
    'UK': '+44 ',
    'UAE': '+971 ',
    'Other': ''
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    const oldCode = countryCodeMap[form.country] || '';
    const newCode = countryCodeMap[newCountry] || '';

    const newContacts = form.contacts.map(contact => {
      let phone = contact.phone || '';
      if (oldCode && phone.startsWith(oldCode)) {
        phone = phone.replace(oldCode, newCode);
      } else if (!phone && newCode) {
        phone = newCode;
      }
      return { ...contact, phone };
    });

    setForm({ ...form, country: newCountry, contacts: newContacts });
  };

  const openAdd = () => {
    setEditId(null);
    setIsViewMode(false);
    setForm({
      country: 'India',
      name: '',
      code: '',
      street: '',
      state: '',
      address: '',
      designation: '',
      contacts: [{ person: '', email: '', phone: '+91 ' }]
    });
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditId(customer.id);
    setIsViewMode(false);
    setForm({
      ...customer,
      contacts: customer.contacts.length ? [...customer.contacts] : [{ person: '', email: '', phone: '+91 ' }]
    });
    setShowModal(true);
  };

  const openView = (customer) => {
    openEdit(customer);
    setIsViewMode(true);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getAll();
      setCustomers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerAPI.delete(id);
        fetchCustomers();
      } catch (err) {
        alert('Failed to delete customer');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await customerAPI.update(editId, form);
      } else {
        await customerAPI.create(form);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      alert('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    setForm({
      ...form,
      contacts: [...form.contacts, { person: '', email: '', phone: '+91 ' }]
    });
  };

  const updateContact = (index, field, value) => {
    const newContacts = [...form.contacts];
    newContacts[index][field] = value;
    setForm({ ...form, contacts: newContacts });
  };

  const removeContact = (index) => {
    const newContacts = form.contacts.filter((_, i) => i !== index);
    setForm({ ...form, contacts: newContacts });
  };

  const filtered = customers.filter((c) => {
    const matchName = nameFilter === 'All' || (c.name && c.name.toLowerCase().trim() === nameFilter.toLowerCase().trim());
    const matchCode = codeFilter === 'All' || (c.code && c.code.toLowerCase().trim() === codeFilter.toLowerCase().trim());
    const matchCountry = countryFilter === 'All' || (c.country && c.country.toLowerCase().trim() === countryFilter.toLowerCase().trim());
    return matchName && matchCode && matchCountry;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Name Filter */}
        <div className="relative">
          <select
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Customers</option>
            {[...new Set(customers.map(c => c.name))].filter(Boolean).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Code Filter */}
        <div className="relative">
          <select
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Codes</option>
            {[...new Set(customers.map(c => c.code))].filter(Boolean).map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Country Filter */}
        <div className="relative">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Countries</option>
            {['India', 'USA', 'UK', 'UAE', 'Other'].map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50/50">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Code</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Country</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Contact Person</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Phone</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                    <p className="text-xs font-bold text-slate-400">Loading records...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first customer to get started</p>
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xs font-black text-amber-700 shadow-inner group-hover:scale-110 transition-transform">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <p className="font-bold text-slate-900">{customer.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-black text-amber-600 uppercase tracking-widest">{customer.code}</p>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <div className="text-xs font-bold text-slate-700">{customer.country}</div>
                    </td>
                    <td className="px-6 py-5 hidden xl:table-cell">
                      {customer.contacts[0] ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600"><UserIcon className="w-3 h-3 text-slate-400" /> {customer.contacts[0].person}</div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No contacts</span>
                      )}
                    </td>
                    <td className="px-6 py-5 hidden xl:table-cell">
                      {customer.contacts[0] ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono"><Phone className="w-3 h-3 text-slate-400" /> {customer.contacts[0].phone}</div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(customer)} className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(customer)} className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(customer.id)} className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">{isViewMode ? 'View Customer' : editId ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/50">

              {/* Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Name <span className="text-red-500">*</span></label>
                  <input
                    required
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="Enter customer name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Code</label>
                  <input
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="Customer Code"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country</label>
                  <select
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    value={form.country}
                    onChange={handleCountryChange}
                  >
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="UAE">UAE</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Street</label>
                  <input
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="Street"
                    value={form.street}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State</label>
                  <input
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="State"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</label>
                  <input
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="Address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                  <input
                    disabled={isViewMode}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50"
                    placeholder="Designation"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Persons */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Contact Persons</h4>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={addContact}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md hover:bg-slate-800 transition-colors"
                    >
                      Add Contact
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {form.contacts.map((contact, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1 w-full space-y-1.5">
                        {index === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Person</label>}
                        <input
                          disabled={isViewMode}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none disabled:opacity-75 disabled:bg-slate-50"
                          placeholder="Contact Person Name"
                          value={contact.person}
                          onChange={e => updateContact(index, 'person', e.target.value)}
                        />
                      </div>

                      <div className="flex-1 w-full space-y-1.5">
                        {index === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Email</label>}
                        <input
                          type="email"
                          disabled={isViewMode}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none disabled:opacity-75 disabled:bg-slate-50"
                          placeholder="Email Address"
                          value={contact.email}
                          onChange={e => updateContact(index, 'email', e.target.value)}
                        />
                      </div>

                      <div className="flex-1 w-full space-y-1.5">
                        {index === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Phone</label>}
                        <div className="relative">
                          <input
                            disabled={isViewMode}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none disabled:opacity-75 disabled:bg-slate-50"
                            placeholder="+91 "
                            value={contact.phone}
                            onChange={e => updateContact(index, 'phone', e.target.value)}
                          />
                        </div>
                      </div>

                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          disabled={form.contacts.length === 1}
                          className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
              {!isViewMode && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
