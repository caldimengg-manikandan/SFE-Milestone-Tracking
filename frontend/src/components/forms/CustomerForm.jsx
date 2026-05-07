import React, { useState, useEffect, useRef } from 'react';
import FloatingInput from './FloatingInput';
import { customerAPI } from '../../services/api';
import { useLabels } from '../../context/LabelContext';

const CustomerForm = ({ customer, onSubmit, onCancel }) => {
  const { L } = useLabels('customer_master');
  const COUNTRY_CONFIG = {
    USA: {
      code: '1',
      format: (d) => {
        if (d.length <= 3) return `(${d}`;
        if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
        return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
      },
      maxLength: 10
    },
    Canada: {
      code: '1',
      format: (d) => {
        if (d.length <= 3) return `(${d}`;
        if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
        return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
      },
      maxLength: 10
    },
    India: {
      code: '91',
      format: (d) => {
        if (d.length <= 5) return `${d}`;
        return `${d.slice(0, 5)} ${d.slice(5, 10)}`;
      },
      maxLength: 10
    },
    UK: { code: '44', format: (d) => `${d}`, maxLength: 10 },
    Australia: { code: '61', format: (d) => `${d}`, maxLength: 9 },
    Dubai: { code: '971', format: (d) => `${d}`, maxLength: 9 }
  };

  const formatPhoneNumberUtil = (value, country) => {
    if (!value) return '';
    const config = COUNTRY_CONFIG[country];
    if (!config) return value.replace(/[^0-9+\-\s()]/g, '');

    let digits = value.replace(/\D/g, '');
    if (digits.startsWith(config.code)) {
      digits = digits.slice(config.code.length);
    }

    if (digits.length === 0) {
      return `+${config.code} `;
    }

    if (digits.length > config.maxLength) {
      digits = digits.slice(0, config.maxLength);
    }

    const formatted = config.format(digits);
    return `+${config.code} ${formatted}`.trim();
  };

  const getDefaultPhonePrefix = (country = 'India') => {
    const config = COUNTRY_CONFIG[country];
    return config ? `+${config.code} ` : '';
  };

  const [formData, setFormData] = useState({
    customerName: '',
    customerCode: '',
    invoiceEmail: '',
    billingAddress: '',
    category: 'Domestic',
    gstin: '',
    paymentNormsDays: '',
    additionalField1: '',
    additionalField2: '',
    country: 'India',
    einNumber: '',
    bankAccNo: '',
    contactPersons: [{ name: '', email: '', phone: getDefaultPhonePrefix('India'), isDefault: true }]
  });
  const [w9File, setW9File] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceEmails, setInvoiceEmails] = useState([]);
  const [newInvoiceEmail, setNewInvoiceEmail] = useState('');
  const prevCategoryRef = useRef(null);
  const lastOverseasCountryRef = useRef('');
  const prevCountryRef = useRef('India');

  useEffect(() => {
    if (customer) {
      const invoiceEmailArray = Array.isArray(customer.invoiceEmail) 
        ? customer.invoiceEmail 
        : customer.invoiceEmail ? [customer.invoiceEmail] : [];

      const loadedCategory = customer.category || 'Domestic';
      const loadedCountry = loadedCategory === 'Domestic'
        ? 'India'
        : (customer.country || '');

      const existingContacts = Array.isArray(customer.contactPersons) ? customer.contactPersons : [];
      const normalizedContacts = existingContacts.length > 0
        ? existingContacts.map((cp) => ({
          name: cp?.name || '',
          email: cp?.email || '',
          phone: cp?.phone ? formatPhoneNumberUtil(cp.phone, loadedCountry || 'India') : getDefaultPhonePrefix(loadedCountry || 'India'),
          isDefault: Boolean(cp?.isDefault)
        }))
        : [];

      const legacyEmails = Array.isArray(customer.customerEmail)
        ? customer.customerEmail
        : customer.customerEmail ? [customer.customerEmail] : [];
      const legacyDefaultEmail = customer.defaultCustomerEmail || legacyEmails[0] || '';
      const hasDefaultInContacts = normalizedContacts.some((cp) => cp.isDefault);

      const fallbackContacts = normalizedContacts.length > 0
        ? normalizedContacts.map((cp, idx) => ({ ...cp, isDefault: hasDefaultInContacts ? cp.isDefault : idx === 0 }))
        : (legacyDefaultEmail || customer.phoneNumber || customer.customerProjectManager)
          ? [
            {
              name: customer.customerProjectManager || '',
              email: legacyDefaultEmail || '',
              phone: customer.phoneNumber ? formatPhoneNumberUtil(customer.phoneNumber, loadedCountry || 'India') : getDefaultPhonePrefix(loadedCountry || 'India'),
              isDefault: true
            },
            ...legacyEmails
              .filter((e) => e && e !== legacyDefaultEmail)
              .map((email) => ({ name: '', email, phone: getDefaultPhonePrefix(loadedCountry || 'India'), isDefault: false }))
          ]
          : [{ name: '', email: '', phone: getDefaultPhonePrefix(loadedCountry || 'India'), isDefault: true }];

      prevCategoryRef.current = loadedCategory;
      prevCountryRef.current = loadedCountry || 'India';
      if (loadedCategory === 'Overseas') {
        lastOverseasCountryRef.current = loadedCountry || '';
      }

      setFormData({
        customerName: customer.customerName || '',
        customerCode: customer.customerCode || '',
        invoiceEmail: invoiceEmailArray.join(', '),
        billingAddress: customer.billingAddress || '',
        category: loadedCategory,
        gstin: customer.gstin || '',
        paymentNormsDays: customer.paymentNormsDays === 0 || customer.paymentNormsDays ? String(customer.paymentNormsDays) : '',
        additionalField1: customer.additionalField1 || '',
        additionalField2: customer.additionalField2 || '',
        country: loadedCountry,
        einNumber: customer.einNumber || '',
        bankAccNo: customer.bankAccNo || '',
        contactPersons: fallbackContacts
      });
      
      setInvoiceEmails(invoiceEmailArray);
    }
  }, [customer]);

  useEffect(() => {
    if (prevCategoryRef.current === null) {
      prevCategoryRef.current = formData.category;
      if (formData.category === 'Overseas') {
        lastOverseasCountryRef.current = formData.country || '';
      }
      return;
    }

    const prevCategory = prevCategoryRef.current;
    const nextCategory = formData.category;
    if (prevCategory === nextCategory) return;

    if (prevCategory === 'Overseas' && formData.country) {
      lastOverseasCountryRef.current = formData.country;
    }

    if (nextCategory !== 'Overseas') {
      setFormData((prev) => ({ ...prev, country: 'India' }));
      setErrors((prev) => ({ ...prev, country: '' }));
    } else {
      setFormData((prev) => ({ ...prev, country: lastOverseasCountryRef.current || '' }));
      setErrors((prev) => ({ ...prev, country: '' }));
    }

    prevCategoryRef.current = nextCategory;
  }, [formData.category, formData.country]);

  useEffect(() => {
    if (formData.category === 'Overseas') {
      lastOverseasCountryRef.current = formData.country || '';
    }
  }, [formData.category, formData.country]);

  useEffect(() => {
    if (prevCountryRef.current !== formData.country) {
      const oldConfig = COUNTRY_CONFIG[prevCountryRef.current];
      const newPrefix = getDefaultPhonePrefix(formData.country || 'India');

      setFormData((prev) => ({
        ...prev,
        contactPersons: (Array.isArray(prev.contactPersons) ? prev.contactPersons : []).map((cp) => {
          if (!cp.phone) return { ...cp, phone: newPrefix };

          const oldPrefix = oldConfig ? `+${oldConfig.code} ` : '';
          if (oldPrefix && cp.phone.trim() === oldPrefix.trim()) {
            return { ...cp, phone: newPrefix };
          }

          let digits = cp.phone.replace(/\D/g, '');
          if (oldConfig && digits.startsWith(oldConfig.code)) {
            digits = digits.slice(oldConfig.code.length);
          }

          return { ...cp, phone: formatPhoneNumberUtil(digits, formData.country || 'India') };
        })
      }));

      prevCountryRef.current = formData.country;
    }
  }, [formData.country]);

  // Input validation and restriction functions
  const restrictToTextOnly = (value) => {
    // Allows only letters, spaces, hyphens, apostrophes, and periods
    return value.replace(/[^a-zA-Z\s\-'.]/g, '');
  };

  const restrictToAlphanumeric = (value) => {
    // Allows only letters, numbers, and underscores
    return value.replace(/[^a-zA-Z0-9_]/g, '');
  };

  const restrictEmailInput = (value) => {
    // Allows email-friendly characters
    return value.replace(/[^\w@.\-+]/g, '');
  };

  const restrictAddressInput = (value) => {
    // Allows alphanumeric, spaces, and common address characters
    return value.replace(/[^\w\s\-\.,#&()/@]/g, '');
  };

  const validateForm = (currentInvoiceEmails = invoiceEmails) => {
    const newErrors = {};

    if (!formData.category) {
      newErrors.category = 'Customer category is required';
    }

    // Customer Name validation (Optional)
    if (formData.customerName.trim() && formData.customerName.trim().length < 2) {
      newErrors.customerName = 'Customer Name must be at least 2 characters long';
    }

    // Customer Code validation (Optional)
    if (formData.customerCode.trim()) {
      if (formData.customerCode.trim().length < 2) {
        newErrors.customerCode = 'Customer Code must be at least 2 characters long';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.customerCode)) {
        newErrors.customerCode = 'Customer Code can only contain letters, numbers, and underscores';
      }
    }

    const contacts = Array.isArray(formData.contactPersons) ? formData.contactPersons : [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    contacts.forEach((cp, index) => {
      const email = String(cp?.email || '').trim();
      const phone = String(cp?.phone || '').trim();
      if (email && !emailRegex.test(email)) {
        newErrors[`contactPersons_${index}_email`] = 'Please enter a valid email address';
      }
      if (phone) {
        const countryKey = formData.country || 'India';
        const config = COUNTRY_CONFIG[countryKey];

        if (config) {
          let digits = phone.replace(/\D/g, '');
          if (digits.startsWith(config.code)) {
            digits = digits.slice(config.code.length);
          }
          if (digits.length === 0) return;
          if (digits.length !== config.maxLength) {
            newErrors[`contactPersons_${index}_phone`] = `Phone number must be ${config.maxLength} digits`;
          }
        } else if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
          newErrors[`contactPersons_${index}_phone`] = 'Please provide a valid phone number (7-20 digits)';
        }
      }
    });
    const defaultCount = contacts.filter((cp) => cp?.isDefault).length;
    if (contacts.length > 0 && defaultCount !== 1) {
      newErrors.contactPersons = 'Please select exactly one default contact';
    }

    // Invoice Email validation
    if (currentInvoiceEmails.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of currentInvoiceEmails) {
        if (!emailRegex.test(email)) {
          newErrors.invoiceEmail = `"${email}" is not a valid email address`;
          break;
        }
      }
    }

    // Billing Address validation (Optional)
    if (formData.billingAddress.trim() && formData.billingAddress.trim().length < 10) {
      newErrors.billingAddress = 'Billing Address must be at least 10 characters long';
    }

    if (String(formData.paymentNormsDays || '').trim()) {
      const raw = String(formData.paymentNormsDays).trim();
      if (!/^\d+$/.test(raw)) {
        newErrors.paymentNormsDays = 'Payment norms (days) must be a non-negative integer';
      }
    }

    // Overseas validation
    if (formData.category === 'Overseas') {
      if (!formData.country) {
        newErrors.country = 'Country is required';
      }
      // Country is optional now
      if (formData.einNumber && !/^[a-zA-Z0-9_]+$/.test(formData.einNumber)) {
        newErrors.einNumber = 'EIN Number must be alphanumeric';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalInvoiceEmails = [...invoiceEmails];
    if (newInvoiceEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(newInvoiceEmail.trim())) {
        if (!finalInvoiceEmails.includes(newInvoiceEmail.trim())) {
          finalInvoiceEmails.push(newInvoiceEmail.trim());
        }
      } else {
        setErrors(prev => ({ ...prev, invoiceEmail: 'Please add or clear the invalid email in the input field' }));
        return;
      }
    }

    if (!validateForm(finalInvoiceEmails)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('customerName', formData.customerName);
      formDataToSend.append('customerCode', formData.customerCode);
      formDataToSend.append('billingAddress', formData.billingAddress);
      formDataToSend.append('category', formData.category);

      const contacts = Array.isArray(formData.contactPersons)
        ? formData.contactPersons
        : [];
      let cleanedContacts = contacts.map((cp) => ({
        name: String(cp?.name || '').trim(),
        email: String(cp?.email || '').trim(),
        phone: String(cp?.phone || '').trim(),
        isDefault: Boolean(cp?.isDefault)
      }));
      if (cleanedContacts.length === 0) {
        cleanedContacts = [{ name: '', email: '', phone: getDefaultPhonePrefix(), isDefault: true }];
      }
      if (!cleanedContacts.some((cp) => cp.isDefault)) {
        cleanedContacts[0] = { ...cleanedContacts[0], isDefault: true };
      }

      const defaultContact = cleanedContacts.find((cp) => cp.isDefault) || cleanedContacts[0];
      const derivedProjectManager = defaultContact?.name || '';
      const derivedPhone = defaultContact?.phone || '';
      const derivedDefaultEmail = defaultContact?.email || cleanedContacts.find((cp) => cp.email)?.email || '';
      const derivedEmails = Array.from(new Set(cleanedContacts.map((cp) => cp.email).filter(Boolean)));

      formDataToSend.append('contactPersons', JSON.stringify(cleanedContacts));
      formDataToSend.append('customerProjectManager', derivedProjectManager);
      formDataToSend.append('phoneNumber', derivedPhone);
      formDataToSend.append('defaultCustomerEmail', derivedDefaultEmail);
      derivedEmails.forEach((email) => formDataToSend.append('customerEmail', email));
      finalInvoiceEmails.forEach(email => formDataToSend.append('invoiceEmail', email));

      formDataToSend.append('paymentNormsDays', formData.paymentNormsDays != null ? String(formData.paymentNormsDays).trim() : '');

      if (formData.category === 'Domestic') {
        formDataToSend.append('gstin', formData.gstin);
      } else if (formData.category === 'Overseas') {
        formDataToSend.append('country', formData.country);
        formDataToSend.append('einNumber', formData.einNumber);
        formDataToSend.append('bankAccNo', formData.bankAccNo);
        if (w9File) {
          formDataToSend.append('w9Form', w9File);
        }
      }

      if (customer && customer._id) {
        await customerAPI.updateCustomer(customer._id, formDataToSend);
      } else {
        await customerAPI.createCustomer(formDataToSend);
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.message || 'Failed to save customer. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    let processedValue = value;

    // Apply input restrictions based on field type
    switch (field) {
      case 'customerName':
        // Allow text, numbers and special characters
        processedValue = value;
        break;
      case 'customerCode':
        processedValue = restrictToAlphanumeric(value);
        break;
      case 'billingAddress':
        processedValue = restrictAddressInput(value);
        break;
      case 'einNumber':
        processedValue = restrictToAlphanumeric(value);
        break;
      case 'paymentNormsDays':
        processedValue = String(value || '').replace(/[^\d]/g, '');
        break;
      default:
        processedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Prevent form submission on Enter key press in input fields
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault();
    }
  };

  const setDefaultContactPerson = (index) => {
    setFormData(prev => ({
      ...prev,
      contactPersons: (Array.isArray(prev.contactPersons) ? prev.contactPersons : []).map((cp, i) => ({
        ...cp,
        isDefault: i === index
      }))
    }));
    if (errors.contactPersons) {
      setErrors(prev => ({ ...prev, contactPersons: '' }));
    }
  };

  const handleContactChange = (index, field, value) => {
    setFormData(prev => {
      const next = Array.isArray(prev.contactPersons) ? [...prev.contactPersons] : [];
      const existing = next[index] || { name: '', email: '', phone: getDefaultPhonePrefix(formData.country || 'India'), isDefault: false };
      let processedValue = value;
      if (field === 'email') processedValue = restrictEmailInput(value);
      if (field === 'phone') processedValue = formatPhoneNumberUtil(value, formData.country || 'India');
      next[index] = { ...existing, [field]: processedValue };
      if (!next.some((cp) => cp.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return { ...prev, contactPersons: next };
    });
    const key = `contactPersons_${index}_${field}`;
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const addContactPerson = () => {
    setFormData(prev => ({
      ...prev,
      contactPersons: [
        ...(Array.isArray(prev.contactPersons) ? prev.contactPersons : []),
        { name: '', email: '', phone: getDefaultPhonePrefix(formData.country || 'India'), isDefault: false }
      ]
    }));
  };

  const removeContactPerson = (index) => {
    setFormData(prev => {
      const current = Array.isArray(prev.contactPersons) ? prev.contactPersons : [];
      const removedWasDefault = Boolean(current[index]?.isDefault);
      const next = current.filter((_, i) => i !== index);
      if (next.length === 0) {
        return { ...prev, contactPersons: [{ name: '', email: '', phone: getDefaultPhonePrefix(formData.country || 'India'), isDefault: true }] };
      }
      if (removedWasDefault && !next.some((cp) => cp.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return { ...prev, contactPersons: next };
    });
  };

  // Invoice Email functions
  const addInvoiceEmail = () => {
    const email = newInvoiceEmail.trim();
    if (email && !invoiceEmails.includes(email)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        setInvoiceEmails(prev => [...prev, email]);
        setNewInvoiceEmail('');
        // Clear invoice email error when adding valid email
        if (errors.invoiceEmail) {
          setErrors(prev => ({ ...prev, invoiceEmail: '' }));
        }
      } else {
        setErrors(prev => ({ ...prev, invoiceEmail: 'Please enter a valid email address' }));
      }
    }
  };

  const removeInvoiceEmail = (emailToRemove) => {
    setInvoiceEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  const handleInvoiceEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvoiceEmail();
    }
  };

  const handleNewInvoiceEmailChange = (value) => {
    const processedValue = restrictEmailInput(value);
    setNewInvoiceEmail(processedValue);
    if (errors.invoiceEmail) {
      setErrors(prev => ({ ...prev, invoiceEmail: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{errors.submit}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <FloatingInput
            label={L('category', 'Category')}
            name="category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            error={errors.category}
            type="select"
            allowEmptyOption={true}
            options={[
              { value: '', label: 'Select Category' },
              { value: 'Domestic', label: 'Domestic' },
              { value: 'Overseas', label: 'Overseas' }
            ]}
          />
        </div>

        <div className="md:col-span-1">
          <FloatingInput
            label={L('country', 'Country')}
            name="country"
            type="select"
            value={formData.category === 'Overseas' ? formData.country : 'India'}
            onChange={(e) => handleChange('country', e.target.value)}
            error={errors.country}
            required={formData.category === 'Overseas'}
            disabled={formData.category !== 'Overseas'}
            options={
              formData.category === 'Overseas'
                ? [
                    { value: '', label: 'Select Country' },
                    { value: 'USA', label: 'USA' },
                    { value: 'UK', label: 'UK' },
                    { value: 'Australia', label: 'Australia' },
                    { value: 'Canada', label: 'Canada' },
                    { value: 'Dubai', label: 'Dubai' }
                  ]
                : [{ value: 'India', label: 'India' }]
            }
          />
        </div>

        <div className="md:col-span-1">
          <FloatingInput
            label={L('customerName', 'Customer Name')}
            name="customerName"
            value={formData.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            error={errors.customerName}
            maxLength={100}
          />
        </div>

        <div className="md:col-span-1">
          <FloatingInput
            label={L('customerCode', 'Customer Code')}
            name="customerCode"
            value={formData.customerCode}
            onChange={(e) => handleChange('customerCode', e.target.value)}
            error={errors.customerCode}
            maxLength={50}
          />
        </div>

        <div className="md:col-span-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Contact Persons</span>
              <button
                type="button"
                onClick={addContactPerson}
                className="px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-md hover:bg-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors duration-200"
              >
                Add Contact
              </button>
            </div>

            {errors.contactPersons && (
              <p className="text-xs text-red-600">{errors.contactPersons}</p>
            )}

            {(Array.isArray(formData.contactPersons) ? formData.contactPersons : []).map((cp, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <FloatingInput
                  label="Contact Person"
                  name={`contactPersonName_${index}`}
                  value={cp.name}
                  onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  maxLength={100}
                />
                <FloatingInput
                  label="Contact Email"
                  name={`contactPersonEmail_${index}`}
                  value={cp.email}
                  onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                  error={errors[`contactPersons_${index}_email`]}
                  type="email"
                />
                <div className="flex items-start gap-2">
                  <div className="flex-grow">
                    <FloatingInput
                      label="Contact Phone"
                      name={`contactPersonPhone_${index}`}
                      value={cp.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      error={errors[`contactPersons_${index}_phone`]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setDefaultContactPerson(index)}
                    className={`mt-1 px-2 py-2 text-sm font-medium rounded-md border h-10 ${
                      cp.isDefault ? 'bg-accent text-white border-accent' : 'bg-white text-accent border-accent/30'
                    }`}
                    title="Set as default"
                  >
                    D
                  </button>
                  {(Array.isArray(formData.contactPersons) ? formData.contactPersons : []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContactPerson(index)}
                      className="mt-1 px-2 py-2 text-sm font-medium text-accent bg-white rounded-md border border-accent/30 hover:bg-accent/5 h-10"
                      title="Remove contact"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GSTIN and Payment Norms moved to sit next to Invoice Email */}
        {formData.category === 'Domestic' && (
          <>
            <div className="md:col-span-1">
              <FloatingInput
                label={L('gstin', 'GSTIN Number')}
                name="gstin"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                error={errors.gstin}
              />
            </div>
            <div className="md:col-span-1">
              <FloatingInput
                label="Payment norms (days)"
                name="paymentNormsDays"
                type="number"
                min="0"
                value={formData.paymentNormsDays}
                onChange={(e) => handleChange('paymentNormsDays', e.target.value)}
                onWheel={(e) => e.target.blur()}
                error={errors.paymentNormsDays}
              />
            </div>
          </>
        )}

        {formData.category === 'Overseas' && (
          <>
            <div className="md:col-span-1">
              <FloatingInput
                label={L('einNumber', 'EIN Number')}
                name="einNumber"
                value={formData.einNumber}
                onChange={(e) => handleChange('einNumber', e.target.value)}
                error={errors.einNumber}
              />
            </div>
            <div className="md:col-span-1">
               <div className="relative border border-gray-300 rounded-md p-1 h-10 flex items-center">
                 <label className="absolute -top-2 left-2 -mt-px inline-block px-1 bg-white text-xs font-medium text-gray-700">
                   W9 Form (Upload)
                 </label>
                 <input
                   type="file"
                   onChange={(e) => setW9File(e.target.files[0])}
                   className="block w-full text-xs text-gray-500
                     file:mr-2 file:py-1 file:px-2
                     file:rounded-md file:border-0
                     file:text-xs file:font-semibold
                     file:bg-accent file:text-white
                     hover:file:bg-[#1a1b4b]"
                   accept=".pdf,image/*"
                 />
               </div>
               {customer && customer.w9Form && !w9File && (
                  <p className="mt-1 text-xs text-gray-500">Current file: {customer.w9Form.split(/[\\/]/).pop()}</p>
               )}
            </div>
            <div className="md:col-span-1">
              <FloatingInput
                label={L('bankAccNo', 'Bank Acc No')}
                name="bankAccNo"
                value={formData.bankAccNo}
                onChange={(e) => handleChange('bankAccNo', e.target.value)}
                error={errors.bankAccNo}
              />
            </div>
          </>
        )}

        {/* Invoice Email with add/remove functionality */}
        <div className="md:col-span-1 space-y-2">
          <div className="flex space-x-2 items-start">
            <div className="flex-grow">
              <FloatingInput
                label={L('invoiceEmail', 'Invoice Email')}
                name="newInvoiceEmail"
                value={newInvoiceEmail}
                onChange={(e) => handleNewInvoiceEmailChange(e.target.value)}
                onKeyDown={handleInvoiceEmailKeyDown}
                error={errors.invoiceEmail}
                type="email"
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                addInvoiceEmail();
              }}
              className="mt-1 px-3 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors duration-200 h-10 flex items-center justify-center"
            >
              Add
            </button>
          </div>
          
          {/* Invoice Email Tags */}
          {invoiceEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {invoiceEmails.map((email, index) => (
                <div key={index} className="inline-flex items-center bg-accent bg-opacity-10 text-accent text-xs px-2 py-1 rounded border border-accent border-opacity-20">
                  <span className="truncate max-w-[150px]">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeInvoiceEmail(email)}
                    className="ml-1 text-accent hover:text-accent focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>



        <div className="md:col-span-4">
          <FloatingInput
            label="Billing Address"
            name="billingAddress"
            value={formData.billingAddress}
            onChange={(e) => handleChange('billingAddress', e.target.value)}
            error={errors.billingAddress}
            type="textarea"
            rows={4}
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-md shadow-sm hover:bg-[#1a1b4b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{customer ? 'Update Customer' : 'Add Customer'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
