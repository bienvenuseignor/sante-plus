import React, { useState, useEffect } from 'react';
import { HospitalUser, Hospital, Appointment, Invoice, MedicalDocument, AccessRequest, MedicalConsultation } from '../types';
import { HOSPITALS, XOF_TO_SATS, SAMPLE_PATIENTS } from '../data';
import { 
  Building2, Calendar, ClipboardList, PlusCircle, Trash2, 
  FileText, CheckSquare, TrendingUp, Download, LogOut, 
  Check, ShieldAlert, Sparkles, User, ShieldCheck, Search, Lock, Unlock, RefreshCw, AlertCircle,
  QrCode, Scan, Plus, CheckCircle2, Eye, Hash, Database, Shield
} from 'lucide-react';
import QRScanner from './QRScanner';

import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';

interface HospitalDashboardProps {
  user: HospitalUser;
  appointments: Appointment[];
  invoices: Invoice[];
  onEmitDocument: (doc: MedicalDocument) => void;
  onLogout: () => void;
  onConfirmAppointment: (id: string) => void;
  accessRequests: AccessRequest[];
  onAddAccessRequest: (npi: string) => void;
  hospitals?: Hospital[];
  onVerifyHospital?: (id: string) => void;
  onAddHospital?: (newHosp: any) => Promise<Hospital>;
}

