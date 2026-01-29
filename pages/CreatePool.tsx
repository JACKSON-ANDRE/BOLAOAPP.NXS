import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Trophy, Calendar, ArrowLeft, Loader2, Info, CheckCircle, Scale } from 'lucide-react';
import { calculateServiceFee, getFeeTable } from '../src/utils/FeeCalculator';
import { notifyAdmin } from '../src/utils/adminNotification';

const CreatePool: React.FC = () => {
  const { profile, maintenanceMode } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCommitmentModal, setShowCommitmentModal] = useState(false);
  const [calculatedFee, setCalculatedFee] = useState(0);

  const [formData, setFormData] = useState({
    modality: 'Beach Tennis',
    title: '',
    teamA: '',
    teamB: '',
    entry_fee: '10.00',
    bets_deadline: '',
    scheduled_at: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    let isValid =
      formData.modality.trim() !== '' &&
      formData.title.trim() !== '' &&
      formData.teamA.trim() !== '' &&
      formData.teamB.trim() !== '' &&
      formData.entry_fee.trim() !== '' &&
      parseFloat(formData.entry_fee) > 0 &&
      formData.bets_deadline !== '' &&
      formData.scheduled_at !== '';

    // Strict Validation: Betting Deadline MUST be BEFORE Event Date AND in the FUTURE
    if (isValid) {
      const eventDate = new Date(formData.scheduled_at);
      const deadlineDate = new Date(formData.bets_deadline);
      const now = new Date();

      if (deadlineDate <= now) {
        isValid = false;
      }

      if (deadlineDate >= eventDate) {
        isValid = false;
      }
    }

    // Prevent Duplicate Teams
    if (isValid && formData.teamA.trim().toLowerCase() === formData.teamB.trim().toLowerCase()) {
      isValid = false;
    }

    setIsFormValid(isValid);
  }, [formData]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryFee = parseFloat(formData.entry_fee);

    if (isNaN(entryFee) || entryFee <= 0) {
      alert("Valor da aposta inválido");
      return;
    }

    const fee = calculateServiceFee(entryFee);
    setCalculatedFee(fee);
    setShowConfirmModal(true);
  };

  const handleAgreeFee = () => {
    setShowConfirmModal(false);
    setShowCommitmentModal(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    const entryFee = parseFloat(formData.entry_fee);

    // Convert local datetime to ISO string to ensure correct timezone handling
    // When using datetime-local, the string is YYYY-MM-DDTHH:mm
    // new Date(string) creates a Date object in local time
    // .toISOString() converts it to UTC, which Supabase expects.
    const scheduledAtISO = new Date(formData.scheduled_at).toISOString();
    const betsDeadlineISO = new Date(formData.bets_deadline).toISOString();

    const { error } = await supabase.from('pools').insert({
      creator_id: profile?.id,
      title: formData.title,
      modality: formData.modality,
      scheduled_at: scheduledAtISO,
      entry_fee: entryFee,
      bets_deadline: betsDeadlineISO,
      options: [formData.teamA, formData.teamB],
      status: 'open',
      service_fee: 0,
      gross_amount: 0,
      net_prize: 0,
      is_distributed: false
    });

    setLoading(false);
    setShowCommitmentModal(false);

    if (error) {
      alert('Erro ao criar bolão: ' + error.message);
    } else {
      notifyAdmin("Novo Bolão Criado", `Um novo bolão "${formData.title}" foi criado na categoria ${formData.modality}.`);
      navigate('/');
    }
  };


  return (
    <div className="flex justify-center pt-12 pb-24">
      <div className="w-full max-w-xl space-y-6">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="bg-[#141417] border border-[#27272A] rounded-3xl overflow-hidden">

          <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-5 border-b border-[#27272A]">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[#10B981]/10 flex items-center justify-center">
              <Trophy className="text-[#10B981]" size={16} />
            </div>
            <h1 className="text-base md:text-lg font-black text-white">
              CRIAR NOVO BOLÃO
            </h1>
          </div>

          <form onSubmit={handlePreSubmit} className="p-4 md:p-6 space-y-4 md:space-y-5">

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">MODALIDADE *</label>
                <select
                  value={formData.modality}
                  onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-sm text-white"
                >
                  <option>Beach Tennis</option>
                  <option>Futebol</option>
                  <option>Futevôlei</option>
                  <option>Vôlei</option>
                  <option>Basquete</option>
                  <option>Vale Tudo</option>
                  <option>Big Brother Brasil</option>
                  <option>Outros</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">EVENTO *</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-sm text-white"
                  placeholder="Ex: Torneio"
                />
              </div>

              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">
                  {formData.modality === 'Big Brother Brasil' ? 'PARTICIPANTE A *' : 'TIME A *'}
                </label>
                <input
                  value={formData.teamA}
                  onChange={(e) => setFormData({ ...formData, teamA: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-sm text-white"
                  placeholder="Ex: Alpha"
                />
              </div>

              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">
                  {formData.modality === 'Big Brother Brasil' ? 'PARTICIPANTE B *' : 'TIME B *'}
                </label>
                <input
                  value={formData.teamB}
                  onChange={(e) => setFormData({ ...formData, teamB: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-sm text-white"
                  placeholder="Ex: Beta"
                />
              </div>

              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">APOSTA (R$) *</label>
                <input
                  type="number"
                  value={formData.entry_fee}
                  onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-sm text-[#10B981] font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] md:text-xs text-zinc-400">FIM APOSTAS *</label>
                <input
                  type="datetime-local"
                  value={formData.bets_deadline}
                  onChange={(e) => setFormData({ ...formData, bets_deadline: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-xs md:text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-zinc-400">DATA DO EVENTO *</label>
              <div className="relative mt-1">
                <Calendar className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none" size={14} />
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg md:rounded-xl p-2 md:p-3 text-xs md:text-sm text-white"
                />
              </div>
            </div>

            {/* Validation Message if Dates are Invalid */}
            {formData.scheduled_at && formData.bets_deadline && new Date(formData.bets_deadline) >= new Date(formData.scheduled_at) && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex gap-3">
                <Info className="text-red-500 shrink-0" size={20} />
                <p className="text-xs text-red-200">
                  Atenção: O prazo de apostas deve ser ANTERIOR à data do evento.
                </p>
              </div>
            )}

            {/* Duplicate Teams Validation */}
            {formData.teamA && formData.teamB && formData.teamA.trim().toLowerCase() === formData.teamB.trim().toLowerCase() && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex gap-3">
                <Info className="text-red-500 shrink-0" size={20} />
                <p className="text-xs text-red-200">
                  Atenção: Os nomes dos times/lados devem ser diferentes.
                </p>
              </div>
            )}

            {maintenanceMode && profile?.role !== 'admin' ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex gap-3">
                <Info className="text-yellow-500 shrink-0" size={20} />
                <p className="text-sm text-yellow-200 font-bold">
                  Sistema em manutenção. A criação de bolões está temporariamente suspensa.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`w-full font-black py-3 md:py-4 rounded-xl md:rounded-2xl transition-all text-sm md:text-base ${isFormValid && !loading
                  ? 'bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B]'
                  : 'bg-[#27272A] text-zinc-500 cursor-not-allowed'
                  }`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'PUBLICAR BOLÃO'}
              </button>
            )}

          </form>
        </div>

        {/* FEE CONFIRMATION MODAL */}
        {
          showConfirmModal && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-lg p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="text-[#10B981]" size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-white">VALORES</h2>
                </div>

                <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl overflow-hidden">
                  <div className="bg-[#27272A] px-4 py-3 text-xs font-bold text-zinc-300 uppercase flex justify-between">
                    <span>Faixa de Arrecadação</span>
                    <span>VALORES</span>
                  </div>
                  <div className="divide-y divide-[#27272A]">
                    {getFeeTable().map((row, i) => (
                      <div key={i} className="px-4 py-3 flex justify-between text-sm text-zinc-400 hover:bg-[#27272A]/50 transition">
                        <span>{row.range}</span>
                        <span className="font-bold text-white">{row.fee}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#10B981]/10 border border-[#10B981]/20 p-4 rounded-2xl flex gap-3">
                  <CheckCircle className="text-[#10B981] shrink-0" size={20} />
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Ao clicar em "Concordo", você declara estar ciente dos valores, e que serão descontados automaticamente do prêmio total antes do pagamento aos vencedores.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAgreeFee}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                  >
                    CONCORDO E AVANÇAR
                  </button>

                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full text-zinc-500 hover:text-white font-bold py-3 text-sm"
                  >
                    Cancelar
                  </button>
                </div>

              </div>
            </div>
          )
        }

        {/* ORGANIZER COMMITMENT MODAL */}
        {
          showCommitmentModal && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-md p-8 space-y-6 relative">

                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scale className="text-yellow-500" size={32} />
                  </div>
                  <h2 className="text-xl font-black text-white">Compromisso do Organizador</h2>
                </div>

                <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-yellow-500/20">
                  <p className="text-zinc-300 text-sm leading-relaxed text-center font-medium">
                    Você se compromete a encerrar o bolão e declarar o vencedor assim que a partida/jogo/disputa finalizar?
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleConfirmCreate}
                    disabled={loading}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'SIM, EU ME COMPROMETO'}
                  </button>

                  <button
                    onClick={() => setShowCommitmentModal(false)}
                    className="w-full text-zinc-500 hover:text-white font-bold py-3 text-sm"
                  >
                    Cancelar
                  </button>
                </div>

              </div>
            </div>
          )
        }

      </div >
    </div >
  );
};

export default CreatePool;
