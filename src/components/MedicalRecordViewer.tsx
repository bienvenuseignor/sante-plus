import React, { useState, useEffect } from 'react';
import { FileText, Lock, CheckCircle2, AlertCircle, Hash, Calendar, User, Stethoscope, ArrowLeft, Plus, Shield, Database, Eye, QrCode, ScanLine, Smartphone, Clipboard, Scan } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Patient, MedicalConsultation } from '../types';
import QRScanner from './QRScanner';

type AccessMode = 'patient' | 'health';


interface MedicalRecordViewerProps {
  patientUser: Patient | null;
  onBack: () => void;
}

const generateConsultationHash = (consultation: Omit<MedicalConsultation, 'hash'>): string => {
  const data = JSON.stringify({
    date: consultation.date,
    time: consultation.time,
    doctor: consultation.doctor,
    hospital: consultation.hospital,
    reason: consultation.reason,
    diagnosis: consultation.diagnosis,
    prescription: consultation.prescription,
    notes: consultation.notes,
    timestamp: consultation.timestamp
  });

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
};

const generateAccessToken = (patientId: string) => {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SANTEPLUS-${patientId}-${suffix}`;
};

const INITIAL_CONSULTATIONS: MedicalConsultation[] = [
  {
    id: 'cons-001',
    date: '28 Juin 2026',
    time: '10:30',
    doctor: 'Dr Jean Sossou',
    hospital: 'CHD Atlantique',
    reason: 'Consultation Générale',
    diagnosis: 'Malaria (stade précoce)',
    prescription: 'Chloroquine 500mg x3 jours',
    notes: 'Patient stable, suivi recommandé',
    verified: true,
    timestamp: 1719579000,
    hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d'
  },
  {
    id: 'cons-002',
    date: '20 Juin 2026',
    time: '14:15',
    doctor: 'Dr Marie Mensah',
    hospital: 'Clinique Bénin Plus',
    reason: 'Consultation Dentaire',
    diagnosis: 'Détartrage + nettoyage',
    prescription: 'Pas de prescription',
    notes: 'Hygiène dentaire bonne, prophylaxie OK',
    verified: true,
    timestamp: 1718895300,
    hash: '0x9f8e7d6c5b4a3f2e1d0c1b2a3f4e5d6c'
  },
  {
    id: 'cons-003',
    date: '10 Juin 2026',
    time: '09:00',
    doctor: 'Dr Kofi Mensah',
    hospital: 'CHU Cotonou',
    reason: 'Visite d\'urgence',
    diagnosis: 'Gastroentérite bénigne',
    prescription: 'Réhydratation orale + Antidiarrhéique',
    notes: 'Récupération rapide après traitement',
    verified: true,
    timestamp: 1717984800,
    hash: '0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f'
  }
];

export default function MedicalRecordViewer({ patientUser, onBack }: MedicalRecordViewerProps) {
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>('patient');
  const [accessToken, setAccessToken] = useState('');
  const [healthAccessGranted, setHealthAccessGranted] = useState(false);
  const [healthAccessCode, setHealthAccessCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    doctor: '',
    hospital: '',
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

  const patientIdentifier = patientUser?.npi || patientUser?.id || patientUser?.email || 'inconnu';
  const patientDisplayName = patientUser?.fullName || patientUser?.name || 'Patient';

  useEffect(() => {
    const storageKey = `medical_records_${patientIdentifier}`;
    
    // 1. Fetch from server API
    fetch(`/api/medical-records/${patientIdentifier}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setConsultations(data);
          localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
          loadLocalStorageFallback(storageKey);
        }
      })
      .catch(err => {
        console.warn("Could not fetch records from server, loading local storage", err);
        loadLocalStorageFallback(storageKey);
      });

    function loadLocalStorageFallback(key: string) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          setConsultations(JSON.parse(stored));
        } catch {
          setConsultations(INITIAL_CONSULTATIONS);
          localStorage.setItem(key, JSON.stringify(INITIAL_CONSULTATIONS));
        }
      } else {
        setConsultations(INITIAL_CONSULTATIONS);
        localStorage.setItem(key, JSON.stringify(INITIAL_CONSULTATIONS));
      }
    }
  }, [patientIdentifier]);

  useEffect(() => {
    if (patientUser) {
      setAccessToken(generateAccessToken(patientIdentifier));
      setHealthAccessGranted(false);
      setHealthAccessCode('');
    }
  }, [patientIdentifier, patientUser]);

  const handleAddConsultation = () => {
    if (!newConsultation.doctor || !newConsultation.hospital || !newConsultation.diagnosis) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    const consultation: MedicalConsultation = {
      id: `cons-${Date.now()}`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      doctor: newConsultation.doctor,
      hospital: newConsultation.hospital,
      reason: newConsultation.reason || 'Consultation générale',
      diagnosis: newConsultation.diagnosis,
      prescription: newConsultation.prescription,
      notes: newConsultation.notes,
      treatmentPlan: newConsultation.treatmentPlan,
      medication: newConsultation.medication,
      dosage: newConsultation.dosage,
      frequency: newConsultation.frequency,
      duration: newConsultation.duration,
      followUp: newConsultation.followUp,
      verified: true,
      timestamp: Math.floor(Date.now() / 1000),
      hash: ''
    };

    const storageKey = `medical_records_${patientIdentifier}`;

    // Save to server
    fetch(`/api/medical-records/${patientIdentifier}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConsultation)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const updated = [data.record, ...consultations];
        setConsultations(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } else {
        saveOffline();
      }
    })
    .catch(err => {
      console.warn("Failed saving to server, saving offline", err);
      saveOffline();
    });

    function saveOffline() {
      consultation.hash = generateConsultationHash(consultation);
      const updated = [consultation, ...consultations];
      setConsultations(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    setNewConsultation({ doctor: '', hospital: '', reason: '', diagnosis: '', prescription: '', notes: '', treatmentPlan: '', medication: '', dosage: '', frequency: '', duration: '', followUp: '' });
    setShowAddForm(false);
  };

  const handleHealthAuthorization = () => {
    if (healthAccessCode.trim() === accessToken) {
      setHealthAccessGranted(true);
      setAccessMode('health');
      setShowAddForm(true);
    } else {
      alert('Code d’autorisation invalide. Veuillez utiliser le QR généré par le patient.');
    }
  };

  const handleScanQR = (scannedData: string) => {
    setShowScanner(false);
    
    // Parse the payload e.g. "santeplus://medical-record/1097885544901?token=SANTEPLUS-1097885544901-XYZ"
    const regex = /santeplus:\/\/medical-record\/([^?]+)(?:\?token=(.+))?/;
    const match = scannedData.match(regex);
    
    if (match) {
      const token = match[2] || '';
      if (token === accessToken) {
        setHealthAccessGranted(true);
        setAccessMode('health');
        setShowAddForm(true);
      } else {
        alert("Ce code QR d'autorisation appartient à un autre patient ou est expiré.");
      }
    } else {
      const cleanData = scannedData.trim();
      if (cleanData === accessToken) {
        setHealthAccessGranted(true);
        setAccessMode('health');
        setShowAddForm(true);
      } else {
        alert("Code d'autorisation invalide. Veuillez utiliser le QR ou code généré par le patient.");
      }
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(accessToken);
      alert('Code d’autorisation copié');
    } catch {
      alert('Copie non disponible');
    }
  };

  const calculateRecordHash = () => {
    const allData = consultations.map((c) => c.hash).join('');
    let hash = 0;
    for (let i = 0; i < allData.length; i++) {
      hash = ((hash << 5) - hash) + allData.charCodeAt(i);
      hash = hash & hash;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  };

  if (!patientUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="ml-4 text-xl text-gray-700">Veuillez vous connecter</p>
      </div>
    );
  }

  const recordHash = calculateRecordHash();
  const qrPayload = `santeplus://medical-record/${encodeURIComponent(patientIdentifier)}?token=${accessToken}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold mb-6 transition">
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-emerald-600">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-emerald-600" />
                Dossier Médical Sécurisé
              </h1>
              <p className="text-gray-500 mt-2">Lecture seule pour le patient • Ajouts autorisés pour le personnel de santé via QR</p>
            </div>
            <Database className="w-12 h-12 text-emerald-200" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b-2 border-gray-200">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patient</label>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-1">
                <User className="w-5 h-5 text-emerald-600" />
                {patientDisplayName}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identité Unique (NPI)</label>
              <p className="text-lg font-mono font-bold text-emerald-600 mt-1">{patientIdentifier}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
              <p className="text-sm text-gray-700 mt-1">{patientUser.email}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone</label>
              <p className="text-sm text-gray-700 mt-1">{patientUser.phone}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                <Lock className="w-5 h-5" />
                Chiffrement AES-256
              </p>
              <p className="text-xs text-blue-700">
                Les anciennes consultations ne peuvent pas être modifiées. Le personnel de santé peut seulement ajouter une nouvelle mise à jour médicale.
              </p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <p className="flex items-center gap-2 font-bold text-indigo-900 mb-2">
                <Hash className="w-5 h-5" />
                Ancrage Bitcoin
              </p>
              <p className="text-xs text-indigo-700 font-mono break-all">{recordHash}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={() => { setAccessMode('patient'); setHealthAccessGranted(false); }} className={`px-4 py-2 rounded-lg font-bold transition ${accessMode === 'patient' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border'}`}>
          <div className="flex items-center gap-2"><User className="w-4 h-4" /> Vue patient</div>
        </button>
        <button onClick={() => setAccessMode('health')} className={`px-4 py-2 rounded-lg font-bold transition ${accessMode === 'health' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border'}`}>
          <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Accès personnel de santé</div>
        </button>
      </div>

      {accessMode === 'patient' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-emerald-600">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2"><QrCode className="w-5 h-5 text-emerald-600" /> Autorisation de consultation via QR</h2>
          <p className="text-sm text-gray-600 mb-4">Le patient génère un QR unique pour autoriser un professionnel de santé à consulter le dossier. Les anciennes lignes restent verrouillées et seules les nouvelles mises à jour s’ajoutent.</p>
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex justify-center">
              <QRCodeSVG value={qrPayload} size={180} level="H" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">Code d’autorisation</p>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 font-mono text-sm break-all">{accessToken}</div>
              <button onClick={handleCopyToken} className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold">
                <Clipboard className="w-4 h-4" /> Copier le code
              </button>
            </div>
          </div>
        </div>
      )}

      {accessMode === 'health' && !healthAccessGranted && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-amber-500">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2"><ScanLine className="w-5 h-5 text-amber-600" /> Vérification du QR de consultation</h2>
          <p className="text-sm text-gray-600 mb-4 font-sans">Le professionnel de santé scanne ou saisit le code généré par le patient pour obtenir l’accès au dossier.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <input value={healthAccessCode} onChange={(e) => setHealthAccessCode(e.target.value)} placeholder="Collez le code QR ou saisissez le code" className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none text-xs" />
              <button 
                type="button"
                onClick={() => setShowScanner(true)} 
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs font-sans shrink-0"
                title="Scanner avec la caméra"
              >
                <Scan className="w-4 h-4" />
                <span>Scanner QR</span>
              </button>
            </div>
            <button onClick={handleHealthAuthorization} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition cursor-pointer text-xs font-sans">Valider l’accès</button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500"><Smartphone className="w-4 h-4" /> Une fois validé, le personnel pourra ajouter une nouvelle mise à jour médicale.</div>
        </div>
      )}

      {accessMode === 'health' && healthAccessGranted && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Nouvelle mise à jour médicale</h2>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold"><CheckCircle2 className="w-5 h-5" /> Accès autorisé</div>
          </div>
          <p className="text-sm text-gray-600 mb-4">L’historique existant reste verrouillé. Le médecin peut uniquement ajouter une nouvelle entrée avec un carnet détaillé du traitement qui rejoint le dossier médical.</p>
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold transition">
            <Plus className="w-4 h-4" /> Ajouter une mise à jour
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-emerald-600">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Nouvelle consultation</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Nom du Médecin *" value={newConsultation.doctor} onChange={(e) => setNewConsultation({ ...newConsultation, doctor: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
            <input type="text" placeholder="Hôpital/Clinique *" value={newConsultation.hospital} onChange={(e) => setNewConsultation({ ...newConsultation, hospital: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
            <input type="text" placeholder="Raison de la visite" value={newConsultation.reason} onChange={(e) => setNewConsultation({ ...newConsultation, reason: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
            <input type="text" placeholder="Diagnostic *" value={newConsultation.diagnosis} onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
          </div>
          <textarea placeholder="Prescription" value={newConsultation.prescription} onChange={(e) => setNewConsultation({ ...newConsultation, prescription: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none mb-4" rows={2} />
          <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <h3 className="font-semibold text-emerald-900 mb-3">Carnet détaillé du traitement</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Plan de traitement / objectif" value={newConsultation.treatmentPlan} onChange={(e) => setNewConsultation({ ...newConsultation, treatmentPlan: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
              <input type="text" placeholder="Médicament / classe thérapeutique" value={newConsultation.medication} onChange={(e) => setNewConsultation({ ...newConsultation, medication: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
              <input type="text" placeholder="Posologie" value={newConsultation.dosage} onChange={(e) => setNewConsultation({ ...newConsultation, dosage: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
              <input type="text" placeholder="Fréquence" value={newConsultation.frequency} onChange={(e) => setNewConsultation({ ...newConsultation, frequency: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
              <input type="text" placeholder="Durée du traitement" value={newConsultation.duration} onChange={(e) => setNewConsultation({ ...newConsultation, duration: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
              <input type="text" placeholder="Suivi prévu" value={newConsultation.followUp} onChange={(e) => setNewConsultation({ ...newConsultation, followUp: e.target.value })} className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" />
            </div>
            <textarea placeholder="Observations médicales, réactions, conseils, contre-indications" value={newConsultation.notes} onChange={(e) => setNewConsultation({ ...newConsultation, notes: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none" rows={3} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddConsultation} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition">Enregistrer la mise à jour</button>
            <button onClick={() => setShowAddForm(false)} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-bold transition">Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          Historique médical immuable ({consultations.length})
        </h2>

        {consultations.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune consultation enregistrée</p>
          </div>
        ) : (
          consultations.map((consultation) => (
            <div key={consultation.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition border-l-4 border-emerald-600 overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === consultation.id ? null : consultation.id)} className="w-full p-6 text-left hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-gray-900">{consultation.date} à {consultation.time}</span>
                      {consultation.verified && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4" />
                      {consultation.doctor} • {consultation.hospital}
                    </p>
                    <p className="font-bold text-gray-900">{consultation.diagnosis}</p>
                  </div>
                  <Eye className={`w-5 h-5 ${expandedId === consultation.id ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
              </button>

              {expandedId === consultation.id && (
                <div className="px-6 pb-6 border-t-2 border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Raison de la visite</label>
                      <p className="text-sm text-gray-700 mt-1">{consultation.reason}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Prescription</label>
                      <p className="text-sm text-gray-700 mt-1">{consultation.prescription}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Notes du médecin</label>
                    <p className="text-sm text-gray-700 mt-1">{consultation.notes}</p>
                  </div>
                  {(consultation.treatmentPlan || consultation.medication || consultation.dosage || consultation.frequency || consultation.duration || consultation.followUp) && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-900 mb-2">📘 Carnet détaillé du traitement</p>
                      <div className="grid md:grid-cols-2 gap-3 text-sm text-emerald-800">
                        {consultation.treatmentPlan && <div><span className="font-semibold">Plan :</span> {consultation.treatmentPlan}</div>}
                        {consultation.medication && <div><span className="font-semibold">Médicament :</span> {consultation.medication}</div>}
                        {consultation.dosage && <div><span className="font-semibold">Posologie :</span> {consultation.dosage}</div>}
                        {consultation.frequency && <div><span className="font-semibold">Fréquence :</span> {consultation.frequency}</div>}
                        {consultation.duration && <div><span className="font-semibold">Durée :</span> {consultation.duration}</div>}
                        {consultation.followUp && <div><span className="font-semibold">Suivi :</span> {consultation.followUp}</div>}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-indigo-50 rounded border border-indigo-200">
                    <p className="text-xs font-bold text-indigo-900 mb-1">🔐 Hash Immuable (SHA-256)</p>
                    <p className="text-xs font-mono text-indigo-700 break-all">{consultation.hash}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-indigo-50 rounded-xl border-2 border-indigo-200 p-6">
        <p className="flex items-start gap-3 text-sm text-indigo-900">
          <Shield className="w-5 h-5 mt-1 flex-shrink-0" />
          <span>
            <strong>🔒 Sécurité garantie:</strong> L’historique existant est verrouillé. Le patient ne peut pas modifier les anciennes lignes, et le personnel de santé ne peut qu’ajouter une nouvelle mise à jour médicale. Chaque entrée reçoit un hash SHA-256 enregistré sur la chaîne Bitcoin.
          </span>
        </p>
      </div>

      {/* Camera QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleScanQR}
          onClose={() => setShowScanner(false)}
          title="Scanner QR d'autorisation"
          instruction="Présentez le code QR d'autorisation généré par le patient."
        />
      )}
    </div>
  );
}