export default function HospitalDashboard({
  user,
  appointments,
  invoices,
  onEmitDocument,
  onLogout,
  onConfirmAppointment,
  accessRequests,
  onAddAccessRequest,
  hospitals = HOSPITALS,
  onVerifyHospital,
  onAddHospital,
}: HospitalDashboardProps) {
  // If system super admin logged in, redirect to national admin view
  if (user.hospitalId === 'system-admin') {
    return (
      <SuperAdminDashboard
        user={user}
        hospitals={hospitals}
        onVerifyHospital={onVerifyHospital}
        onAddHospital={onAddHospital}
        onLogout={onLogout}
      />
    );
  }

  // Find hospital details
  const hospital = hospitals.find(h => h.id === user.hospitalId) || HOSPITALS[0];

  // Tab State
  const [activeTab, setActiveTab] = useState<'emit' | 'appointments' | 'finances'>('emit');
  const [praticienSubTab, setPraticienSubTab] = useState<'consultations' | 'billing'>('consultations');

  // Form states for emitting document
  const [patientName, setPatientName] = useState('Bienvenue Segnon');
  const [docTitle, setDocTitle] = useState('Analyses complémentaires de Routine');
  const [docType, setDocType] = useState<'analyses' | 'prescription' | 'devis'>('analyses');
  
  // Custom items builder
  const [items, setItems] = useState<{ name: string; priceXOF: number }[]>([
    { name: 'Examen sanguin hématocrite', priceXOF: 3500 },
    { name: 'Analyse d\'urine créatinine', priceXOF: 2500 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // NPI Search States
  const [searchNpi, setSearchNpi] = useState('1097885544901'); // prefilled with Bienvenue's NPI for easy demo
  const [searchedPatient, setSearchedPatient] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // QR Code camera scan and record update states
  const [showScanner, setShowScanner] = useState(false);
  const [unlockedRecordNpi, setUnlockedRecordNpi] = useState<string | null>(null);
  const [unlockedPatient, setUnlockedPatient] = useState<any | null>(null);
  const [consultationsList, setConsultationsList] = useState<MedicalConsultation[]>([]);
  const [expandedConsultationId, setExpandedConsultationId] = useState<string | null>(null);
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [blockchainSuccessMsg, setBlockchainSuccessMsg] = useState<{ recordId: string, txHash: string } | null>(null);
  const [newRecordInput, setNewRecordInput] = useState({
    doctor: user.name || 'Dr. Jean Sossou',
    hospital: hospital.name,
    reason: '',
    diagnosis: '',
    prescription: '',
    notes: '',
    treatmentPlan: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    followUp: ''
  });

  // Fetch medical history for the unlocked patient
  const fetchMedicalRecords = (npi: string) => {
    fetch(`/api/medical-records/${npi}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setConsultationsList(data);
        }
      })
      .catch(err => {
        console.warn("Could not fetch patient medical records from server", err);
        // Try localstorage fallback
        const localData = localStorage.getItem(`medical_records_${npi}`);
        if (localData) {
          try {
            setConsultationsList(JSON.parse(localData));
          } catch {
            setConsultationsList([]);
          }
        } else {
          setConsultationsList([]);
        }
      });
  };

  const handleScanQR = (scannedData: string) => {
    setShowScanner(false);
    
    // Parse the payload e.g. "santeplus://medical-record/1097885544901?token=SANTEPLUS-1097885544901-XYZ"
    const regex = /santeplus:\/\/medical-record\/([^?]+)(?:\?token=(.+))?/;
    const match = scannedData.match(regex);
    
    if (match) {
      const npi = match[1];
      const token = match[2] || '';
      
      const patient = SAMPLE_PATIENTS.find(p => p.npi === npi);
      if (patient) {
        setUnlockedRecordNpi(npi);
        setUnlockedPatient(patient);
        setSearchNpi(npi);
        setSearchedPatient(patient);
        setHasSearched(true);
        fetchMedicalRecords(npi);
        setPatientName(patient.name);

        // Make sure a mock request is created/approved on server so backend knows we have access
        fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ npi, doctorEmail: user.email, hospitalName: hospital.name })
        })
        .then(res => res.json())
        .then(req => {
          fetch(`/api/access-requests/${req.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          });
        })
        .catch(err => console.warn("Failed syncing access request for scanned QR", err));
        
      } else {
        alert("Patient non trouvé dans l'annuaire national Santé+");
      }
    } else {
      const cleanData = scannedData.trim();
      const patient = SAMPLE_PATIENTS.find(p => p.npi === cleanData || p.email === cleanData);
      if (patient) {
        setUnlockedRecordNpi(patient.npi || '');
        setUnlockedPatient(patient);
        setSearchNpi(patient.npi || '');
        setSearchedPatient(patient);
        setHasSearched(true);
        fetchMedicalRecords(patient.npi || '');
        setPatientName(patient.name);
      } else {
        alert("Format de QR Code Santé+ invalide ou code inconnu. Veuillez scanner le QR officiel généré par l'application mobile du patient.");
      }
    }
  };

  const handleAddConsultationRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockedRecordNpi) return;

    if (!newRecordInput.doctor || !newRecordInput.hospital || !newRecordInput.diagnosis) {
      alert("Veuillez remplir les champs obligatoires (Médecin, Hôpital et Diagnostic)");
      return;
    }

    fetch(`/api/medical-records/${unlockedRecordNpi}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecordInput)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setConsultationsList(prev => [data.record, ...prev]);
        
        const storageKey = `medical_records_${unlockedRecordNpi}`;
        const localDataStr = localStorage.getItem(storageKey);
        let currentLocal: any[] = [];
        if (localDataStr) {
          try { currentLocal = JSON.parse(localDataStr); } catch {}
        }
        localStorage.setItem(storageKey, JSON.stringify([data.record, ...currentLocal]));

        setBlockchainSuccessMsg({
          recordId: data.record.id,
          txHash: data.blockchainTxHash
        });

        setNewRecordInput(prev => ({
          ...prev,
          reason: '',
          diagnosis: '',
          prescription: '',
          notes: '',
          treatmentPlan: '',
          medication: '',
          dosage: '',
          frequency: '',
          duration: '',
          followUp: ''
        }));
        setShowAddRecordForm(false);
      }
    })
    .catch(err => {
      console.error("Failed to add medical record on server:", err);
      alert("Erreur lors de l'enregistrement de la mise à jour sur le serveur.");
    });
  };

  // Success states
  const [successMsg, setSuccessMsg] = useState('');
  const [qrCodeToGenerate, setQrCodeToGenerate] = useState('https://sante.gouv.bj');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    setItems([
      ...items,
      { name: newItemName, priceXOF: parseFloat(newItemPrice) }
    ]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEmitDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Veuillez ajouter au moins une prestation ou un médicament.");
      return;
    }

    // Check if patient authorization is required but not approved
    const activeRequest = accessRequests.find(r => r.npi === searchNpi && r.doctorEmail === user.email);
    const isApproved = activeRequest?.status === 'approved';
    const searchedInDb = SAMPLE_PATIENTS.find(p => p.npi === searchNpi);

    if (searchedInDb && !isApproved) {
      alert("Erreur de sécurité : L'accès à ce dossier patient n'a pas été autorisé par le citoyen via son application mobile. Veuillez d'abord initier une demande d'accès et attendre sa confirmation.");
      return;
    }

    const totalXOF = items.reduce((acc, it) => acc + it.priceXOF, 0);
    const totalSats = Math.round(totalXOF * XOF_TO_SATS);

    const newDoc: MedicalDocument = {
      id: `doc-${Math.floor(1000 + Math.random() * 9000)}`,
      title: docTitle || `${docType.toUpperCase()} - ${hospital.name}`,
      type: docType,
      items,
      priceXOF: totalXOF,
      priceSats: totalSats
    };

    onEmitDocument(newDoc);
    setSuccessMsg(`Document médical émis avec succès pour ${patientName} !`);
    
    // Reset form
    setDocTitle('Ordonnance Pédiatrique');
    setDocType('prescription');
    setItems([{ name: 'Sirop Paracétamol Enfant', priceXOF: 1200 }]);
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  // NPI Search Action
  const handleNpiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNpi.trim()) return;
    
    const patient = SAMPLE_PATIENTS.find(p => p.npi === searchNpi.trim());
    setSearchedPatient(patient || null);
    setHasSearched(true);

    // If patient is found and already approved, prefill name
    const req = accessRequests.find(r => r.npi === searchNpi.trim() && r.doctorEmail === user.email);
    if (patient && req?.status === 'approved') {
      setPatientName(patient.name);
    }
  };

  // Request patient authorization
  const handleRequestAccess = () => {
    if (!searchNpi) return;
    onAddAccessRequest(searchNpi);
  };

  // Filter appointments for this specific hospital
  const hospitalAppointments = appointments.filter(a => a.hospitalId === hospital.id);

  // Filter paid invoices for this hospital
  const hospitalInvoices = invoices.filter(i => i.hospitalName === hospital.name);
  const totalInvoicedXOF = hospitalInvoices.reduce((acc, inv) => acc + inv.totalXOF, 0);

  // DOWNLOAD FUNCTION 1: Single Invoice Download
  const handleDownloadInvoice = (inv: Invoice) => {
    // Set QR code value first to let React render the canvas
    const verificationUrl = `https://sante.gouv.bj/verifier?id=${inv.id}&tx=${inv.txHash}&total=${inv.totalXOF}&patient=${encodeURIComponent(inv.patientName)}&origin=${encodeURIComponent(window.location.origin)}`;
    setQrCodeToGenerate(verificationUrl);

    setTimeout(() => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [5, 150, 105]; // #059669 (Sante+ Emerald Green)
      const textColor = [28, 28, 30]; // Dark gray
      const lightGray = [120, 120, 128]; // Muted text

      // Fonts & styles
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('SANTÉ+ BÉNIN', 20, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text('RÉSEAU MÉDICAL NATIONAL ET SÉCURISÉ', 20, 30);

      // Line separator
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(20, 35, 190, 35);

      // Header Details
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('REÇU DE TRANSACTION MÉDICALE', 20, 45);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Réf Facture : ${inv.id}`, 20, 52);
      doc.text(`Date de paiement : ${inv.date}`, 20, 57);

      // Etablissement & Medecin Info
      doc.setFont('helvetica', 'bold');
      doc.text('ÉTABLISSEMENT ÉMETTEUR', 20, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.hospitalName}`, 20, 73);
      doc.setFontSize(9);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(`${inv.hospitalAddress}`, 20, 77);

      doc.setFontSize(9.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('MÉDECIN / PRATICIEN CONCERNÉ', 20, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.doctorName || user.name || 'Dr. Jean Sossou'}`, 20, 90);

      // Patient Info
      doc.setFont('helvetica', 'bold');
      doc.text('CITOYEN / PATIENT', 110, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.patientName}`, 110, 73);
      doc.text('Bénin / Nationalité Béninoise', 110, 77);
      doc.text(`Tél : ${inv.patientPhone || "+229 97 88 55 44"}`, 110, 81);

      // Line separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(20, 98, 190, 98);

      // Table header
      doc.setFont('helvetica', 'bold');
      doc.text('Désignation des prestations', 22, 105);
      doc.text('Montant (XOF)', 150, 105);

      doc.line(20, 108, 190, 108);

      // Items
      let y = 115;
      inv.items.forEach((item, index) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`${index + 1}. ${item.name}`, 22, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.priceXOF.toLocaleString('fr-FR')} XOF`, 150, y);
        y += 8;
      });

      doc.line(20, y, 190, y);
      y += 8;

      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL GÉNÉRAL ACQUITTÉ', 22, y);
      doc.text(`${inv.totalXOF.toLocaleString('fr-FR')} XOF`, 150, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(`(~ ${inv.totalSats.toLocaleString('fr-FR')} Satoshis sur réseau Lightning)`, 22, y + 5);

      y += 18;

      // Blockchain Signature Block (Increased height to fit QR Code beautifully)
      doc.setDrawColor(240, 240, 245);
      doc.setFillColor(248, 249, 250);
      doc.rect(20, y, 170, 25, 'F');

      // Draw QR Code next to signature inside the grey block
      const canvas = document.getElementById('pdf-qr-code-canvas') as HTMLCanvasElement;
      if (canvas) {
        try {
          const qrDataUrl = canvas.toDataURL('image/png');
          doc.addImage(qrDataUrl, 'PNG', 164, y + 2.5, 20, 20);
        } catch (err) {
          console.error("Erreur lors de la génération du code QR PDF", err);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(10, 132, 255);
      doc.text('PREUVE DE SÉCURITÉ CRYPTOGRAPHIQUE (BLOCKCHAIN BÉNIN)', 24, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(`Méthode de règlement : ${inv.paymentMethod === 'Wallet' ? 'Portefeuille Prépayé Santé+' : 'Réseau Lightning (Sats)'}`, 24, y + 12);
      doc.text(`Signature d'archivage : ${inv.txHash}`, 24, y + 17);

      // Footer seal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(230, 120, 0);
      doc.text('MINISTÈRE DE LA SANTÉ DU BÉNIN - AGRÉÉ ET CERTIFIÉ CONFORME', 20, 270);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text("Document généré numériquement de manière sécurisée. Ne nécessite pas de signature physique.", 20, 274);

      doc.save(`facture-sante-${inv.id}.pdf`);
    }, 150);
  };

  // DOWNLOAD FUNCTION 2: Global Hospital Activity Report
  const handleDownloadActivityReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [30, 41, 59]; // slate-800
    const accentColor = [10, 132, 255]; // blue
    const textColor = [28, 28, 30];
    const lightGray = [120, 120, 128];

    // Title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('RAPPORT D\'ACTIVITÉ', 20, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${hospital.name.toUpperCase()}`, 20, 31);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, 37);
    doc.text(`Auteur : ${user.email} (${user.role.toUpperCase()}) - ${user.name || 'Gestionnaire'}`, 20, 42);

    // Line separator
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(20, 47, 190, 47);

    // STATISTIQUES SECTION
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. STATISTIQUES DES FLUX FINANCIERS', 20, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre total de règlements perçus :`, 25, 66);
    doc.setFont('helvetica', 'bold');
    doc.text(`${hospitalInvoices.length}`, 105, 66);

    doc.setFont('helvetica', 'normal');
    doc.text(`Chiffre d'affaires total enregistré :`, 25, 73);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalInvoicedXOF.toLocaleString('fr-FR')} XOF`, 105, 73);

    doc.setFont('helvetica', 'normal');
    doc.text(`Équivalent Satoshis cumulé :`, 25, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(totalInvoicedXOF * XOF_TO_SATS).toLocaleString()} Sats`, 105, 80);

    // HISTORIQUE DETAILE
    doc.setFont('helvetica', 'bold');
    doc.text('2. HISTORIQUE DÉTAILLÉ DES FLUX', 20, 95);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(20, 98, 190, 98);

    doc.setFontSize(9);
    doc.text('Réf Facture', 22, 104);
    doc.text('Patient', 55, 104);
    doc.text('Mode de paiement', 105, 104);
    doc.text('Montant (XOF)', 150, 104);

    doc.line(20, 107, 190, 107);

    let y = 113;
    if (hospitalInvoices.length > 0) {
      hospitalInvoices.forEach((inv, idx) => {
        if (y > 200) { // Keep basic pagination guard simple
          doc.addPage();
          y = 25;
        }
        doc.setFont('helvetica', 'normal');
        doc.text(`${inv.id}`, 22, y);
        doc.text(`${inv.patientName}`, 55, y);
        doc.text(`${inv.paymentMethod === 'Wallet' ? 'Wallet Santé+' : 'Lightning Sats'}`, 105, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`${inv.totalXOF.toLocaleString('fr-FR')} XOF`, 150, y);
        y += 7;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text("Aucun paiement enregistré pour l'établissement actuellement.", 22, y);
      y += 7;
    }

    // RENDEZ-VOUS SECTION
    y += 10;
    if (y > 230) {
      doc.addPage();
      y = 25;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. RENDEZ-VOUS DU JOUR ET À VENIR', 20, y);
    y += 4;
    doc.line(20, y, 190, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre de rendez-vous actifs :`, 25, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${hospitalAppointments.length}`, 105, y);
    y += 9;

    if (hospitalAppointments.length > 0) {
      hospitalAppointments.forEach((apt) => {
        if (y > 250) {
          doc.addPage();
          y = 25;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`RDV ${apt.id} : ${apt.patientName} le ${apt.date.split('-').reverse().join('/')} à ${apt.timeSlot}`, 25, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`[${apt.status === 'confirmed' ? 'Confirmé' : 'En attente'}]`, 150, y);
        y += 7;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text("Aucun rendez-vous programmé.", 25, y);
    }

    // Footer certified
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CENTRAL MÉDICAL NATIONAL - CERTIFIÉ CONFORME', 20, 270);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text("Rapport d'activité extrait numériquement. Propulsé par la plateforme Santé+ Bénin.", 20, 274);

    doc.save(`rapport-activite-${hospital.id}.pdf`);
  };

  // Active access check for the searched patient
  const activeRequest = accessRequests.find(r => r.npi === searchNpi && r.doctorEmail === user.email);

  return (
    <div id="hospital-dashboard" className="space-y-6 max-w-5xl mx-auto">
      {/* Hidden QR Code Canvas generator for PDF single invoice */}
      <div style={{ display: 'none' }}>
        <QRCodeCanvas
          id="pdf-qr-code-canvas"
          value={qrCodeToGenerate}
          size={150}
        />
      </div>

      {/* Clinique top Header banner */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Accrédité Ministère de la Santé
          </span>
          <div>
            <h2 className="text-2xl font-black tracking-tight font-sans text-white">{hospital.name}</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>{hospital.address}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xs space-y-1">
            <span className="text-slate-400 block font-medium">Session Professionnelle</span>
            <strong className="text-white block font-sans truncate max-w-[150px]">{user.email}</strong>
            <span className="text-[10px] uppercase font-bold text-amber-400 block">
              {user.role === 'doctor' ? 'Médecin de Garde' : user.role === 'nurse' ? 'Infirmier de Soins' : 'Administrateur'}
            </span>
          </div>
          
          <button
            onClick={onLogout}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl transition-all cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-gray-200/50 rounded-2xl border border-gray-200">
        <button
          onClick={() => setActiveTab('emit')}
          className={`py-3 px-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'emit' ? 'bg-white text-[#059669] shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Émettre un Document de Soins
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`py-3 px-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'appointments' ? 'bg-white text-[#059669] shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Rendez-vous Reçus ({hospitalAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`py-3 px-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'finances' ? 'bg-white text-[#059669] shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rapports & Finances ({hospitalInvoices.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB: EMIT MEDICAL DOCUMENTS */}
        {activeTab === 'emit' && (
          <motion.div
            key="emit-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Form Builder & NPI Search Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* NPI LOOKUP & BLOCKCHAIN CONSENT MODULE */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 bg-emerald-50 text-[#059669] rounded-lg flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold font-sans text-gray-900 leading-tight">Vérification NPI Bénin & Blockchain Bitcoin</h3>
                    <p className="text-[10px] text-gray-400 font-sans">Recherchez et demandez le consentement cryptographique du patient</p>
                  </div>
                </div>

                <form onSubmit={handleNpiSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchNpi}
                    onChange={(e) => setSearchNpi(e.target.value)}
                    placeholder="Saisissez le NPI (ex: 1097885544901)"
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Rechercher"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                {/* Search Results Display */}
                {hasSearched && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border bg-gray-50/50 space-y-3"
                  >
                    {searchedPatient ? (
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center font-sans">
                            {searchedPatient.avatar || 'P'}
                          </div>
                          <div>
                            <strong className="text-gray-900 text-sm block font-sans">{searchedPatient.name}</strong>
                            <span className="text-gray-400 text-[10px] font-semibold font-sans">{searchedPatient.phone} • NPI {searchedPatient.npi}</span>
                          </div>
                        </div>

                        {/* Status Checker */}
                        <div className="flex items-center gap-2">
                          {!activeRequest ? (
                            <button
                              type="button"
                              onClick={handleRequestAccess}
                              className="px-3.5 py-2 bg-[#059669] hover:bg-[#059669]/90 text-white font-bold rounded-xl text-xs font-sans transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Demander l'accès Blockchain
                            </button>
                          ) : activeRequest.status === 'pending' ? (
                            <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-sans font-medium flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                              <span>En attente de confirmation patient...</span>
                            </div>
                          ) : activeRequest.status === 'approved' ? (
                            <div className="flex flex-col items-end">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-sans font-bold flex items-center gap-1.5 text-xs">
                                <Unlock className="w-3.5 h-3.5 text-[#00D26A]" />
                                <span>Accès Cryptographique Déverrouillé !</span>
                              </span>
                              <span className="text-[9px] text-[#00D26A] font-mono mt-0.5 max-w-[200px] truncate block">TX: {activeRequest.blockchainTxHash}</span>
                            </div>
                          ) : (
                            <span className="bg-red-50 text-red-800 border border-red-200 px-3 py-1.5 rounded-xl font-sans font-semibold text-xs flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                              <span>Accès Refusé par le patient</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-600 font-sans p-2 bg-red-50/50 border border-red-100 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>Aucun dossier patient associé au NPI <strong>{searchNpi}</strong> n'a été trouvé. Veuillez vérifier les 13 chiffres.</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* MAIN PORTAL AREA */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-2xs space-y-6 relative overflow-hidden">
                {/* Shield alert overlay if patient is not authorized and not QR-scanned */}
                {searchedPatient && activeRequest?.status !== 'approved' && unlockedRecordNpi !== searchedPatient.npi && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-xs space-y-4">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-md font-sans font-extrabold text-gray-900 leading-tight">Dossier Patient Verrouillé</h4>
                      <p className="text-xs text-gray-500 font-sans leading-relaxed">
                        Conformément au code de déontologie numérique béninois, vous devez obtenir le consentement du patient {searchedPatient.name} via son application Santé+ avant de pouvoir lui émettre un document ou un débit.
                      </p>
                      <button
                        onClick={handleRequestAccess}
                        className="w-full py-2 bg-[#059669] hover:bg-[#059669]/90 text-white font-sans font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Initier la demande d'autorisation Blockchain
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-tabs Selection for unlocked patient */}
                {searchedPatient && (activeRequest?.status === 'approved' || unlockedRecordNpi === searchedPatient.npi) && (
                  <div className="flex border-b border-gray-200 pb-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPraticienSubTab('consultations')}
                      className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        praticienSubTab === 'consultations'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans'
                          : 'text-gray-500 hover:text-gray-800 font-sans'
                      }`}
                    >
                      <Database className="w-4 h-4 text-emerald-600" />
                      Dossier Médical Immuable ({consultationsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPraticienSubTab('billing')}
                      className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        praticienSubTab === 'billing'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans'
                          : 'text-gray-500 hover:text-gray-800 font-sans'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      Facturation & Actes
                    </button>
                  </div>
                )}

                {/* SUBTAB 1: IMMUABLE MEDICAL HISTORY */}
                {praticienSubTab === 'consultations' && searchedPatient && (activeRequest?.status === 'approved' || unlockedRecordNpi === searchedPatient.npi) && (
                  <div className="space-y-6">
                    {/* Add consultation trigger */}
                    <div className="flex justify-between items-center bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/50">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-600" />
                          Mise à jour médicale sécurisée
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          Toutes les modifications sont signées cryptographiquement et ancrées sur Bitcoin.
                        </p>
                      </div>
                      {!showAddRecordForm && (
                        <button
                          type="button"
                          onClick={() => { setShowAddRecordForm(true); setBlockchainSuccessMsg(null); }}
                          className="px-4 py-2 bg-[#059669] hover:bg-[#059669]/90 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter une Entrée
                        </button>
                      )}
                    </div>

                    {/* Success notification with Bitcoin Anchor details */}
                    {blockchainSuccessMsg && (
                      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-xs text-emerald-800 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl"></div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <strong className="text-sm block font-sans text-emerald-950">Mise à jour Médicale Enregistrée !</strong>
                            <p className="text-gray-600 font-sans">
                              L'entrée a été ajoutée avec succès au dossier de {searchedPatient.name} et verrouillée cryptographiquement.
                            </p>
                          </div>
                        </div>
                        <div className="bg-white/80 border border-emerald-100 p-3 rounded-xl font-mono text-[10px] space-y-1">
                          <div className="flex justify-between"><span className="text-gray-400">ID Diagnostic:</span> <span className="font-bold text-gray-800">{blockchainSuccessMsg.recordId}</span></div>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                            <span className="text-gray-400">Ancrage Bitcoin (TX Hash):</span> 
                            <span className="font-semibold text-emerald-700 truncate max-w-[250px]" title={blockchainSuccessMsg.txHash}>{blockchainSuccessMsg.txHash}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBlockchainSuccessMsg(null)}
                          className="px-3 py-1.5 bg-[#059669] text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>
                    )}

                    {/* Add record form */}
                    {showAddRecordForm && (
                      <form onSubmit={handleAddConsultationRecord} className="p-5 border border-gray-100 rounded-3xl bg-gray-50/50 space-y-4 text-left">
                        <div className="space-y-1 pb-2 border-b border-gray-200/60">
                          <h4 className="text-xs font-bold text-gray-800">Ajouter une consultation médicale</h4>
                          <p className="text-[10px] text-gray-400 font-sans">Veuillez renseigner les observations cliniques et le traitement.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 block">Nom du Médecin *</label>
                            <input
                              type="text"
                              required
                              value={newRecordInput.doctor}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, doctor: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 block">Hôpital / Clinique *</label>
                            <input
                              type="text"
                              required
                              value={newRecordInput.hospital}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, hospital: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 block">Raison de la visite</label>
                            <input
                              type="text"
                              placeholder="Ex: Fièvre persistante, maux de tête"
                              value={newRecordInput.reason}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, reason: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 block">Diagnostic Clinique *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Paludisme simple"
                              value={newRecordInput.diagnosis}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, diagnosis: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 block">Prescription Médicamenteuse</label>
                          <textarea
                            placeholder="Ex: Artéméthère-Luméfantrine 20/120mg, 1 cp matin et soir..."
                            value={newRecordInput.prescription}
                            onChange={(e) => setNewRecordInput({ ...newRecordInput, prescription: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            rows={2}
                          />
                        </div>

                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 space-y-3">
                          <h5 className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Carnet Détaillé du Traitement</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Objectif du plan de traitement"
                              value={newRecordInput.treatmentPlan}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, treatmentPlan: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                            <input
                              type="text"
                              placeholder="Molécule / Classe thérapeutique"
                              value={newRecordInput.medication}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, medication: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                            <input
                              type="text"
                              placeholder="Posologie (ex: 2 comprimés par jour)"
                              value={newRecordInput.dosage}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, dosage: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                            <input
                              type="text"
                              placeholder="Fréquence (ex: Matin et Soir après repas)"
                              value={newRecordInput.frequency}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, frequency: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                            <input
                              type="text"
                              placeholder="Durée (ex: 3 jours)"
                              value={newRecordInput.duration}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, duration: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                            <input
                              type="text"
                              placeholder="Suivi (ex: Visite de contrôle sous 7 jours)"
                              value={newRecordInput.followUp}
                              onChange={(e) => setNewRecordInput({ ...newRecordInput, followUp: e.target.value })}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-sans"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 block">Observations cliniques & Conseils</label>
                          <textarea
                            placeholder="Observations supplémentaires, repos médical, conseils alimentaires..."
                            value={newRecordInput.notes}
                            onChange={(e) => setNewRecordInput({ ...newRecordInput, notes: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Signer & Enregistrer la mise à jour
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddRecordForm(false)}
                            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    )}

                    {/* consultations feed */}
                    <div className="space-y-3 text-left">
                      <h4 className="text-xs font-bold text-gray-600 block">Historique Médical du Patient ({consultationsList.length})</h4>
                      
                      {consultationsList.length === 0 ? (
                        <div className="p-8 border border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                          <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs">Aucune consultation enregistrée pour ce dossier.</p>
                        </div>
                      ) : (
                        consultationsList.map(cons => (
                          <div key={cons.id} className="border border-gray-100 rounded-2xl bg-gray-50/20 overflow-hidden shadow-3xs">
                            <button
                              type="button"
                              onClick={() => setExpandedConsultationId(expandedConsultationId === cons.id ? null : cons.id)}
                              className="w-full p-4 text-left hover:bg-gray-50/50 flex justify-between items-start transition cursor-pointer text-xs font-sans"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">{cons.date} à {cons.time}</span>
                                  {cons.verified && <span className="bg-emerald-50 text-[#00D26A] border border-emerald-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Certifié Bitcoin</span>}
                                </div>
                                <p className="text-gray-500 font-sans">
                                  Médecin : <strong className="text-gray-700">{cons.doctor}</strong> • Hôpital : <strong className="text-gray-700">{cons.hospital}</strong>
                                </p>
                                <p className="font-bold text-emerald-950 font-sans">Diag: {cons.diagnosis}</p>
                              </div>
                              <Eye className={`w-4 h-4 mt-0.5 transition ${expandedConsultationId === cons.id ? 'text-emerald-600' : 'text-gray-400'}`} />
                            </button>

                            {expandedConsultationId === cons.id && (
                              <div className="px-4 pb-4 border-t border-gray-100 bg-white text-xs font-sans space-y-3 pt-3">
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Motif de visite</span>
                                    <p className="text-gray-700 mt-0.5">{cons.reason}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Ordonnance / Traitement</span>
                                    <p className="text-gray-700 mt-0.5">{cons.prescription || 'Pas de prescription'}</p>
                                  </div>
                                </div>
                                
                                {cons.notes && (
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Observations cliniques</span>
                                    <p className="text-gray-700 mt-0.5">{cons.notes}</p>
                                  </div>
                                )}

                                {(cons.treatmentPlan || cons.medication || cons.dosage || cons.frequency || cons.duration || cons.followUp) && (
                                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                                    <span className="text-[9px] font-extrabold uppercase text-emerald-900 tracking-wider block mb-1.5 font-sans">📘 Carnet de traitement détaillé</span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-800 text-[11px]">
                                      {cons.treatmentPlan && <div><span className="font-bold">Plan:</span> {cons.treatmentPlan}</div>}
                                      {cons.medication && <div><span className="font-bold">Molécule:</span> {cons.medication}</div>}
                                      {cons.dosage && <div><span className="font-bold">Posologie:</span> {cons.dosage}</div>}
                                      {cons.frequency && <div><span className="font-bold">Fréquence:</span> {cons.frequency}</div>}
                                      {cons.duration && <div><span className="font-bold">Durée:</span> {cons.duration}</div>}
                                      {cons.followUp && <div><span className="font-bold">Suivi:</span> {cons.followUp}</div>}
                                    </div>
                                  </div>
                                )}

                                <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-[10px] text-indigo-900 font-mono flex items-center gap-1 break-all">
                                  <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>Hash immuable : {cons.hash}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: BILLING & PROCEDURES */}
                {(praticienSubTab === 'billing' || !searchedPatient) && (
                  <>
                    <div className="space-y-1 text-left">
                      <h3 className="text-lg font-bold font-sans text-gray-900">Nouveau dossier de frais ou ordonnance</h3>
                      <p className="text-xs text-gray-400 font-sans">Rédigez des ordonnances ou factures instantanément réglables</p>
                    </div>

                    {successMsg && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 text-[#00D26A] text-xs font-bold rounded-2xl flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleEmitDoc} className="space-y-4 text-left">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patient target */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-600 block">Nom du Patient</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                              placeholder="Ex: Bienvenue Segnon"
                            />
                          </div>
                        </div>

                        {/* Document Type */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-600 block">Catégorie d'acte</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full bg-gray-50 border border-gray-200 text-xs font-sans font-semibold px-3 py-2 rounded-xl text-gray-800"
                          >
                            <option value="analyses">Analyses Médicales / Labo</option>
                            <option value="prescription">Ordonnance Pharmacie</option>
                            <option value="devis">Devis de Soins / Consultation</option>
                          </select>
                        </div>
                      </div>

                      {/* Document descriptive title */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 block">Libellé du dossier médical</label>
                        <input
                          type="text"
                          required
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                          placeholder="Ex: Traitement anti-paludéen ou NFS"
                        />
                      </div>

                      {/* ITEMS LIST BUILDER */}
                      <div className="space-y-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                        <span className="text-xs font-bold text-gray-700 block">Actes ou Produits inclus</span>
                        
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                                <div className="font-sans">
                                  <span className="font-bold text-gray-800">{it.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-gray-900">{it.priceXOF.toLocaleString('fr-FR')} XOF</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Aucun élément ajouté. Veuillez en ajouter ci-dessous.</p>
                        )}

                        {/* Add item sub-form */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2 border-t border-gray-100">
                          <div className="md:col-span-7">
                            <input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="Désignation (ex: Doliprane 1g)"
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <input
                              type="number"
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(e.target.value)}
                              placeholder="Tarif XOF"
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-gray-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="md:col-span-2 py-1.5 px-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Ajouter
                          </button>
                        </div>
                      </div>

                      {/* Emit triggers */}
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-[#059669] hover:bg-[#059669]/95 text-white font-bold font-sans rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Mettre à disposition du Patient
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Quick Helper column */}
            <div className="space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Consentement NPI & Blockchain</h4>
                <p className="text-xs text-gray-600 leading-relaxed font-sans">
                  Saisissez l'identifiant NPI à 13 chiffres de votre patient pour établir la connexion.
                </p>
                <p className="text-xs text-gray-600 leading-relaxed font-sans">
                  Le citoyen reçoit instantanément une notification d'accès sur son mobile et confirme la transaction en signant cryptographiquement sur la blockchain Bitcoin.
                </p>
                <div className="p-3 bg-white border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-sans font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0" />
                  Transaction cryptographique instantanée
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Rappel d'accès de sécurité</span>
                <p className="text-[11px] text-amber-700 leading-relaxed font-sans">
                  Chaque recherche de patient par NPI et signature d'accès est consignée de manière immuable sur la blockchain Santé+. Tout abus est passible de sanctions.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: VIEW RECEIVED APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <motion.div
            key="appointments-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-2xs space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-sans text-gray-900">Demandes de Rendez-vous Patients</h3>
              <p className="text-xs text-gray-400 font-sans">Historique des réservations effectuées sur la plateforme pour votre établissement</p>
            </div>

            {hospitalAppointments.length > 0 ? (
              <div className="space-y-3">
                {hospitalAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 border border-gray-100 hover:border-gray-200 rounded-2xl bg-gray-50/30 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all text-xs font-sans">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm">{apt.patientName}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-[#059669] text-[10px] rounded-md font-bold uppercase tracking-wider">
                          Réf : {apt.id}
                        </span>
                      </div>
                      <p className="text-gray-500 font-sans">
                        Créneau demandé : <strong>{apt.date.split('-').reverse().join('/')}</strong> à <strong>{apt.timeSlot}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {apt.status === 'confirmed' ? (
                        <span className="text-[#00D26A] font-bold flex items-center gap-1 text-xs font-sans">
                          <CheckSquare className="w-4 h-4" />
                          Confirmé & Validé
                        </span>
                      ) : (
                        <button
                          onClick={() => onConfirmAppointment(apt.id)}
                          className="px-3.5 py-2 bg-[#059669] hover:bg-[#059669]/95 text-white font-bold rounded-xl text-xs font-sans transition-all cursor-pointer"
                        >
                          Valider le rendez-vous
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-3xl">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600 font-sans">Aucun rendez-vous enregistré</p>
                <p className="text-xs text-gray-400 mt-1 font-sans">Les patients peuvent réserver via la carte d'Abomey-Calavi.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: STATS & FINANCIAL OVERVIEW */}
        {activeTab === 'finances' && (
          <motion.div
            key="finances-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Download controls bar as per downloads request */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-xs font-bold uppercase text-amber-800 tracking-wider">Téléchargements d'activités cliniques</h4>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Exportez l'état complet de vos règlements et statistiques sous format PDF officiel (.pdf).
                </p>
              </div>
              <button
                onClick={handleDownloadActivityReport}
                className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                Télécharger le Rapport d'Activité
              </button>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-3xs text-xs font-sans space-y-1">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Chiffre d'Affaires perçu</span>
                <strong className="text-xl font-bold text-gray-900 block font-sans">{totalInvoicedXOF.toLocaleString('fr-FR')} XOF</strong>
                <span className="text-[10px] text-[#00D26A] block font-medium">Contrevaleur réglée via Santé+</span>
              </div>
              
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-3xs text-xs font-sans space-y-1">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Transactions Validées</span>
                <strong className="text-xl font-bold text-gray-900 block font-sans">{hospitalInvoices.length} factures</strong>
                <span className="text-[10px] text-gray-400 block font-medium">100% sécurisé via wallet & Lightning</span>
              </div>

              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-3xs text-xs font-sans space-y-1">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Fonds Bitcoin collectés</span>
                <strong className="text-xl font-mono font-bold text-amber-500 block">
                  {Math.round(totalInvoicedXOF * XOF_TO_SATS).toLocaleString()} Sats
                </strong>
                <span className="text-[10px] text-amber-600 block font-semibold">Taux d'échange instantané actif</span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-2xs space-y-4">
              <h3 className="text-md font-bold font-sans text-gray-900">Grand Livre des Encaissements</h3>
              
              {hospitalInvoices.length > 0 ? (
                <div className="space-y-3">
                  {hospitalInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 border border-gray-100 hover:border-gray-200 rounded-2xl bg-gray-50/30 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all text-xs font-sans">
                      {/* Left: Transaction metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-[#00D26A] text-[9px] font-extrabold rounded-md uppercase tracking-wider">
                            Réf : {inv.id}
                          </span>
                          <span className="text-gray-400 text-[11px] font-sans">({inv.date})</span>
                        </div>
                        <p className="text-gray-500 text-[11px] font-sans">
                          Moyen de règlement : <strong className="text-gray-700">{inv.paymentMethod === 'Wallet' ? 'Portefeuille Prépayé' : 'Sats ⚡'}</strong>
                        </p>
                      </div>

                      {/* Right: Patient Name and Price (aligned perfectly) */}
                      <div className="flex items-center gap-4 sm:text-right">
                        <div>
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Patient</p>
                          <strong className="text-gray-900 text-sm block font-sans">{inv.patientName}</strong>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-200"></div>

                        <div className="text-right min-w-[90px]">
                          <strong className="text-emerald-700 text-sm block font-bold font-sans">{inv.totalXOF.toLocaleString('fr-FR')} XOF</strong>
                          <span className="text-[10px] text-amber-600 font-mono font-bold block">{inv.totalSats.toLocaleString()} Sats ⚡</span>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 border border-gray-100 transition-all cursor-pointer"
                          title="Télécharger le reçu (PDF)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-3xl">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600 font-sans">Aucun encaissement enregistré</p>
                  <p className="text-xs text-gray-400 mt-1 font-sans">Dès qu'un patient réglera ses actes médicaux, ils apparaîtront ici.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Camera QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleScanQR}
          onClose={() => setShowScanner(false)}
          title="Scanner le QR Code Patient"
          instruction="Présentez le QR Code de consultation généré sur le mobile du patient."
        />
      )}
    </div>
  );
}

interface SuperAdminDashboardProps {
  user: HospitalUser;
  hospitals: Hospital[];
  onVerifyHospital?: (id: string) => void;
  onAddHospital?: (newHosp: any) => Promise<Hospital>;
  onLogout: () => void;
}

function SuperAdminDashboard({
  user,
  hospitals,
  onVerifyHospital,
  onAddHospital,
  onLogout
}: SuperAdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'list' | 'add'>('list');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields for manually adding a hospital
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private' | 'clinic'>('clinic');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('Ouvert 24h/24');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const pendingHospitals = hospitals.filter(h => !h.isVerified);
  const activeHospitals = hospitals.filter(h => h.isVerified);

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!onAddHospital) return;

    onAddHospital({
      name,
      type,
      address,
      phone,
      hours,
      email: adminEmail,
      password: adminPassword
    })
    .then(() => {
      setSuccessMsg(`L'établissement "${name}" a été ajouté et activé avec succès !`);
      // Reset form
      setName('');
      setAddress('');
      setPhone('');
      setHours('Ouvert 24h/24');
      setAdminEmail('');
      setAdminPassword('');
      setTimeout(() => {
        setSuccessMsg('');
        setAdminTab('list');
      }, 3000);
    })
    .catch(err => {
      console.error(err);
      setErrorMsg("Une erreur est survenue lors de l'ajout.");
    });
  };

  const handleVerify = (id: string, hName: string) => {
    if (!onVerifyHospital) return;
    onVerifyHospital(id);
    setSuccessMsg(`L'établissement "${hName}" a été validé et activé sur le réseau national.`);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-black uppercase tracking-wider font-sans">
              <ShieldCheck className="w-3.5 h-3.5" />
              MINISTÈRE DE LA SANTÉ BÉNIN
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-sans tracking-tight">Espace d'Administration Nationale</h1>
            <p className="text-xs text-slate-400 font-sans">Gestion des accréditations d'établissements de soins - Abomey-Calavi</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            Se déconnecter
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold font-sans">Total Hôpitaux</span>
            <strong className="text-xl md:text-2xl font-black font-sans text-white">{hospitals.length}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold font-sans">Établissements Agréés</span>
            <strong className="text-xl md:text-2xl font-black font-sans text-emerald-400">{activeHospitals.length}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold font-sans">Demandes en attente</span>
            <strong className={`text-xl md:text-2xl font-black font-sans ${pendingHospitals.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {pendingHospitals.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setAdminTab('list')}
          className={`pb-3 text-sm font-bold font-sans transition-all relative cursor-pointer ${
            adminTab === 'list' ? 'text-[#059669]' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {adminTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#059669] rounded-full" />}
          Accréditations & Établissements ({hospitals.length})
        </button>
        <button
          onClick={() => setAdminTab('add')}
          className={`pb-3 text-sm font-bold font-sans transition-all relative cursor-pointer ${
            adminTab === 'add' ? 'text-[#059669]' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {adminTab === 'add' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#059669] rounded-full" />}
          Ajouter manuellement un centre
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-[#059669] rounded-2xl text-xs font-bold font-sans flex items-center gap-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold font-sans">
          {errorMsg}
        </div>
      )}

      {/* Tab Contents */}
      {adminTab === 'list' ? (
        <div className="space-y-6">
          {/* SECTION 1: PENDING SIGNUP REQUESTS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black font-sans uppercase tracking-wider text-slate-700">Demandes d'inscription en attente d'agrément ({pendingHospitals.length})</h3>
            
            {pendingHospitals.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {pendingHospitals.map(h => (
                  <div key={h.id} className="p-5 bg-amber-50/50 border border-amber-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-amber-50/80">
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-900 font-sans">{h.name}</h4>
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-bold uppercase">{h.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-sans"><strong>Adresse:</strong> {h.address}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-sans font-medium">
                        <span><strong>Tél:</strong> {h.phone}</span>
                        <span><strong>Ouverture:</strong> {h.hours}</span>
                        <span className="text-[#059669]"><strong>Admin:</strong> {h.adminEmail || 'Non spécifié'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerify(h.id, h.name)}
                      className="px-4 py-2.5 bg-[#059669] hover:bg-[#059669]/90 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 self-end md:self-auto"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-200" />
                      Confirmer & Activer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl space-y-2">
                <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-500 font-sans">Aucune demande d'inscription en attente</p>
                <p className="text-[11px] text-gray-400 font-sans">Toutes les demandes d'accréditations de Calavi sont déjà validées.</p>
              </div>
            )}
          </div>

          {/* SECTION 2: ACTIVE REGISTERED HOSPITALS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black font-sans uppercase tracking-wider text-slate-700">Établissements Actifs et Agréés ({activeHospitals.length})</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeHospitals.map(h => (
                <div key={h.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-start gap-3 text-left hover:border-slate-300 transition-all">
                  <div className="w-10 h-10 bg-emerald-50 text-[#059669] border border-emerald-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-gray-900 font-sans truncate max-w-[200px]">{h.name}</h4>
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{h.type}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-sans truncate">{h.address}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-400 font-sans font-medium">Tél: {h.phone}</span>
                      <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Agréé
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TAB: ADD HOSPITAL MANUALLY */
        <form onSubmit={handleSubmitAdd} className="bg-white border border-gray-100 rounded-3xl p-6 text-left max-w-xl space-y-4 shadow-3xs">
          <div className="space-y-1">
            <h3 className="text-sm font-black font-sans text-gray-800 uppercase tracking-wide">Ajout d'un nouvel établissement</h3>
            <p className="text-xs text-gray-400 font-sans">Ce formulaire ajoute directement un établissement actif au réseau national.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 font-sans block mb-1">Nom de l'établissement</label>
            <input
              type="text"
              required
              placeholder="Ex : Centre Hospitalier du Plateau"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 font-sans block mb-1">Type d'établissement</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#059669]"
            >
              <option value="clinic">Clinique Médicale Privée</option>
              <option value="public">Hôpital Public de Zone</option>
              <option value="private">Hôpital Privé</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 font-sans block mb-1">Adresse de l'établissement</label>
            <input
              type="text"
              required
              placeholder="Ex : Kpota, à côté de la pharmacie, Calavi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 font-sans block mb-1">Téléphone de contact</label>
              <input
                type="tel"
                required
                placeholder="Ex : +229 97 22 11 33"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 font-sans block mb-1">Horaires d'ouverture</label>
              <input
                type="text"
                required
                placeholder="Ex : 24h/24, 7j/7"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans block">Création du compte administrateur local</span>
            
            <div>
              <label className="text-xs font-bold text-gray-600 font-sans block mb-1">Adresse e-mail de l'administrateur</label>
              <input
                type="email"
                required
                placeholder="Ex : admin.plateau@sante.bj"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 font-sans block mb-1">Mot de passe de l'administrateur</label>
              <input
                type="password"
                required
                placeholder="Définir un mot de passe d'accès"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-sans text-[#1C1C1E] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#059669] hover:bg-[#059669]/95 text-white text-xs font-bold font-sans rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajouter & Activer l'Établissement</span>
          </button>
        </form>
      )}
    </div>
  );
}
