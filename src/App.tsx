import React, { useState } from 'react';
import { AppView, Hospital, Appointment, Invoice, Patient, HospitalUser, MedicalDocument, AccessRequest } from './types';
import { HOSPITALS } from './data';
import InteractiveMap from './components/InteractiveMap';
import HospitalDetails from './components/HospitalDetails';
import AppointmentModal from './components/AppointmentModal';
import PaymentFlow from './components/PaymentFlow';
import WalletTab from './components/WalletTab';
import Auth from './components/Auth';
import HospitalDashboard from './components/HospitalDashboard';
import MedicalRecordViewer from './components/MedicalRecordViewer';
import LandingPage from './components/LandingPage';
import { 
  Map as MapIcon, Wallet, Calendar, User, ShieldCheck, 
  X, Printer, CheckCircle2, ChevronRight, FileText, 
  Settings, Check, ArrowLeft, HeartPulse, LogOut, Lock, LogIn, Trash2, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';


export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  
  // App-wide state
  const [patientUser, setPatientUser] = useState<Patient | null>(null);
  const [hospitalUser, setHospitalUser] = useState<HospitalUser | null>(null);
  const [customDocuments, setCustomDocuments] = useState<MedicalDocument[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  // Fetch hospitals list from the backend on startup
  React.useEffect(() => {
    fetch('/api/hospitals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHospitals(data);
        }
      })
      .catch(err => {
        console.warn("Could not fetch hospitals, falling back to static list", err);
        setHospitals(HOSPITALS);
      });
  }, []);

  const handleVerifyHospital = (id: string) => {
    fetch(`/api/hospitals/${id}/verify`, { method: 'PATCH' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHospitals(prev => prev.map(h => h.id === id ? { ...h, isVerified: true } : h));
        }
      })
      .catch(err => console.error("Error verifying hospital:", err));
  };

  const handleAddHospital = (newHosp: any) => {
    return fetch('/api/hospitals/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newHosp)
    })
      .then(res => res.json())
      .then(data => {
        if (data.hospital) {
          setHospitals(prev => [...prev, data.hospital]);
          return data.hospital;
        }
        throw new Error(data.error || "Failed to add hospital");
      });
  };

  // Blockchain access requests state
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([
    {
      id: 'req-1',
      npi: '1097885544901',
      doctorEmail: 'dr.sossou@sante.bj',
      hospitalName: 'CHD Atlantique (Hôpital Universitaire)',
      status: 'pending',
      requestedAt: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR')
    }
  ]);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');

  const handlePatientLogin = (pat: Patient) => {
    // 1. Fetch patient profile to synchronize balance or create profile on the backend
    fetch(`/api/wallet/patients/${encodeURIComponent(pat.email)}`)
      .then(res => res.json())
      .then(serverPat => {
        setPatientUser(serverPat);
        setUserName(serverPat.name);
        setWalletBalance(serverPat.walletBalance);
      })
      .catch(err => {
        console.warn("Could not load patient profile from backend, using client fallback", err);
        setPatientUser(pat);
        setUserName(pat.name);
        setWalletBalance(pat.walletBalance);
      });
      
    // 2. Fetch appointments from server
    fetch(`/api/appointments`)
      .then(res => res.json())
      .then(apts => {
        if (Array.isArray(apts)) setAppointments(apts);
      })
      .catch(err => console.warn("Could not load appointments from backend", err));

    // 3. Fetch invoices from server
    fetch(`/api/invoices`)
      .then(res => res.json())
      .then(invs => {
        if (Array.isArray(invs)) setInvoices(invs);
      })
      .catch(err => console.warn("Could not load invoices from backend", err));

    setHospitalUser(null);
    setView('map');
  };

  const handleHospitalLogin = (hUser: HospitalUser) => {
    setHospitalUser(hUser);
    setPatientUser(null);
    setView('hospital-dashboard');
  };

  const handleHospitalLogout = () => {
    setHospitalUser(null);
    setPatientUser(null);
    setUserName('');
    setWalletBalance(0);
    setView('auth');
  };

  const handleApproveAccessRequest = (requestId: string) => {
    setAccessRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const characters = '0123456789abcdef';
        let mockHash = '0000000000000000';
        for (let i = 0; i < 48; i++) {
          mockHash += characters.charAt(Math.floor(Math.random() * 16));
        }
        return {
          ...req,
          status: 'approved',
          confirmedAt: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR'),
          blockchainTxHash: mockHash
        };
      }
      return req;
    }));
  };

  const handleRejectAccessRequest = (requestId: string) => {
    setAccessRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'rejected' } : req));
  };

  const handleAddAccessRequest = (npi: string) => {
    const docEmail = hospitalUser?.email || 'medecin@sante.bj';
    const exists = accessRequests.some(r => r.npi === npi && r.doctorEmail === docEmail);
    if (exists) return;

    // Find hospital name
    const matchingHospital = hospitals.find(h => h.id === hospitalUser?.hospitalId);
    const hName = matchingHospital ? matchingHospital.name : 'Centre Médical National';

    const newReq: AccessRequest = {
      id: `req-${Math.floor(100 + Math.random() * 900)}`,
      npi,
      doctorEmail: docEmail,
      hospitalName: hName,
      status: 'pending',
      requestedAt: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR')
    };

    setAccessRequests([newReq, ...accessRequests]);
  };

  const handleEmitDocument = (doc: MedicalDocument) => {
    setCustomDocuments([doc, ...customDocuments]);
  };

  const handleConfirmHospitalAppointment = (aptId: string) => {
    setAppointments(prev => prev.map(apt => apt.id === aptId ? { ...apt, status: 'confirmed' } : apt));
  };

  const handleCancelAppointment = (aptId: string) => {
    // Optimistic UI update: mark as cancelled instantly
    setAppointments(prev => prev.map(apt => apt.id === aptId ? { ...apt, status: 'cancelled' } : apt));

    // Server-side synchronization
    fetch(`/api/appointments/${aptId}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (!res.ok) throw new Error("Could not cancel on server");
      return res.json();
    })
    .then(() => {
      // Clean delete from list on success
      setAppointments(prev => prev.filter(apt => apt.id !== aptId));
    })
    .catch(err => {
      console.warn("Server cancellation failed, reverting to pure offline delete", err);
      // Fallback offline deletion
      setAppointments(prev => prev.filter(apt => apt.id !== aptId));
    });
  };


  // Seed with 1 mock historic paid invoice
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'FACT-392817',
      patientName: 'Bienvenue Segnon',
      hospitalName: 'CHD Atlantique (Hôpital Universitaire)',
      hospitalAddress: 'Route Inter-États, Près du Campus Universitaire d\'Abomey-Calavi (UAC)',
      date: '20 Juin 2026 à 10:45',
      items: [
        { name: 'Consultation Spécialiste', priceXOF: 5000 },
        { name: 'Test Rapide Paludisme (GE)', priceXOF: 1500 }
      ],
      totalXOF: 6500,
      totalSats: 10790,
      paymentMethod: 'Wallet',
      txHash: '0x5c7f763ab21e3f890ad678ec4532bce78d8fe0192',
      isPaid: true,
      doctorName: 'Dr. Jean Sossou'
    }
  ]);

  // Seed with 1 future appointment
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-821',
      hospitalId: 'hz-calavi',
      hospitalName: "Hôpital de Zone d'Abomey-Calavi & Sô-Ava",
      date: '2026-07-02',
      timeSlot: '10:30',
      patientName: 'Bienvenue Segnon',
      status: 'confirmed'
    }
  ]);

  // Overlay detail invoice to view/print anytime
  const [activeInvoiceToView, setActiveInvoiceToView] = useState<Invoice | null>(null);

  const handleSelectHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setView('hospital-details');
  };

  const handleSelectAlreadyThere = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setView('payment-flow');
  };

   const handleConfirmAppointment = (newApt: Appointment) => {
    setAppointments([newApt, ...appointments]);

    // Sync appointment creation to backend
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApt)
    })
    .then(res => res.json())
    .then(serverApt => {
      setAppointments(prev => prev.map(a => a.id === newApt.id ? serverApt : a));
    })
    .catch(err => console.warn("Failed to synchronize appointment with server", err));

    // Stay in details view or return to dashboard
    setTimeout(() => {
      setView('hospital-details');
    }, 2500);
  };

  const handlePaymentComplete = (newInvoice: Invoice) => {
    setInvoices([newInvoice, ...invoices]);

    // Synchronize new invoice/receipt with backend
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInvoice)
    })
    .then(res => res.json())
    .then(serverInvoice => {
      setInvoices(prev => prev.map(i => i.id === newInvoice.id ? serverInvoice : i));
    })
    .catch(err => console.warn("Failed to synchronize paid invoice with server", err));

    // Update virtual balance in patient profile on server if paid via Wallet
    if (newInvoice.paymentMethod === 'Wallet' && patientUser) {
      fetch(`/api/wallet/patients/${encodeURIComponent(patientUser.email)}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountXOF: -newInvoice.totalXOF }) // debit on server
      })
      .then(res => res.json())
      .then(updatedPat => {
        setWalletBalance(updatedPat.walletBalance);
      })
      .catch(err => console.warn("Could not synchronize balance debit on server", err));
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    setUserName(tempName);
    setIsEditingName(false);
  };

  if (!patientUser && !hospitalUser && view !== 'landing') {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col justify-center items-center p-4 md:p-8">
        <div className="mb-4 text-center">
          <button 
            onClick={() => setView('landing')} 
            className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 font-sans flex items-center gap-1.5 justify-center mx-auto bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-3xs"
          >
            ← Retourner à l'Accueil & FAQ
          </button>
        </div>
        <div className="mb-6 flex flex-col items-center text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#059669] flex items-center justify-center text-white shadow-lg shadow-[#059669]/20 font-sans font-black text-2xl mb-4 animate-pulse">
            S+
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans text-gray-900">Santé+ Bénin</h1>
          <p className="text-xs text-gray-500 font-sans mt-1.5 leading-relaxed">
            Espace d'identification sécurisé pour les citoyens et professionnels de santé d'Abomey-Calavi.
          </p>
        </div>
        <div className="w-full max-w-md">
          <Auth
            onPatientLogin={handlePatientLogin}
            onHospitalLogin={handleHospitalLogin}
            onClose={() => {}}
            hospitals={hospitals}
          />
        </div>
        <div className="mt-8 text-center text-[10px] text-gray-400 font-sans max-w-xs leading-relaxed">
          Propulsé par le Ministère de la Santé du Bénin. Connectivité nationale chiffrée de bout en bout.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A]">
      
      {/* 1. TOP GLOBAL NAVIGATION HEADER */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('map'); setSelectedHospital(null); }}>
            <div className="w-10 h-10 rounded-xl bg-[#059669] flex items-center justify-center text-white shadow-xs font-bold text-lg">
              S+
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight font-sans text-gray-900 flex items-center gap-1">
                Santé+
              </h1>
              <p className="text-[10px] text-gray-400 font-sans tracking-wide uppercase font-bold">Santé & Même Plus</p>
            </div>
          </div>
          
          {/* Center Tabs Navigation */}
          <nav className="hidden md:flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200/50">
            {hospitalUser ? (
              <button
                onClick={() => { setView('hospital-dashboard'); }}
                className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  view === 'hospital-dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Portail Clinique ({hospitalUser.hospitalId === 'system-admin' ? 'Super Admin' : (hospitals.find(h => h.id === hospitalUser.hospitalId)?.name || 'Hôpital')})
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setView('landing'); setSelectedHospital(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    view === 'landing'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-500" />
                  Accueil & FAQ
                </button>

                <button
                  onClick={() => { setView('map'); setSelectedHospital(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    view === 'map' || view === 'hospital-details' || view === 'payment-flow'
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  Carte Interactive
                </button>
                
                <button
                  onClick={() => { setView('wallet'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    view === 'wallet'
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Portefeuille & Factures
                </button>

                <button
                  onClick={() => { setView('appointments'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    view === 'appointments'
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Rendez-vous ({appointments.length})
                </button>

                <button
                  onClick={() => { setView('medical-record'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    view === 'medical-record'
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Dossier Médical
                </button>
              </>
            )}
          </nav>

          {/* Right Area: Identity Profile Selector / Access Portal Button */}
          <div className="flex items-center gap-3">
            {/* If patient is logged in */}
            {patientUser && (
              <>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-sans">Solde Wallet</span>
                  <span className="text-sm font-sans font-extrabold text-[#00D26A]">{walletBalance.toLocaleString('fr-FR')} XOF</span>
                </div>

                <div className="relative">
                  {!isEditingName ? (
                    <button
                      onClick={() => { setTempName(userName); setIsEditingName(true); }}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl flex items-center gap-2 transition-all text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#059669]/10 text-[#059669] flex items-center justify-center font-bold text-xs uppercase">
                        {userName ? userName.substring(0, 2) : 'PT'}
                      </div>
                      <div className="hidden lg:block text-[11px]">
                        <span className="text-gray-400 block font-semibold leading-none">Citoyen</span>
                        <strong className="text-gray-800 font-bold font-sans block mt-0.5 truncate max-w-[100px]">{userName}</strong>
                      </div>
                    </button>
                  ) : (
                    <form onSubmit={handleSaveName} className="flex items-center gap-1.5 bg-white border border-gray-200 p-1 rounded-xl shadow-md z-40 relative">
                      <input
                        type="text"
                        required
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="px-2 py-1 bg-gray-50 rounded-lg text-xs font-sans font-semibold focus:outline-none w-[100px]"
                        autoFocus
                      />
                      <button type="submit" className="p-1 bg-[#00D26A] text-white rounded-lg hover:opacity-90 cursor-pointer">
                        <Check className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => setIsEditingName(false)} className="p-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  )}
                </div>

                <button
                  onClick={() => {
                    setPatientUser(null);
                    setUserName('');
                    setWalletBalance(0);
                    setView('auth');
                  }}
                  className="p-2 hover:bg-red-50 text-red-500 rounded-xl border border-gray-100 hover:border-red-100 transition-all cursor-pointer bg-white"
                  title="Déconnexion Patient"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {/* If Hospital staff is logged in */}
            {hospitalUser && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 border border-slate-800 rounded-2xl text-[11px]">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <div className="text-left font-sans leading-tight">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Session Pro</span>
                  <strong className="text-white block truncate max-w-[120px]">{hospitalUser.email.split('@')[0]}</strong>
                </div>
              </div>
            )}

            {/* Switch / Access Portal Button */}
            <button
              onClick={() => { setView('auth'); setSelectedHospital(null); }}
              className={`px-3 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                view === 'auth'
                  ? 'bg-[#059669] border-[#059669] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
              }`}
              title="Portail de Connexion et Création de compte"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Portail Accès</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC MAIN APPLICATION VIEWPORT */}
      <main className={`flex-1 w-full ${view === 'landing' ? '' : 'max-w-7xl mx-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8'}`}>
        <AnimatePresence mode="wait">

          {/* VIEW: LANDING PAGE */}
          {view === 'landing' && (
            <motion.div
              key="landing-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <LandingPage
                onEnterApp={(initialView) => {
                  setView(initialView);
                }}
                isLoggedIn={!!patientUser}
                onOpenAuth={() => setView('auth')}
              />
            </motion.div>
          )}
          
          {/* VIEW: MAP & SEARCH HOMEPAGE */}
          {(view === 'map') && (
            <motion.div
              key="map-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <InteractiveMap 
                onSelectHospital={handleSelectHospital} 
                onSelectAlreadyThere={handleSelectAlreadyThere}
                hospitals={hospitals}
              />
            </motion.div>
          )}

          {/* VIEW: DETAILED HOSPITAL SCREEN */}
          {view === 'hospital-details' && selectedHospital && (
            <motion.div
              key="details-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <HospitalDetails
                hospital={selectedHospital}
                onBack={() => setView('map')}
                onBookAppointment={() => setView('appointments')}
                onProceedToPayment={() => setView('payment-flow')}
              />
            </motion.div>
          )}

          {/* VIEW: BOOK APPOINTMENT MODAL SCHEDULER */}
          {view === 'appointments' && (
            <motion.div
              key="appointments-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* If no selected hospital, render appointments index */}
              {selectedHospital ? (
                <AppointmentModal
                  hospital={selectedHospital}
                  onBack={() => setView('hospital-details')}
                  onConfirm={handleConfirmAppointment}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold font-sans text-[#1C1C1E]">Mes Rendez-vous médicaux</h2>
                      <p className="text-xs text-gray-500 font-sans">Suivi des créneaux planifiés à Abomey-Calavi</p>
                    </div>
                    <button
                      onClick={() => setView('map')}
                      className="px-4 py-2 bg-[#059669] text-white rounded-xl text-xs font-sans font-bold shadow-xs hover:bg-[#059669]/90 cursor-pointer"
                    >
                      Prendre un RDV
                    </button>
                  </div>

                  {appointments.length > 0 ? (
                    <div className="space-y-3">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="p-5 bg-white border border-gray-100 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-3xs">
                          <div className="space-y-1.5">
                            <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-[#059669] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-sans">
                              {apt.timeSlot}
                            </span>
                            <h3 className="font-sans font-bold text-sm text-[#1C1C1E]">{apt.hospitalName}</h3>
                            <p className="text-xs text-gray-400 font-sans">
                              Date : <strong>{apt.date.split('-').reverse().join('/')}</strong> • Patient : <strong>{apt.patientName}</strong>
                            </p>
                            {(apt.service || apt.reason || apt.doctorName) && (
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-[11px] font-sans text-gray-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-gray-100/50 max-w-lg">
                                {apt.service && <span>Service : <strong className="text-gray-700">{apt.service}</strong></span>}
                                {apt.reason && <span>• Motif : <strong className="text-gray-700">{apt.reason}</strong></span>}
                                {apt.doctorName && <span>• Médecin : <strong className="text-gray-700">Dr. {apt.doctorName}</strong></span>}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {apt.status === 'cancelled' ? (
                              <span className="flex items-center gap-1 text-xs text-rose-500 font-bold font-sans bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">
                                Annulé par vous
                              </span>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 text-xs text-[#00D26A] font-bold font-sans">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmé par Secrétariat
                                </span>
                                <button
                                  onClick={() => handleCancelAppointment(apt.id)}
                                  className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-sans font-bold border border-rose-100"
                                  title="Annuler ce rendez-vous"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Annuler</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-700">Aucun rendez-vous planifié</p>
                      <p className="text-xs text-gray-400 mt-1">Cliquez sur un hôpital de la carte pour réserver un créneau.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW: COMPREHENSIVE REGLEMENT PROCESS */}
          {view === 'payment-flow' && selectedHospital && (
            <motion.div
              key="payment-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PaymentFlow
                hospital={selectedHospital}
                walletBalance={walletBalance}
                setWalletBalance={setWalletBalance}
                userName={userName}
                onBack={() => setView('hospital-details')}
                onPaymentComplete={handlePaymentComplete}
                customDocuments={customDocuments}
              />
            </motion.div>
          )}

          {/* VIEW: WALLET & DIGITAL MEDICAL BILLS ARCHIVE */}
          {view === 'wallet' && (
            <motion.div
              key="wallet-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <WalletTab
                balance={walletBalance}
                setBalance={setWalletBalance}
                invoices={invoices}
                onSelectInvoice={(inv) => setActiveInvoiceToView(inv)}
                accessRequests={accessRequests}
                onApproveAccess={handleApproveAccessRequest}
                onRejectAccess={handleRejectAccessRequest}
                patientUser={patientUser}
              />
            </motion.div>
          )}

          {/* VIEW: MEDICAL RECORD VIEWER (DOSSIER MÉDICAL SÉCURISÉ) */}
          {view === 'medical-record' && (
            <motion.div
              key="medical-record-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <MedicalRecordViewer
                patientUser={patientUser}
                onBack={() => setView('map')}
              />
            </motion.div>
          )}

          {/* VIEW: AUTH PORTAL (PATIENT/CITOYEN LOGIN & HOSPITAL SELECTION LOGIN) */}
          {view === 'auth' && (
            <motion.div
              key="auth-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Auth
                onPatientLogin={handlePatientLogin}
                onHospitalLogin={handleHospitalLogin}
                onClose={() => setView('map')}
                hospitals={hospitals}
              />
            </motion.div>
          )}

          {/* VIEW: CLINICAL PORTAL / HOSPITAL DASHBOARD */}
          {view === 'hospital-dashboard' && hospitalUser && (
            <motion.div
              key="hospital-dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <HospitalDashboard
                user={hospitalUser}
                appointments={appointments}
                invoices={invoices}
                onEmitDocument={handleEmitDocument}
                onLogout={handleHospitalLogout}
                onConfirmAppointment={handleConfirmHospitalAppointment}
                accessRequests={accessRequests}
                onAddAccessRequest={handleAddAccessRequest}
                hospitals={hospitals}
                onVerifyHospital={handleVerifyHospital}
                onAddHospital={handleAddHospital}
              />
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* 3. MOBILE RESPONSIVE FOOTER TAB BAR (Fixed bottom for mobile users) */}
      <footer className="md:hidden bg-white border-t border-gray-100 py-2 px-6 sticky bottom-0 z-40 shadow-lg grid grid-cols-3 text-center">
        <button
          onClick={() => { setView('map'); setSelectedHospital(null); }}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            view === 'map' || view === 'hospital-details' || view === 'payment-flow' ? 'text-[#059669]' : 'text-gray-400'
          }`}
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-[10px] font-sans font-bold">Carte</span>
        </button>

        <button
          onClick={() => { setView('wallet'); }}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            view === 'wallet' ? 'text-[#059669]' : 'text-gray-400'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-sans font-bold">Portefeuille</span>
        </button>

        <button
          onClick={() => { setView('appointments'); }}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            view === 'appointments' ? 'text-[#059669]' : 'text-gray-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-sans font-bold">Rendez-vous</span>
        </button>
      </footer>

      {/* 4. PAST MEDICAL INVOICES / RECEIPT RETRIEVER OVERLAY (PDF viewer format) */}
      <AnimatePresence>
        {activeInvoiceToView && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F2F2F7] rounded-3xl overflow-hidden w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              {/* Header inside overlay */}
              <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold font-sans text-gray-800">Archive Facture Santé+</span>
                <button
                  onClick={() => setActiveInvoiceToView(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PDF Sheet Layout inside the overlay */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-xs text-left relative overflow-hidden space-y-4">
                  {/* PDF Paper Header Decor */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#059669]"></div>
                  
                  {/* Watermark paid */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 pointer-events-none select-none opacity-10">
                    <div className="border-4 border-[#00D26A] text-[#00D26A] text-4xl font-extrabold px-6 py-2 rounded-xl">
                      SANTÉ+ PAYÉ
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-md font-sans font-extrabold text-gray-800">SANTÉ+</h4>
                      <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider font-bold">Plateforme de soins Bénin</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-[#00D26A] text-[11px] font-sans font-bold rounded-lg uppercase tracking-wider">
                        Facture Payée
                      </span>
                      <p className="text-[10px] text-gray-400 font-sans mt-1">N° {activeInvoiceToView.id}</p>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-gray-400 font-sans block">Patient</span>
                      <strong className="text-gray-800 font-sans font-bold block mt-0.5">{activeInvoiceToView.patientName}</strong>
                      <span className="text-gray-500 font-mono block mt-0.5">{activeInvoiceToView.patientPhone || "+229 97 88 55 44"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-sans block">Établissement émetteur</span>
                      <strong className="text-gray-800 font-sans font-bold block mt-0.5">{activeInvoiceToView.hospitalName}</strong>
                      <span className="text-gray-500 font-sans block mt-0.5 truncate">{activeInvoiceToView.hospitalAddress}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-gray-400 font-sans block">Date de paiement</span>
                      <span className="text-gray-700 font-sans block mt-0.5">{activeInvoiceToView.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-sans block">Médecin / Praticien</span>
                      <span className="text-gray-700 font-sans block mt-0.5 font-semibold">
                        {activeInvoiceToView.doctorName || 'Dr. Jean Sossou'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <span className="text-gray-400 font-sans block">Méthode de paiement</span>
                      <span className="text-gray-700 font-sans block mt-0.5 font-semibold">
                        {activeInvoiceToView.paymentMethod === 'Wallet' ? 'Wallet Santé+ (Prépayé)' : 'Réseau Lightning (Sats)'}
                      </span>
                    </div>
                  </div>

                  {/* Bill Line Items */}
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs font-sans space-y-1.5">
                    <div className="flex justify-between text-gray-400 font-bold border-b border-gray-200/60 pb-1.5 uppercase text-[9px] tracking-wider">
                      <span>Désignation de l'acte</span>
                      <span>Montant</span>
                    </div>
                    {activeInvoiceToView.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-gray-700">
                        <span>{it.name}</span>
                        <span className="font-semibold">{it.priceXOF.toLocaleString('fr-FR')} XOF</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-gray-900 border-t border-gray-200/60 pt-1.5 font-bold mt-1 text-sm">
                      <span className="font-sans">Total Acquitté</span>
                      <span className="font-sans text-gray-950">{activeInvoiceToView.totalXOF.toLocaleString('fr-FR')} XOF</span>
                    </div>
                    <div className="text-right text-[10px] text-gray-400 font-sans font-medium">
                      (Équivalent réglé de {activeInvoiceToView.totalSats.toLocaleString()} Satoshis)
                    </div>
                  </div>

                  {/* Footer seal */}
                  <div className="flex justify-between items-center text-[10px] font-sans text-gray-400 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-1 rounded-lg border border-gray-100 shadow-3xs">
                        <QRCodeSVG 
                          value={`https://sante.gouv.bj/verifier?id=${activeInvoiceToView.id}&tx=${activeInvoiceToView.txHash}&total=${activeInvoiceToView.totalXOF}&patient=${encodeURIComponent(activeInvoiceToView.patientName)}&origin=${encodeURIComponent(window.location.origin)}`}
                          size={48}
                          level="M"
                        />
                      </div>
                      <div>
                        <span className="block font-semibold">Référence transaction</span>
                        <span className="font-mono text-[9px] block truncate max-w-[150px] mt-0.5">{activeInvoiceToView.txHash}</span>
                        <span className="text-[9px] text-[#059669] font-semibold mt-0.5 block font-sans">Scanner pour vérifier</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg text-[#FF8A00] font-bold border border-amber-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ministère de la Santé agréé
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar inside modal */}
              <div className="p-4 bg-white border-t border-gray-100 grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold font-sans text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer Facture
                </button>
                <button
                  onClick={() => setActiveInvoiceToView(null)}
                  className="py-2.5 px-4 bg-[#059669] text-white font-bold font-sans text-xs rounded-xl transition-all text-center cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {(!patientUser && !hospitalUser) ? null : hospitalUser ? (
        // Mobile Navigation for Hospital Staff
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-50 flex justify-around py-2 px-4 shadow-lg text-slate-400">
          <button
            onClick={() => { setView('hospital-dashboard'); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer ${
              view === 'hospital-dashboard' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-sans font-bold">Portail Clinique</span>
          </button>
          
          <button
            onClick={() => {
              setHospitalUser(null);
              setPatientUser(null);
              setUserName('');
              setWalletBalance(0);
              setView('auth');
            }}
            className="flex flex-col items-center gap-0.5 py-1.5 text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-sans font-bold">Déconnexion</span>
          </button>
        </div>
      ) : (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 flex justify-around py-2 px-4 shadow-lg">
          <button
            onClick={() => { setView('landing'); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer ${
              view === 'landing'
                ? 'text-[#00D26A]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <HelpCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-[9px] font-sans font-extrabold">FAQ & Chat</span>
          </button>

          <button
            onClick={() => { setView('map'); setSelectedHospital(null); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer ${
              view === 'map' || view === 'hospital-details' || view === 'payment-flow'
                ? 'text-[#059669]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[9px] font-sans font-extrabold">Carte</span>
          </button>
          
          <button
            onClick={() => { setView('wallet'); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer ${
              view === 'wallet' ? 'text-[#059669]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[9px] font-sans font-extrabold">Portefeuille</span>
          </button>

          <button
            onClick={() => { setView('appointments'); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer ${
              view === 'appointments' ? 'text-[#059669]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <Calendar className="w-5 h-5" />
              {appointments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[8px] px-1 font-bold">
                  {appointments.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-sans font-extrabold">Rendez-vous</span>
          </button>
        </div>
      )}

    </div>
  );
}
