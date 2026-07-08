"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, UserPlus, CheckCircle2, Trash2, Edit2, X, Save } from "lucide-react";

interface Partner {
  id: string;
  email: string;
  displayName?: string;
  revenueShare: number;
  createdAt: any;
  status: "active" | "pending";
}

interface PartnerRequest {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  penName: string;
  workType: string;
  contactInfo: string;
  portfolioUrl: string;
  description: string;
  status: string;
  createdAt: any;
}

export default function PartnerManagement() {
  const { role } = useAuth();
  const [email, setEmail] = useState("");
  const [revenueShare, setRevenueShare] = useState(73); // Default 73/27
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  
  // States for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShare, setEditingShare] = useState<number>(0);

  useEffect(() => {
    if (role === "admin") {
      fetchPartners();
      fetchRequests();
    }
  }, [role]);

  const fetchPartners = async () => {
    try {
      // 1. Fetch Active Partners
      const qUsers = query(collection(db, "users"), where("role", "==", "partner"));
      const snapshotUsers = await getDocs(qUsers);
      const activePartners = snapshotUsers.docs.map(d => ({
        id: d.id,
        status: "active" as const,
        ...d.data()
      })) as Partner[];

      // 2. Fetch Pending Partners (Pre-approved)
      const qPending = collection(db, "pre_approved_partners");
      const snapshotPending = await getDocs(qPending);
      const pendingPartners = snapshotPending.docs.map(d => ({
        id: d.id,
        status: "pending" as const,
        ...d.data()
      })) as Partner[];

      const allPartners = [...activePartners, ...pendingPartners];
      
      // Deduplicate by email (Active overrides Pending)
      const uniquePartnersMap = new Map<string, Partner>();
      allPartners.forEach(p => {
        if (!uniquePartnersMap.has(p.email) || p.status === "active") {
          uniquePartnersMap.set(p.email, p);
        }
      });
      
      setPartners(Array.from(uniquePartnersMap.values()));
    } catch (error) {
      console.error("Error fetching partners", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "partner_requests"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PartnerRequest));
      setPartnerRequests(reqs);
    } catch (error) {
      console.error("Error fetching partner requests", error);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // User exists, upgrade ALL documents with this email to partner
        const promises = snapshot.docs.map(userDoc => 
          setDoc(doc(db, "users", userDoc.id), {
            role: "partner",
            revenueShare: Number(revenueShare)
          }, { merge: true })
        );
        await Promise.all(promises);
        
        setMessage(`Successfully upgraded ${email} to Partner! Sending email invitation...`);
      } else {
        // Check if already in pre_approved_partners
        const qPending = query(collection(db, "pre_approved_partners"), where("email", "==", email.toLowerCase()));
        const snapshotPending = await getDocs(qPending);
        
        if (!snapshotPending.empty) {
          setMessage(`${email} is already in the pending list! Sending email invitation again...`);
        } else {
          // User does not exist at all, add to pending
          const newRef = doc(collection(db, "pre_approved_partners"));
          await setDoc(newRef, {
            email: email.toLowerCase(),
            role: "partner",
            revenueShare: Number(revenueShare),
            createdAt: new Date()
          });
          setMessage(`Added ${email} to pre-approved partners list. Sending email invitation...`);
        }
      }

      // Send Email Invitation
      try {
        const res = await fetch("/api/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, revenueShare })
        });
        const result = await res.json();
        
        if (!res.ok) {
          console.error("Email Error:", result.error);
          setMessage((prev) => prev + ` (แต่มีปัญหาในการส่งอีเมล: ${result.error})`);
        } else {
          setMessage((prev) => prev.replace("Sending email invitation...", "ส่งอีเมลคำเชิญสำเร็จแล้ว! ✉️"));
        }
      } catch (err) {
        console.error("Fetch email error:", err);
      }

      setEmail("");
      fetchPartners();
    } catch (error) {
      console.error(error);
      setMessage("Error adding partner.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (partner: Partner) => {
    try {
      if (partner.status === "active") {
        await updateDoc(doc(db, "users", partner.id), {
          revenueShare: editingShare
        });
      } else {
        await updateDoc(doc(db, "pre_approved_partners", partner.id), {
          revenueShare: editingShare
        });
      }
      setEditingId(null);
      fetchPartners();
    } catch (err) {
      console.error(err);
      alert("Failed to update revenue share");
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Are you sure you want to remove ${partner.email} from Partners?`)) return;
    
    try {
      if (partner.status === "active") {
        // Change role back to user
        await updateDoc(doc(db, "users", partner.id), {
          role: "user"
        });
      } else {
        // Delete pending invitation completely
        await deleteDoc(doc(db, "pre_approved_partners", partner.id));
      }
      fetchPartners();
    } catch (err) {
      console.error(err);
      alert("Failed to remove partner");
    }
  };

  const handleApproveRequest = async (req: PartnerRequest) => {
    if (!confirm(`Are you sure you want to approve ${req.penName} (${req.email}) as a partner?`)) return;
    try {
      // 1. Update user role
      await setDoc(doc(db, "users", req.uid), {
        role: "partner",
        revenueShare: 73,
        penName: req.penName
      }, { merge: true });

      // 2. Update request status
      await updateDoc(doc(db, "partner_requests", req.id), {
        status: "approved",
        updatedAt: new Date()
      });

      alert(`Approved ${req.penName} as Partner!`);
      fetchPartners();
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request.");
    }
  };

  const handleRejectRequest = async (req: PartnerRequest) => {
    if (!confirm(`Are you sure you want to REJECT the request from ${req.penName}?`)) return;
    try {
      await updateDoc(doc(db, "partner_requests", req.id), {
        status: "rejected",
        updatedAt: new Date()
      });
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request.");
    }
  };

  if (role !== "admin") {
    return <div className="text-red-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Partner Management</h2>
        <p className="text-slate-500 dark:text-slate-400">Add or manage writer/artist partners and their revenue share.</p>
      </div>

      {/* Add Partner Form */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-purple-500" />
          Assign New Partner
        </h3>
        
        <form onSubmit={handleAddPartner} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Partner Gmail Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@gmail.com"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Revenue Share (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  required
                  min="0"
                  max="100"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  %
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Platform takes {100 - revenueShare}%</p>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Partner"}
          </button>
          
          {message && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}
        </form>
      </div>

      {/* Partner List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 dark:text-white">Active Partners</h3>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search email..." 
              className="pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Revenue Share</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center italic text-slate-500">
                    No partners found. Add one above.
                  </td>
                </tr>
              ) : (
                partners.map(partner => (
                  <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{partner.email}</td>
                    
                    <td className="px-6 py-4">
                      {partner.status === "active" ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          Pending Login
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {editingId === partner.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            className="w-20 px-2 py-1 border border-slate-300 rounded-md outline-none"
                            value={editingShare}
                            onChange={(e) => setEditingShare(Number(e.target.value))}
                          />
                          <span className="text-slate-500">%</span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                          {partner.revenueShare || 73}%
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {editingId === partner.id ? (
                        <div className="flex justify-end items-center gap-2">
                          <button onClick={() => handleSaveEdit(partner)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="Save">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Cancel">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-3">
                          <button 
                            onClick={() => {
                              setEditingId(partner.id);
                              setEditingShare(partner.revenueShare || 73);
                            }} 
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Edit Revenue Share"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(partner)} 
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove Partner"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Requests List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 dark:text-white">Pending Writer Requests</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{partnerRequests.length} Requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Pen Name / Email</th>
                <th className="px-6 py-3 font-medium">Work Type</th>
                <th className="px-6 py-3 font-medium">Contact & Portfolio</th>
                <th className="px-6 py-3 font-medium">Pitch</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {partnerRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center italic text-slate-500">
                    No pending requests right now.
                  </td>
                </tr>
              ) : (
                partnerRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{req.penName}</div>
                      <div className="text-xs text-slate-500">{req.email}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${req.workType === 'novel' ? 'bg-indigo-100 text-indigo-700' : req.workType === 'comic' ? 'bg-orange-100 text-orange-700' : 'bg-pink-100 text-pink-700'}`}>
                        {req.workType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs mb-1"><span className="font-bold">Contact:</span> {req.contactInfo}</div>
                      {req.portfolioUrl && (
                        <div className="text-xs"><span className="font-bold">Portfolio:</span> <a href={req.portfolioUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">Link</a></div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs max-w-xs truncate" title={req.description}>{req.description}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req)}
                          className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
