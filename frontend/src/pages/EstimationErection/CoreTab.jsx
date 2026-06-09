import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import { FileText, Users, FileSignature, DollarSign, Eye, List } from "lucide-react";

// Reusable custom select component that allows a write-in fallback
function SelectWithCustom({ label, name, options, value, onChange, disabled }) {
  const [showCustom, setShowCustom] = useState(() => {
    return !!(value && !options.includes(value));
  });

  // Sync custom state with external value changes (such as load or clear)
  useEffect(() => {
    if (value && !options.includes(value)) {
      setShowCustom(true);
    } else if (value && options.includes(value)) {
      setShowCustom(false);
    }
  }, [value, options]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setShowCustom(true);
      onChange({ target: { name, value: "" } });
    } else {
      setShowCustom(false);
      onChange({ target: { name, value: val } });
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative">
        {showCustom ? (
          <div className="relative flex items-center">
            <input
              type="text"
              name={name}
              disabled={disabled}
              placeholder={`Enter custom ${label.toLowerCase()}...`}
              className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
              value={value || ""}
              onChange={onChange}
              autoFocus
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  onChange({ target: { name, value: "" } });
                }}
                className="absolute right-2 p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Back to options list"
              >
                <List size={14} />
              </button>
            )}
          </div>
        ) : (
          <select
            name={`${name}_select`}
            disabled={disabled}
            className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all cursor-pointer"
            value={value || ""}
            onChange={handleSelectChange}
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="__custom__">Other (Custom)...</option>
          </select>
        )}
      </div>
    </div>
  );
}

