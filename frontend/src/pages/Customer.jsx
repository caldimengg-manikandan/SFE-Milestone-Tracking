import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  Eye
} from 'lucide-react';
import CustomerForm from '../components/forms/CustomerForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { customerAPI, API_BASE_URL } from '../services/api';
import { useLabels } from '../context/LabelContext';

const Customer = () => {
  const { L } = useLabels('customer_master');
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [filters, setFilters] = useState({
    customerName: '',
    category: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchCustomers = React.useCallback(async () => {
    try {
      const response = await customerAPI.getCustomerCodes();
      setCustomers(response.data);
      setAllCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      const errorMessage = error.response?.data?.message || 'Error fetching customers. Please try again later.';
      showError(errorMessage);
      setCustomers([]);
      setAllCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const filterCustomers = React.useCallback(() => {
    let filtered = customers;

    // Global Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        (customer.customerName && customer.customerName.toLowerCase().includes(term)) ||
        (customer.customerCode && customer.customerCode.toLowerCase().includes(term)) ||
        (customer.category && customer.category.toLowerCase().includes(term)) ||
        (customer.customerEmail && customer.customerEmail.some(email => email.toLowerCase().includes(term)))
      );
    }

    if (filters.customerName) {
      filtered = filtered.filter(customer => 
        customer.customerName === filters.customerName
      );
    }

    if (filters.category) {
      filtered = filtered.filter(customer => 
        customer.category === filters.category
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, filters, searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    filterCustomers();
    setCurrentPage(1);
  }, [filterCustomers]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      
      // If category changes, reset customerName as the list of available customers will change
      if (key === 'category') {
        newFilters.customerName = '';
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      customerName: '',
      category: ''
    });
    setFilteredCustomers(customers);
  };

  // Export CSV functions
  const exportToCSV = (dataToExport, filename) => {
    const headers = [
      L('customerName', 'Customer Name'), 
      L('category', 'Category'), 
      L('customerCode', 'Customer Code'), 
      L('customerEmail', 'Customer Email'), 
      L('invoiceEmail', 'Invoice Email'), 
      L('billingAddress', 'Billing Address'), 
      L('gstin', 'GSTIN'), 
      L('phoneNumber', 'Phone Number'), 
      'Additional Field 1', 
      'Additional Field 2'
    ];
    const csvData = dataToExport.map(customer => [
      `"${customer.customerName}"`,
      `"${customer.category || ''}"`,
      `"${customer.customerCode}"`,
      `"${customer.customerEmail.join(', ')}"`,
      `"${customer.invoiceEmail.join(', ')}"`,
      `"${customer.billingAddress}"`,
      `"${customer.gstin || ''}"`,
      `"${customer.phoneNumber || ''}"`,
      `"${customer.additionalField1 || ''}"`,
      `"${customer.additionalField2 || ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAllCustomers = () => {
    exportToCSV(allCustomers, 'all_customers.csv');
  };

  const exportFilteredCustomers = () => {
    exportToCSV(filteredCustomers, 'filtered_customers.csv');
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleView = (customer) => {
    setViewingCustomer(customer);
  };

  const handleDelete = async (customer) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerAPI.deleteCustomer(customer._id);
        fetchCustomers();
        showSuccess('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        const errorMessage = error.response?.data?.message || 'Error deleting customer. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingCustomer(null);
    fetchCustomers();
    showSuccess(isEdit ? 'Customer updated successfully' : 'Customer added successfully');
  };

  const uniqueCustomerNames = [...new Set(
    customers
      .filter(c => !filters.category || c.category === filters.category)
      .map(c => c.customerName)
  )].sort();

  const formatEmails = (emails) => {
    if (!emails || !Array.isArray(emails)) return 'No emails';
    return emails.join(', ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }


  return (
    <div className="bg-[#f8fafc] p-8 min-h-screen">
      <div className="max-w-[1600px] mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage customer details and billing information</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
              showFilters || Object.values(filters).some(Boolean) 
                ? 'bg-amber-100 border-amber-200 text-amber-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
            {Object.values(filters).some(Boolean) && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          
          <button
            onClick={exportFilteredCustomers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm} 
              onChange={handleSearchChange} 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400" 
            />
          </div>
          
          <button 
            onClick={() => setShowModal(true)} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">


          {/* Filters */}
          {showFilters && (
            <div className="px-6 py-6 bg-gray-50/30 border-b border-gray-50 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{L('category', 'Category')}</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="block w-full rounded-lg border-0 bg-white shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-accent text-xs py-2 px-3 font-medium"
                  >
                    <option value="">Select Category</option>
                    <option value="Domestic">Domestic</option>
                    <option value="Overseas">Overseas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{L('customerName', 'Customer Name')}</label>
                  <select
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full rounded-lg border-0 bg-white shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-accent text-xs py-2 px-3 font-medium"
                  >
                    <option value="">Select Customer Name</option>
                    {uniqueCustomerNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}


          {/* Customers Table */}
          <div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto h-[calc(100vh-280px)] relative custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-bold text-slate-700 border-r border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100 text-left">
                      {L('customerName', 'Customer Name')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold text-slate-700 border-r border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100 text-left">
                      {L('category', 'Category')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold text-slate-700 border-r border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100 text-left">
                      {L('customerCode', 'Customer Code')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold text-slate-700 border-r border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100 text-left">
                      {L('customerEmail', 'Customer Email')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold text-slate-700 border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap font-bold text-slate-800">
                        {customer.customerName}
                      </td>
                      <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${customer.category === 'Domestic' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                           {customer.category || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap font-mono text-slate-500">
                        {customer.customerCode}
                      </td>
                      <td className="px-3 py-3 border-r border-slate-200">
                        <div className="text-sm text-slate-600 max-w-xs">
                          {Array.isArray(customer.customerEmail) && customer.customerEmail.length > 0 ? (
                            customer.customerEmail.map((email, idx) => (
                              <div key={idx} className="truncate" title={email}>
                                {email}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No emails</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap bg-white/50 group-hover:bg-amber-50/30 backdrop-blur sticky right-0 border-l border-slate-200 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] transition-colors">
                        <div className="flex justify-end items-center gap-1">
                          <button onClick={() => handleView(customer)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(customer)} className="p-1 text-slate-400 hover:text-amber-500 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(customer)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
              {filteredCustomers.map((customer) => (
                <div key={customer._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{customer.customerName}</h3>
                      <p className="text-sm text-gray-500 font-mono truncate">{customer.customerCode}</p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => handleView(customer)}
                        className="text-accent hover:text-accent p-1 transition-colors duration-150"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-accent hover:text-amber-500 p-1 transition-colors duration-150"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Customer Email:</span> {formatEmails(customer.customerEmail)}
                    </div>
                    <div>
                      <span className="font-medium">Invoice Email:</span> {formatEmails(customer.invoiceEmail)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="full"
      >
        <CustomerForm
          customer={editingCustomer}
          onSubmit={() => handleFormSubmit(!!editingCustomer)}
          onCancel={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      </Modal>

      {/* View Customer Modal */}
      {viewingCustomer && (
        <Modal
          isOpen={!!viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          title="Customer Details"
          size="full"
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-4 pb-3 border-b border-gray-100">
              <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-accent to-accent rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 transition-transform duration-300 hover:rotate-0">
                <span className="text-3xl font-bold text-white">
                  {viewingCustomer.customerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent">
                  {viewingCustomer.customerName}
                </h3>
                <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-100 inline-block px-2 py-1 rounded">
                  {viewingCustomer.customerCode}
                </p>
              </div>
            </div>
            
            {/* Customer Basic Details Box */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <h4 className="text-sm font-bold text-accent uppercase tracking-wider">Customer Basic Details</h4>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('category', 'Category')}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewingCustomer.category === 'Domestic' 
                      ? 'bg-accent/20 text-accent' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {viewingCustomer.category || 'Overseas'}
                  </span>
                </div>
                
                {viewingCustomer.category === 'Domestic' ? (
                  <>
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('gstin', 'GSTIN Number')}</span>
                      <p className="text-sm text-gray-900 font-medium">{viewingCustomer.gstin || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">Payment Norms (Days)</span>
                      <p className="text-sm text-gray-900 font-medium">{viewingCustomer.paymentNormsDays !== undefined && viewingCustomer.paymentNormsDays !== null ? viewingCustomer.paymentNormsDays : 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('country', 'Country')}</span>
                      <p className="text-sm text-gray-900 font-medium">{viewingCustomer.country || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('einNumber', 'EIN Number')}</span>
                      <p className="text-sm text-gray-900 font-medium">{viewingCustomer.einNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('bankAccNo', 'Bank Acc No')}</span>
                      <p className="text-sm text-gray-900 font-medium">{viewingCustomer.bankAccNo || 'N/A'}</p>
                    </div>
                    {viewingCustomer.w9Form && (
                      <div className="col-span-1 md:col-span-3">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">W9 Form</span>
                         <a 
                           href={`${API_BASE_URL.replace('/api', '')}/${viewingCustomer.w9Form}`} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-accent hover:text-accent underline text-sm font-medium flex items-center"
                         >
                           <Download className="h-4 w-4 mr-1" />
                           Download/View W9 Form
                         </a>
                      </div>
                    )}
                  </>
                )}

                <div className="col-span-1 md:col-span-3">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('billingAddress', 'Billing Address')}</span>
                  <p className="text-sm text-gray-900 whitespace-pre-line bg-gray-50 p-2 rounded-md border border-gray-100">
                    {viewingCustomer.billingAddress || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information Box */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <h4 className="text-sm font-bold text-accent uppercase tracking-wider">Contact Information</h4>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('customerEmail', 'Customer Email')}</span>
                  <div className="space-y-1">
                    {Array.isArray(viewingCustomer.customerEmail) && viewingCustomer.customerEmail.length > 0 ? (
                      viewingCustomer.customerEmail.map((email, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-900">
                          <span className="w-2 h-2 bg-teal-400 rounded-full mr-2"></span>
                          {email}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No emails provided</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('invoiceEmail', 'Invoice Email')}</span>
                  <div className="space-y-1">
                    {Array.isArray(viewingCustomer.invoiceEmail) && viewingCustomer.invoiceEmail.length > 0 ? (
                      viewingCustomer.invoiceEmail.map((email, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-900">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                          {email}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No emails provided</span>
                    )}
                  </div>
                </div>

                {viewingCustomer.category === 'Domestic' && (
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">{L('phoneNumber', 'Phone Number')}</span>
                    <p className="text-sm text-gray-900 font-medium">{viewingCustomer.phoneNumber || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-5 py-2.5 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  handleEdit(viewingCustomer);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent text-white rounded-lg hover:from-[#1a1b4b] hover:to-[#3b1575] transition-all duration-200 font-medium shadow-md flex items-center"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Customer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default Customer;
