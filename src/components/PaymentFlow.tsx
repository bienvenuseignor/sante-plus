import React, { useState, useEffect } from 'react';
import { Hospital, MedicalDocument, Invoice } from '../types';
import { MOCK_DOCUMENTS, XOF_TO_SATS } from '../data';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Lock, Zap, RefreshCw, FileText, CheckCircle2, 
  Wallet, QrCode, Share2, MessageCircle, Copy, Download, 
  ExternalLink, Printer, ShieldCheck, HeartPulse, Sparkles, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentFlowProps {
  hospital: Hospital;
  walletBalance: number;
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  onPaymentComplete: (invoice: Invoice) => void;
  userName: string;
  patientPhone?: string;
  customDocuments?: MedicalDocument[];
}

type Step = 'authorize' | 'scanning' | 'retrieving' | 'review-docs' | 'pay-options' | 'success';

export default function PaymentFlow({
  hospital,
  walletBalance,
  setWalletBalance,
  onBack,
  onPaymentComplete,
  userName,
  patientPhone = '+229 97 88 55 44',
  customDocuments = []
}: PaymentFlowProps) {
  const [step, setStep] = useState<Step>('authorize');
  const [selectedMethod, setSelectedMethod] = useState<'none' | 'lightning' | 'wallet' | 'family-help'>('none');
  const [copiedText, setCopiedText] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // Dynamic Lightning states
  const [invoiceString, setInvoiceString] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [isFetchingInvoice, setIsFetchingInvoice] = useState<boolean>(false);

  // Set patient's name
  const patientName = userName || 'Bienvenue Segnon';

  // Use dynamic hospital-emitted documents if they exist, otherwise fall back to sample documents
  const activeDocs = customDocuments.length > 0 ? customDocuments : MOCK_DOCUMENTS;

  // Computed prices
  const totalXOF = activeDocs.reduce((acc, doc) => acc + doc.priceXOF, 0);
  const totalSats = Math.round(totalXOF * XOF_TO_SATS);

  // Default fallback invoice
  const lightningInvoiceFallback = `lnbc100u1p392066pp5y6m8a6uclm0aqlu7r96paxd0zcrsqm3sff4pghu5r3qpsms9p57qdqg2fhk6mmpwq5kget8wf5k2cmzv9hkutssw3skget8v4cxjumn94sk2uewdqh8gmpwd3jxc6tvd3hxw3scqpvqyjw5qcqpxrzjqw72q3ksla762hsp48qaswep7mqcxw6mppv6mpwpwqf7mpws9p4xpwpvq5qshxztf9f8gskqfq9gqkcxsqypqxpqxzszqxpqw7p9sk7tve9ekymv9cxqpxrzjqw72q3ksla762hsp48qaswep7mqcxw6mppv6mpwpwqf7mpws9p4xpwpvq5qshxztf9f8gskqfq9gqkcxsqypqxpqxzszqxpqw7p9`;

  // Fetch dynamic Breez lightning invoice on selection
  useEffect(() => {
    if (selectedMethod === 'lightning' || selectedMethod === 'family-help') {
      setIsFetchingInvoice(true);
      fetch('/api/payments/create-lightning-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountXOF: totalXOF, description: `Soins Sante+ - ${hospital.name}` })
      })
      .then(res => res.json())
      .then(data => {
        setInvoiceString(data.invoice || lightningInvoiceFallback);
        setInvoiceId(data.invoiceId);
        setIsFetchingInvoice(false);
      })
      .catch(err => {
        console.error("Failed to fetch live Breez invoice:", err);
        setInvoiceString(lightningInvoiceFallback);
        setIsFetchingInvoice(false);
      });
    }
  }, [selectedMethod]);

  // Poll server for Lightning invoice settlement (Real-time Breez webhook representation)
  useEffect(() => {
    if (!invoiceId || step === 'success') return;

    const interval = setInterval(() => {
      fetch(`/api/payments/verify-lightning-invoice?invoiceId=${invoiceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.isPaid) {
          const newInvoice: Invoice = {
            id: data.invoiceId || `FACT-${Math.floor(100000 + Math.random() * 900000)}`,
            patientName,
            patientPhone,
            hospitalName: hospital.name,
            hospitalAddress: hospital.address,
            date: new Date().toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            items: activeDocs.flatMap(doc => doc.items),
            totalXOF,
            totalSats,
            paymentMethod: selectedMethod === 'family-help' ? 'FamilyHelp' : 'Lightning',
            txHash: data.txHash || '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            isPaid: true,
            doctorName: getDoctorName(hospital.id),
          };
          setInvoice(newInvoice);
          setStep('success');
          onPaymentComplete(newInvoice);
        }
      })
      .catch(err => console.warn("Polling error:", err));
    }, 2500);

    return () => clearInterval(interval);
  }, [invoiceId, step, selectedMethod]);

  // Start biometric simulation
  const handleStartScan = () => {
    setStep('scanning');
    setTimeout(() => {
      setStep('retrieving');
      // Simulate hospital dropping files
      setTimeout(() => {
        setStep('review-docs');
      }, 2500);
    }, 2000);
  };

  const getDoctorName = (hospitalId: string) => {
    if (hospitalId === 'chd-atlantique') return 'Dr. Jean Sossou';
    if (hospitalId === 'hz-calavi') return 'Dr. Sonia Gbaguidi';
    if (hospitalId === 'clinique-union') return 'Dr. Albert Devigan';
    return 'Dr. Jean Sossou';
  };

  // Perform self wallet payment
  const handlePayWithWallet = () => {
    if (walletBalance < totalXOF) return;
    
    setIsSimulatingPayment(true);
    setTimeout(() => {
      setWalletBalance(prev => prev - totalXOF);
      const newInvoice: Invoice = {
        id: `FACT-${Math.floor(100000 + Math.random() * 900000)}`,
        patientName,
        patientPhone,
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        date: new Date().toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        items: activeDocs.flatMap(doc => doc.items),
        totalXOF,
        totalSats,
        paymentMethod: 'Wallet',
        txHash: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        isPaid: true,
        doctorName: getDoctorName(hospital.id),
      };
      setInvoice(newInvoice);
      setStep('success');
      setIsSimulatingPayment(false);
      onPaymentComplete(newInvoice);
    }, 1800);
  };

  // Perform simulation of lightning or family payment
  const handleSimulateLightningPayment = (method: 'Lightning' | 'FamilyHelp') => {
    setIsSimulatingPayment(true);
    setTimeout(() => {
      const newInvoice: Invoice = {
        id: `FACT-${Math.floor(100000 + Math.random() * 900000)}`,
        patientName,
        patientPhone,
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        date: new Date().toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        items: activeDocs.flatMap(doc => doc.items),
        totalXOF,
        totalSats,
        paymentMethod: method,
        txHash: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        isPaid: true,
        doctorName: getDoctorName(hospital.id),
      };
      setInvoice(newInvoice);
      setStep('success');
      setIsSimulatingPayment(false);
      onPaymentComplete(newInvoice);
    }, 2000);
  };


  const copyInvoiceText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Pre-filled text for help sharing
  const shareMessage = `Salut ! Je suis actuellement à l'établissement "${hospital.name}" à Abomey-Calavi pour des soins de santé. Peux-tu m'aider à régler ma facture médicale de ${totalXOF.toLocaleString('fr-FR')} XOF (${totalSats.toLocaleString()} Sats) via ce lien de paiement direct sécurisé ? ⚡ ${window.location.origin}/pay?bill=${Math.floor(10000 + Math.random() * 90000)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div id="payment-flow-component" className="max-w-2xl mx-auto bg-[#F2F2F7] p-2 md:p-6 rounded-3xl min-h-[600px] flex flex-col justify-center">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 md:p-8 flex-1 flex flex-col">
        
        {/* Header (Back option) */}
        {step !== 'success' && (
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold font-sans text-[#1C1C1E]">Règlement de soins</h2>
              <p className="text-xs text-gray-400 font-sans">{hospital.name}</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 1: AUTHORIZE DOSSIER (Initial State) */}
          {step === 'authorize' && (
            <motion.div
              key="authorize"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shadow-xs text-[#059669]">
                <Zap className="w-10 h-10 text-[#FFB300]" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-sans font-extrabold text-[#1C1C1E] tracking-tight">Autorisation de Dossier Médical</h3>
                <p className="text-sm text-gray-500 font-sans leading-relaxed">
                  Afin de permettre à l'établissement de déposer vos actes de soins (ordonnances, analyses) de manière sécurisée, vous devez signer une autorisation d'accès cryptographique.
                </p>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 text-left space-y-1 mt-2">
                  <span className="font-bold block">💡 Signature Cryptographique décentralisée :</span>
                  <p>Aucune reconnaissance faciale ou d'empreinte digitale n'est requise. Vous allez signer numériquement à l'aide d'une clé privée liée à votre identité Lightning Network (LN Sign).</p>
                </div>
              </div>

              {/* User badge */}
              <div className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-2 text-xs text-gray-600 font-sans font-medium">
                <span className="w-2 h-2 rounded-full bg-[#00D26A]"></span>
                Patient connecté : {patientName}
              </div>

              {/* Trigger Button */}
              <button
                onClick={handleStartScan}
                className="w-full py-4 px-6 bg-[#00D26A] hover:bg-[#00D26A]/95 text-white font-sans font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-white text-white animate-pulse" />
                <span>Signer l'autorisation via Lightning Network (LN)</span>
              </button>
            </motion.div>
          )}

          {/* STEP 1.5: LIGHTNING NETWORK SIGNING ANIMATION */}
          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-10"
            >
              {/* Lightning Network Signature Effect */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Circular pulse rings */}
                <span className="absolute inset-0 rounded-full border-2 border-[#00D26A]/30 animate-ping"></span>
                <span className="absolute inset-4 rounded-full border border-[#00D26A]/45 animate-pulse"></span>
                
                {/* Rotating ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00D26A]/60 animate-spin" style={{ animationDuration: '5s' }}></div>

                <div className="w-24 h-24 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/25 flex items-center justify-center text-[#00D26A]">
                  <Zap className="w-12 h-12 fill-[#00D26A]" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-md font-sans font-bold text-[#1C1C1E]">Génération de la signature cryptographique...</p>
                <p className="text-xs text-gray-400 font-sans">Sécurisation et inscription de l'autorisation d'accès sur le protocole LN</p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: RETRIEVING DOCUMENTS */}
          {step === 'retrieving' && (
            <motion.div
              key="retrieving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10"
            >
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-gray-100 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" />
              </div>

              <div className="space-y-2">
                <p className="text-md font-sans font-bold text-[#1C1C1E]">Récupération autorisée ✅</p>
                <p className="text-xs text-gray-400 font-sans max-w-xs mx-auto">
                  L'hôpital dépose actuellement vos analyses prescrites, ordonnances et devis sur votre mobile...
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 3: REVIEW DOCUMENTS DEPOSITED */}
          {step === 'review-docs' && (
            <motion.div
              key="review-docs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col space-y-6"
            >
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#00D26A]/10 flex items-center justify-center text-[#00D26A] flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-sans text-emerald-800 leading-tight">
                  <strong>{activeDocs.length} Document(s) reçu(s) :</strong> Autorisation validée. L'établissement a déposé vos frais médicaux à régler.
                </div>
              </div>

              {/* Itemized Document Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[280px] pr-1">
                {activeDocs.map((doc) => (
                  <div key={doc.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-2xs space-y-3 hover:border-gray-200 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-sans text-gray-800 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {doc.title}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {doc.priceXOF.toLocaleString('fr-FR')} XOF
                      </span>
                    </div>

                    <div className="pl-6 space-y-1 border-l border-gray-100">
                      {doc.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-500 font-sans">
                          <span>{item.name} {item.quantity ? `(x${item.quantity})` : ''}</span>
                          <span>{item.priceXOF.toLocaleString('fr-FR')} XOF</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold font-sans">Total Général à payer</p>
                  <p className="text-2xl font-black font-sans mt-0.5 text-[#00D26A]">{totalXOF.toLocaleString('fr-FR')} XOF</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold font-sans">Contrevaleur Lightning</p>
                  <p className="text-md font-mono font-bold text-amber-400 mt-0.5">{totalSats.toLocaleString()} Sats ⚡</p>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={() => setStep('pay-options')}
                className="w-full py-4 bg-[#059669] hover:bg-[#059669]/95 text-white font-bold font-sans text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Choisir le mode de paiement
              </button>
            </motion.div>
          )}

          {/* STEP 4: CHOOSE PAYMENT OPTIONS & HELP SHARING */}
          {step === 'pay-options' && (
            <motion.div
              key="pay-options"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col space-y-6"
            >
              {/* Bitcoin & Breez Importance Info */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5">
                <div className="flex gap-3">
                  <div className="text-2xl">₿</div>
                  <div>
                    <h3 className="font-bold text-orange-900 mb-2 text-sm">Pourquoi Bitcoin + Lightning Network (Breez)?</h3>
                    <ul className="text-xs text-orange-800 space-y-1.5">
                      <li>✅ <strong>Pas d'intermédiaire:</strong> Transactions directes patient ↔️ hôpital</li>
                      <li>✅ <strong>Frais réduits:</strong> ~0.5% vs 3-5% avec cartes classiques</li>
                      <li>✅ <strong>Transactions instantanées:</strong> Lightning Network délivre en &lt;1 sec</li>
                      <li>✅ <strong>Accès global:</strong> Pas de compte bancaire requis, juste une connexion Internet</li>
                      <li>✅ <strong>Sécurité maximale:</strong> Vos données ne quittent jamais votre téléphone</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Cost recall */}
              <div className="text-center pb-2">
                <span className="text-xs text-gray-400 font-sans uppercase tracking-wider font-medium">Facture en cours de règlement</span>
                <div className="flex items-baseline justify-center gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-sans text-[#1C1C1E]">{totalXOF.toLocaleString('fr-FR')} XOF</span>
                  <span className="text-sm font-mono text-gray-400">({totalSats.toLocaleString()} Sats)</span>
                </div>
              </div>

              {/* Grid of the 3 specified choices */}
              <div className="space-y-3">
                {/* CHOICE B: Pay myself via Wallet Santé+ */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('wallet')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-4 ${
                    selectedMethod === 'wallet'
                      ? 'border-[#00D26A] bg-[#00D26A]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === 'wallet' ? 'bg-[#00D26A] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-sans text-gray-800">Payer avec mon Wallet Santé+</h4>
                      <span className="text-xs font-bold font-sans text-[#00D26A]">{walletBalance.toLocaleString('fr-FR')} XOF dispo</span>
                    </div>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">Règlement instantané sécurisé par votre solde prépayé</p>
                  </div>
                </button>

                {/* CHOICE A: Pay myself via Lightning (QR Code) */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('lightning')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-4 ${
                    selectedMethod === 'lightning'
                      ? 'border-[#059669] bg-[#059669]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === 'lightning' ? 'bg-[#059669] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold font-sans text-gray-800">Payer moi-même en Lightning (Sats)</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">Génère un QR Code de facture Sats pour votre portefeuille Bitcoin externe</p>
                  </div>
                </button>

                {/* CHOICE C: Share for help (WhatsApp / QR) */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('family-help')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-4 ${
                    selectedMethod === 'family-help'
                      ? 'border-[#FF8A00] bg-amber-50/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === 'family-help' ? 'bg-[#FF8A00] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold font-sans text-gray-800">Demander de l'aide à un proche (WhatsApp & QR)</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">Génère un lien de paiement WhatsApp et un QR Code visible pour vos proches</p>
                  </div>
                </button>
              </div>

              {/* SUB-SECTIONS ACCORDING TO CHOSEN METHOD */}
              <div className="border-t border-gray-100 pt-5">
                {isSimulatingPayment ? (
                  <div className="py-8 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#059669] animate-spin mx-auto" />
                    <p className="text-sm font-semibold font-sans text-gray-700">Traitement de la transaction...</p>
                    <p className="text-xs text-gray-400 font-sans">Ne quittez pas l'application</p>
                  </div>
                ) : (
                  <>
                    {/* Method: Wallet */}
                    {selectedMethod === 'wallet' && (
                      <div className="space-y-4">
                        {walletBalance >= totalXOF ? (
                          <button
                            onClick={handlePayWithWallet}
                            className="w-full py-3.5 bg-[#00D26A] hover:bg-[#00D26A]/95 text-white font-bold font-sans text-sm rounded-2xl shadow-sm transition-all text-center cursor-pointer"
                          >
                            Confirmer et Débiter {totalXOF.toLocaleString('fr-FR')} XOF
                          </button>
                        ) : (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-sans font-medium text-center">
                            Solde insuffisant dans votre Wallet Santé+ ({walletBalance.toLocaleString('fr-FR')} XOF restant). Veuillez choisir un autre mode de paiement ou recharger votre compte.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Method: Lightning */}
                    {selectedMethod === 'lightning' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-4 text-center">
                        {isFetchingInvoice ? (
                          <div className="py-6 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" />
                            <span className="text-xs font-bold text-gray-500 font-sans">Génération de la facture sécurisée Breez API...</span>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white p-3.5 rounded-xl inline-block shadow-2xs border border-gray-100">
                              {/* QR Code generating the lightning invoice */}
                              <QRCodeSVG value={invoiceString || lightningInvoiceFallback} size={150} level="M" />
                            </div>
                            <p className="text-xs font-bold text-[#1C1C1E] font-sans">Scannez ce QR Code avec votre portefeuille Lightning (ex: Phoenix, Muun, Breez)</p>
                            
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => copyInvoiceText(invoiceString || lightningInvoiceFallback)}
                                className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-sans text-gray-700 font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                {copiedText ? 'Copié !' : 'Copier l\'Invoice'}
                              </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 py-2.5 px-4 rounded-xl animate-pulse mt-3 border border-emerald-100">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Réseau Lightning actif : En attente du règlement...</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Method: Family Help (WhatsApp Link + QR Code BOTH) */}
                    {selectedMethod === 'family-help' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-5">
                        <div className="text-center space-y-2">
                          <h4 className="text-xs font-bold uppercase text-amber-800 tracking-wider font-sans">Aide Familiale Santé+ active</h4>
                          <p className="text-xs text-gray-500 font-sans">
                            Conformément à la règle d'or, pas de cagnotte globale compliquée. Votre proche effectue un paiement direct pour cette facture spécifique en sats, libérant ainsi vos documents.
                          </p>
                        </div>

                        {isFetchingInvoice ? (
                          <div className="py-6 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 text-[#FF8A00] animate-spin" />
                            <span className="text-xs font-bold text-gray-500 font-sans">Génération de la facture sécurisée Breez API...</span>
                          </div>
                        ) : (
                          <>
                            {/* Dual Interface layout as requested: BOTH WA link + Visible QR */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                              {/* Part 1: QR Code visible for immediate scanning if family member is close */}
                              <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center space-y-2">
                                <QRCodeSVG value={invoiceString || lightningInvoiceFallback} size={120} level="M" />
                                <span className="text-[10px] font-sans text-gray-400 font-semibold uppercase tracking-wider">QR Code de Facturation</span>
                                <span className="text-[11px] font-sans text-gray-600 leading-tight">À scanner sur place pour payer en Sats</span>
                              </div>

                              {/* Part 2: WhatsApp Link Sharing */}
                              <div className="space-y-3">
                                <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                  <p className="text-[10px] text-gray-400 uppercase font-sans font-bold">Message généré :</p>
                                  <p className="text-[11px] text-gray-600 font-sans line-clamp-3 mt-1 italic">
                                    "{shareMessage}"
                                  </p>
                                </div>

                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full py-2.5 px-3 bg-[#00D26A] hover:bg-[#00D26A]/90 text-white font-bold rounded-xl text-xs font-sans flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer text-center"
                                >
                                  <MessageCircle className="w-4 h-4 fill-current" />
                                  Partager par WhatsApp
                                </a>

                                <button
                                  onClick={() => copyInvoiceText(shareMessage)}
                                  className="w-full py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-sans text-gray-700 font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 mr-1" />
                                  {copiedText ? 'Message copié !' : 'Copier le message et lien'}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50/80 py-2.5 px-4 rounded-xl animate-pulse border border-amber-200">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>En attente du règlement par votre proche...</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Placeholder when nothing is selected */}
                    {selectedMethod === 'none' && (
                      <p className="text-xs text-gray-400 text-center font-sans py-4">
                        Sélectionnez une option de paiement ci-dessus pour continuer.
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: SUCCESS & PDF INVOICE AVAILABLE */}
          {step === 'success' && invoice && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col space-y-6"
            >
              {/* Success Banner */}
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 bg-[#00D26A]/10 border border-[#00D26A]/20 rounded-full flex items-center justify-center text-[#00D26A] mx-auto shadow-2xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black font-sans text-gray-900">Paiement Validé ⚡</h3>
                  <p className="text-xs text-gray-400 font-sans">
                    Réceptionné avec succès par {hospital.name}
                  </p>
                </div>
              </div>

              {/* PDF Invoice View Container */}
              <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs text-left relative overflow-hidden space-y-4">
                {/* PDF Paper Header Decor */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#059669]"></div>
                
                {/* Official red stamp badge overlay */}
                <div className="absolute right-6 top-16 border-2 border-dashed border-rose-500 text-rose-500 font-sans font-black text-[9px] tracking-widest px-3 py-1.5 rounded-lg uppercase -rotate-12 pointer-events-none select-none flex flex-col items-center bg-rose-50/40 shadow-xs">
                  <span className="text-[7px] font-sans">MINISTÈRE DE LA SANTÉ</span>
                  <span className="text-sm font-bold font-sans">★ PAYÉ ★</span>
                  <span className="text-[6px] font-sans">{invoice.date}</span>
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
                    <p className="text-[10px] text-gray-400 font-sans mt-1">N° {invoice.id}</p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-gray-400 font-sans block">Patient</span>
                    <strong className="text-gray-800 font-sans font-bold block mt-0.5">{invoice.patientName}</strong>
                    <span className="text-gray-500 font-mono block mt-0.5">{invoice.patientPhone || "+229 97 88 55 44"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-sans block">Établissement émetteur</span>
                    <strong className="text-gray-800 font-sans font-bold block mt-0.5">{invoice.hospitalName}</strong>
                    <span className="text-gray-500 font-sans block mt-0.5">{invoice.hospitalAddress}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-gray-400 font-sans block">Date de paiement</span>
                    <span className="text-gray-700 font-sans block mt-0.5">{invoice.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-sans block">Méthode utilisée</span>
                    <span className="text-gray-700 font-sans block mt-0.5 font-semibold flex items-center gap-1">
                      {invoice.paymentMethod === 'Wallet' && <><Wallet className="w-3.5 h-3.5 text-[#00D26A]" /> Wallet Santé+</>}
                      {invoice.paymentMethod === 'Lightning' && <><QrCode className="w-3.5 h-3.5 text-[#059669]" /> Lightning Direct (Sats)</>}
                      {invoice.paymentMethod === 'FamilyHelp' && <><Share2 className="w-3.5 h-3.5 text-[#FF8A00]" /> Aide Familiale (Sats)</>}
                    </span>
                  </div>
                </div>

                {/* Bill Line Items */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs font-sans space-y-1.5">
                  <div className="flex justify-between text-gray-400 font-bold border-b border-gray-200/60 pb-1.5 uppercase text-[9px] tracking-wider">
                    <span>Désignation de l'acte</span>
                    <span>Montant</span>
                  </div>
                  {invoice.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-gray-700">
                      <span>{it.name}</span>
                      <span className="font-semibold">{it.priceXOF.toLocaleString('fr-FR')} XOF</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-gray-900 border-t border-gray-200/60 pt-1.5 font-bold mt-1 text-sm">
                    <span className="font-sans">Total Acquitté</span>
                    <span className="font-sans text-gray-950">{invoice.totalXOF.toLocaleString('fr-FR')} XOF</span>
                  </div>
                  <div className="text-right text-[10px] text-gray-400 font-sans font-medium">
                    (Équivalent réglé de {invoice.totalSats.toLocaleString()} Satoshis)
                  </div>
                </div>

                {/* Footer seal */}
                <div className="flex justify-between items-center text-[10px] font-sans text-gray-400 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-lg border border-gray-100 shadow-3xs">
                      <QRCodeSVG 
                        value={`[SANTÉ+ BÉNIN - DOCUMENT PAYÉ ET VERIFIÉ SANS CONNEXION]
------------------------------------
Réf Facture: ${invoice.id}
Patient: ${invoice.patientName}
Établissement: ${invoice.hospitalName}
Montant total: ${invoice.totalXOF.toLocaleString('fr-FR')} XOF
Date: ${invoice.date}
Méthode: ${invoice.paymentMethod === 'Wallet' ? 'Portefeuille Prépayé' : 'Réseau Lightning'}
Statut: CERTIFIÉ PAYÉ (OFFLINE STAMP - BLOCKCHAIN BÉNIN)`}
                        size={48}
                        level="M"
                      />
                    </div>
                    <div>
                      <span className="block font-semibold text-gray-700">Référence transaction</span>
                      <span className="font-mono text-[9px] block truncate max-w-[150px] mt-0.5">{invoice.txHash}</span>
                      <span className="text-[9px] text-[#059669] font-semibold mt-0.5 block">Scanner pour vérification offline</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg text-[#FF8A00] font-bold border border-amber-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Ministère de la Santé agréé
                  </div>
                </div>
              </div>

              {/* Action Buttons for PDF invoice */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold font-sans text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer Facture
                </button>
                <button
                  onClick={onBack}
                  className="py-3 px-4 bg-[#059669] hover:bg-[#059669]/95 text-white font-bold font-sans text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Fermer & Retour
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