export default function CoreTab() {
  const { projectId, project, refreshProject } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;
  const lastLoadedIdRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [retainageInput, setRetainageInput] = useState("");

  const isRetainage = (val) => {
    return !!(val && (val.includes("% Retainage") || (val.includes("Retainage") && !val.includes("No Retainage"))));
  };

  const isCustomTerms = (val) => {
    if (!val) return false;
    if (val === "Net 30" || val === "No Retainage") return false;
    if (isRetainage(val)) return false;
    return true;
  };

  const extractRetainagePercentage = (val) => {
    if (!val) return "";
    const match = val.match(/([\d.]+)/);
    return match ? match[1] : "";
  };

  // Local form state
  const [form, setForm] = useState({
    project_name: project?.project_name || "",
    job_number: project?.job_number || "",
    address: project?.address || "",
    project_date: project?.project_date || "",
    salesman: project?.salesman || "",
    pm: project?.pm || "",
    site_foreman: project?.site_foreman || "",
    customer: project?.customer || "",
    architect: project?.architect || "",
    engineer: project?.engineer || "",
    domestic_steel: !!project?.domestic_steel,
    leed_certified: !!project?.leed_certified,
    create_job_budget: !!project?.create_job_budget,
    change_order_number: project?.change_order_number || "",

    site_foreman_phone: project?.site_foreman_phone || "",
    site_foreman_email: project?.site_foreman_email || "",
    site_foreman_fax: project?.site_foreman_fax || "",
    site_foreman_cell: project?.site_foreman_cell || "",

    customer_contact: project?.customer_contact || "",
    customer_phone: project?.customer_phone || "",
    customer_fax: project?.customer_fax || "",
    customer_cell: project?.customer_cell || "",
    customer_email: project?.customer_email || "",

    architect_contact: project?.architect_contact || "",
    architect_phone: project?.architect_phone || "",
    architect_fax: project?.architect_fax || "",
    architect_cell: project?.architect_cell || "",
    architect_email: project?.architect_email || "",

    engineer_contact: project?.engineer_contact || "",
    engineer_phone: project?.engineer_phone || "",
    engineer_fax: project?.engineer_fax || "",
    engineer_cell: project?.engineer_cell || "",
    engineer_email: project?.engineer_email || "",

    scope_of_work: project?.scope_of_work || "",
    type_of_contract: project?.type_of_contract || "",
    terms_of_contract: project?.terms_of_contract || "",
    prevailing_wage: project?.prevailing_wage || "",
    bill_stored_material: project?.bill_stored_material || "",
    bond_required: project?.bond_required || "",
    ocip_required: project?.ocip_required || "",
    billing_pencil_copy: project?.billing_pencil_copy || "",
    billing_hard_copy: project?.billing_hard_copy || "",
    billing_invoice_thru: project?.billing_invoice_thru || "",
    billing_process_fees: project?.billing_process_fees || "",
    tax_status: project?.tax_status || "",
    state_issue_tax_to: project?.state_issue_tax_to || "",
    structural_steel_tons: project?.structural_steel_tons || "",
    total_shop_hours: project?.total_shop_hours || "",
    project_start_date: project?.project_start_date || "",
    paint_type: project?.paint_type || "",
    paint_type_other: project?.paint_type_other || "",
    surface_prep: project?.surface_prep || "",
    surface_prep_other: project?.surface_prep_other || "",
    other_finishes: project?.other_finishes || "",
    inspection_by: project?.inspection_by || "",
  });

  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // Load static data
  const fetchUsersAndContacts = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        api.get("auth/users/"),
        api.get("auth/contacts/"),
      ]);
      setUsers(uRes.data.results || uRes.data);
      setContacts(cRes.data.results || cRes.data);
    } catch (err) {
      console.error("Failed to fetch reference lists:", err);
    }
  };

  useEffect(() => {
    fetchUsersAndContacts();
  }, []);

  // Keep state updated if project changes from outside (only on initial load of a new project ID)
  useEffect(() => {
    if (project && String(project.id) !== String(lastLoadedIdRef.current)) {
      lastLoadedIdRef.current = project.id;
      setForm({
        project_name: project.project_name || "",
        job_number: project.job_number || "",
        address: project.address || "",
        project_date: project.project_date || "",
        salesman: project.salesman || "",
        pm: project.pm || "",
        site_foreman: project.site_foreman || "",
        customer: project.customer || "",
        architect: project.architect || "",
        engineer: project.engineer || "",
        domestic_steel: !!project.domestic_steel,
        leed_certified: !!project.leed_certified,
        create_job_budget: !!project.create_job_budget,
        change_order_number: project.change_order_number || "",

        site_foreman_phone: project.site_foreman_phone || "",
        site_foreman_email: project.site_foreman_email || "",
        site_foreman_fax: project.site_foreman_fax || "",
        site_foreman_cell: project.site_foreman_cell || "",

        customer_contact: project.customer_contact || "",
        customer_phone: project.customer_phone || "",
        customer_fax: project.customer_fax || "",
        customer_cell: project.customer_cell || "",
        customer_email: project.customer_email || "",

        architect_contact: project.architect_contact || "",
        architect_phone: project.architect_phone || "",
        architect_fax: project.architect_fax || "",
        architect_cell: project.architect_cell || "",
        architect_email: project.architect_email || "",

        engineer_contact: project.engineer_contact || "",
        engineer_phone: project.engineer_phone || "",
        engineer_fax: project.engineer_fax || "",
        engineer_cell: project.engineer_cell || "",
        engineer_email: project.engineer_email || "",

        scope_of_work: project.scope_of_work || "",
        type_of_contract: project.type_of_contract || "",
        terms_of_contract: project.terms_of_contract || "",
        prevailing_wage: project.prevailing_wage || "",
        bill_stored_material: project.bill_stored_material || "",
        bond_required: project.bond_required || "",
        ocip_required: project.ocip_required || "",
        billing_pencil_copy: project.billing_pencil_copy || "",
        billing_hard_copy: project.billing_hard_copy || "",
        billing_invoice_thru: project.billing_invoice_thru || "",
        billing_process_fees: project.billing_process_fees || "",
        tax_status: project.tax_status || "",
        state_issue_tax_to: project.state_issue_tax_to || "",
        structural_steel_tons: project.structural_steel_tons || "",
        total_shop_hours: project.total_shop_hours || "",
        project_start_date: project.project_start_date || "",
        paint_type: project.paint_type || "",
        paint_type_other: project.paint_type_other || "",
        surface_prep: project.surface_prep || "",
        surface_prep_other: project.surface_prep_other || "",
        other_finishes: project.other_finishes || "",
        inspection_by: project.inspection_by || "",
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    const updatedForm = { ...form, [name]: val };
    setForm(updatedForm);

    if (!isReadOnly) {
      triggerSave(async () => {
        await api.patch(`projects/${projectId}/`, { [name]: val });
        if (refreshProject) refreshProject();
      });
    }
  };

  useEffect(() => {
    if (isRetainage(form.terms_of_contract)) {
      setRetainageInput(extractRetainagePercentage(form.terms_of_contract));
    } else {
      setRetainageInput("");
    }
  }, [form.terms_of_contract]);

  const handleTermsSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      handleChange({ target: { name: "terms_of_contract", value: "Custom Terms" } });
    } else if (val === "% Retainage") {
      handleChange({ target: { name: "terms_of_contract", value: "% Retainage" } });
    } else {
      handleChange({ target: { name: "terms_of_contract", value: val } });
    }
  };

  const handleContactChange = (name, contactId) => {
    const selectedContact = contacts.find((c) => String(c.id) === String(contactId));
    if (selectedContact) {
      const patchData = { [name]: contactId };
      const updatedForm = { ...form, [name]: contactId };

      if (!form[`${name}_contact`] && selectedContact.name) {
        patchData[`${name}_contact`] = selectedContact.name;
        updatedForm[`${name}_contact`] = selectedContact.name;
      }
      if (!form[`${name}_phone`] && selectedContact.phone) {
        patchData[`${name}_phone`] = selectedContact.phone;
        updatedForm[`${name}_phone`] = selectedContact.phone;
      }
      if (!form[`${name}_email`] && selectedContact.email) {
        patchData[`${name}_email`] = selectedContact.email;
        updatedForm[`${name}_email`] = selectedContact.email;
      }

      setForm(updatedForm);

      if (!isReadOnly) {
        triggerSave(async () => {
          await api.patch(`projects/${projectId}/`, patchData);
          if (refreshProject) refreshProject();
        });
      }
    } else {
      handleChange({ target: { name, value: "" } });
    }
  };

  const handleForemanChange = (userId) => {
    const selectedUser = users.find((u) => String(u.id) === String(userId));
    if (selectedUser) {
      const patchData = { site_foreman: userId };
      const updatedForm = { ...form, site_foreman: userId };

      if (!form.site_foreman_email && selectedUser.email) {
        patchData.site_foreman_email = selectedUser.email;
        updatedForm.site_foreman_email = selectedUser.email;
      }
      if (!form.site_foreman_phone && selectedUser.phone) {
        patchData.site_foreman_phone = selectedUser.phone;
        updatedForm.site_foreman_phone = selectedUser.phone;
      }

      setForm(updatedForm);

      if (!isReadOnly) {
        triggerSave(async () => {
          await api.patch(`projects/${projectId}/`, patchData);
          if (refreshProject) refreshProject();
        });
      }
    } else {
      handleChange({ target: { name: "site_foreman", value: "" } });
    }
  };

  const statusColors = {
    'Yet to Start': "bg-slate-100 text-slate-600 border-slate-200",
    'In Progress': "bg-amber-50 text-amber-600 border-amber-200",
    'Completed': "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  if (!project) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
              Contract Information Sheet
            </h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                statusColors[project.status] || statusColors['Yet to Start']
              }`}
            >
              {project.status || "Planning"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Project Profile & Specifications
          </p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      {/* Grid Layout of Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Profile & Stakeholder Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CARD 1: Profile & Identification */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="text-amber-500 w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Project Profile
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Job Number
                </label>
                <input
                  type="text"
                  name="job_number"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  value={form.job_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  name="project_name"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-sans"
                  value={form.project_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Estimate Date
                </label>
                <input
                  type="date"
                  name="project_date"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  value={form.project_date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Project Start Date
                </label>
                <input
                  type="date"
                  name="project_start_date"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  value={form.project_start_date || ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sales Representative / PM
                </label>
                <select
                  name="salesman"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  value={form.salesman || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Rep</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name || u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Project Manager (PM)
                </label>
                <select
                  name="pm"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  value={form.pm || ""}
                  onChange={handleChange}
                >
                  <option value="">Select PM</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name || u.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Site Location / Address
              </label>
              <textarea
                name="address"
                disabled={isReadOnly}
                rows={2}
                className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-sans"
                value={form.address}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* CARD 2: Stakeholders */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="text-amber-500 w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Stakeholders & Contacts
              </h3>
            </div>

            <div className="space-y-4">
              {/* Site Foreman details */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold uppercase text-amber-600">Site Foreman</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Foreman User</label>
                    <select
                      name="site_foreman"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.site_foreman || ""}
                      onChange={(e) => handleForemanChange(e.target.value)}
                    >
                      <option value="">Select Foreman</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name || u.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                    <input
                      type="text"
                      name="site_foreman_phone"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.site_foreman_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cell</label>
                    <input
                      type="text"
                      name="site_foreman_cell"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.site_foreman_cell}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fax</label>
                    <input
                      type="text"
                      name="site_foreman_fax"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.site_foreman_fax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
                    <input
                      type="email"
                      name="site_foreman_email"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.site_foreman_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Customer details */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold uppercase text-amber-600">Customer (Buyer)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</label>
                    <select
                      name="customer"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.customer || ""}
                      onChange={(e) => handleContactChange("customer", e.target.value)}
                    >
                      <option value="">Select Customer</option>
                      {contacts
                        .filter((c) => c.contact_type === "customer")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company} ({c.name})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Person</label>
                    <input
                      type="text"
                      name="customer_contact"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.customer_contact}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                    <input
                      type="text"
                      name="customer_phone"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.customer_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cell</label>
                    <input
                      type="text"
                      name="customer_cell"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.customer_cell}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fax</label>
                    <input
                      type="text"
                      name="customer_fax"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.customer_fax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
                    <input
                      type="email"
                      name="customer_email"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.customer_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Architect details */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold uppercase text-amber-600">Architectural Firm</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</label>
                    <select
                      name="architect"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.architect || ""}
                      onChange={(e) => handleContactChange("architect", e.target.value)}
                    >
                      <option value="">Select Architect</option>
                      {contacts
                        .filter((c) => c.contact_type === "architect")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company} ({c.name})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Person</label>
                    <input
                      type="text"
                      name="architect_contact"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.architect_contact}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                    <input
                      type="text"
                      name="architect_phone"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.architect_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cell</label>
                    <input
                      type="text"
                      name="architect_cell"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.architect_cell}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fax</label>
                    <input
                      type="text"
                      name="architect_fax"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.architect_fax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
                    <input
                      type="email"
                      name="architect_email"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.architect_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Engineer details */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold uppercase text-amber-600">Structural Engineering Firm</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</label>
                    <select
                      name="engineer"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.engineer || ""}
                      onChange={(e) => handleContactChange("engineer", e.target.value)}
                    >
                      <option value="">Select Engineer</option>
                      {contacts
                        .filter((c) => c.contact_type === "engineer")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company} ({c.name})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Person</label>
                    <input
                      type="text"
                      name="engineer_contact"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                      value={form.engineer_contact}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                    <input
                      type="text"
                      name="engineer_phone"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.engineer_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cell</label>
                    <input
                      type="text"
                      name="engineer_cell"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.engineer_cell}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fax</label>
                    <input
                      type="text"
                      name="engineer_fax"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.engineer_fax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
                    <input
                      type="email"
                      name="engineer_email"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                      value={form.engineer_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contract Specifications */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSignature className="text-amber-500 w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Specifications & Clauses
              </h3>
            </div>

            <div className="space-y-4">
              <SelectWithCustom
                label="Contract Agreement Type"
                name="type_of_contract"
                disabled={isReadOnly}
                options={["Purchase Order", "Subcontract Agreement", "Standard Proposal Agreement"]}
                value={form.type_of_contract}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Terms of Contract
                  </label>
                  <select
                    name="terms_of_contract_select"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all cursor-pointer"
                    value={isRetainage(form.terms_of_contract) ? "% Retainage" : isCustomTerms(form.terms_of_contract) ? "__custom__" : form.terms_of_contract}
                    onChange={handleTermsSelectChange}
                  >
                    <option value="">Select Terms</option>
                    <option value="Net 30">Net 30</option>
                    <option value="No Retainage">No Retainage</option>
                    <option value="% Retainage">% Retainage Option</option>
                    <option value="__custom__">Other (Custom Terms)...</option>
                  </select>
                </div>

                {isRetainage(form.terms_of_contract) ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Retainage %
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="0.1"
                        disabled={isReadOnly}
                        placeholder="10"
                        className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all pr-8 font-mono text-right"
                        value={retainageInput}
                        onChange={(e) => {
                          const percent = e.target.value;
                          setRetainageInput(percent);
                          handleChange({ target: { name: "terms_of_contract", value: `${percent}% Retainage` } });
                        }}
                      />
                      <span className="absolute right-3 text-slate-400 text-sm font-mono">%</span>
                    </div>
                  </div>
                ) : isCustomTerms(form.terms_of_contract) ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Custom Terms
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. Net 45"
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                      value={form.terms_of_contract}
                      onChange={handleChange}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prevailing Wage</label>
                  <select
                    name="prevailing_wage"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    value={form.prevailing_wage}
                    onChange={handleChange}
                  >
                    <option value="">-- Choose --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bill Stored Material</label>
                  <select
                    name="bill_stored_material"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    value={form.bill_stored_material}
                    onChange={handleChange}
                  >
                    <option value="">-- Choose --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Performance Bond Req.</label>
                  <select
                    name="bond_required"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    value={form.bond_required}
                    onChange={handleChange}
                  >
                    <option value="">-- Choose --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">OCIP / CCIP Insurance</label>
                  <select
                    name="ocip_required"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    value={form.ocip_required}
                    onChange={handleChange}
                  >
                    <option value="">-- Choose --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pencil Copy Due</label>
                  <input
                    type="text"
                    name="billing_pencil_copy"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                    placeholder="e.g. 20th"
                    value={form.billing_pencil_copy}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Hard Copy Due</label>
                  <input
                    type="text"
                    name="billing_hard_copy"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                    placeholder="e.g. 25th"
                    value={form.billing_hard_copy}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoiced Thru</label>
                  <input
                    type="text"
                    name="billing_invoice_thru"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                    placeholder="e.g. End of Month"
                    value={form.billing_invoice_thru}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tax Status</label>
                  <select
                    name="tax_status"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    value={form.tax_status}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="taxable">Taxable</option>
                    <option value="exempt">Tax Exempt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">State Issued Tax To</label>
                  <input
                    type="text"
                    name="state_issue_tax_to"
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                    placeholder="e.g. PA, NY"
                    value={form.state_issue_tax_to}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="text-amber-500 w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Project Technical Specifications
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectWithCustom
                  label="Surface Paint Spec"
                  name="paint_type"
                  disabled={isReadOnly}
                  options={["Standard Gray Primer", "Red Oxide Primer", "Universal Primer", "SP10 Primer", "No Primer (Raw/Black)"]}
                  value={form.paint_type}
                  onChange={handleChange}
                />
                <SelectWithCustom
                  label="Surface Prep Standard"
                  name="surface_prep"
                  disabled={isReadOnly}
                  options={["SSPC-SP2 (Hand Tool)", "SSPC-SP3 (Power Tool)", "SSPC-SP6 (Commercial Blast)", "SSPC-SP10 (Near-White Blast)"]}
                  value={form.surface_prep}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="domestic_steel"
                    disabled={isReadOnly}
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={form.domestic_steel}
                    onChange={handleChange}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Domestic Steel Only Required</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="leed_certified"
                    disabled={isReadOnly}
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={form.leed_certified}
                    onChange={handleChange}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">LEED Certified Submissions</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Scope / Exclusions Summary / Remarks
                </label>
                <textarea
                  name="scope_of_work"
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-sans"
                  placeholder="Summarize structural scope or key exceptions..."
                  value={form.scope_of_work}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
