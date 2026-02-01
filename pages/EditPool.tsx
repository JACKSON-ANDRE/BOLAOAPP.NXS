import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Trophy, Calendar, ArrowLeft, Loader2, Info } from 'lucide-react';

const EditPool: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        modality: '',
        title: '',
        teamA: '',
        teamB: '',
        entry_fee: '',
        bets_deadline: '',
        scheduled_at: '',
    });

    const [includeDraw, setIncludeDraw] = useState(false);

    const [hasBets, setHasBets] = useState(false);
    const [originalPool, setOriginalPool] = useState<any>(null);
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        fetchPoolData();
    }, [id]);

    const fetchPoolData = async () => {
        if (!id) return;
        setLoading(true);

        const { data: pool, error } = await supabase
            .from('pools')
            .select('*, bets(count)')
            .eq('id', id)
            .single();

        if (error || !pool) {
            alert('Bolão não encontrado.');
            navigate('/');
            return;
        }

        // Check permissions
        const isAdmin = profile?.role === 'admin';
        const isCreator = pool.creator_id === profile?.id;

        if (!isAdmin && !isCreator) {
            alert('Você não tem permissão para editar este bolão.');
            navigate('/');
            return;
        }

        // Check deadlines
        const now = new Date();
        const deadline = new Date(pool.bets_deadline);
        if (now > deadline && !isAdmin) { // Admins might override, but user said "while not expired"
            // Strict adherence to user request: "enquanto não extinguir o prazo"
            // So even Creator cannot edit if expired.
            alert('O prazo de edição expirou (prazo de apostas encerrado).');
            navigate(`/pools/${id}`);
            return;
        }

        setOriginalPool(pool);
        // Supabase returns bets as array of objects with count if used select('*, bets(count)')? 
        // Actually select('*, bets(count)') returns { bets: [{count: N}] } usually.
        // Let's assume bets count check for entry_fee disable logic.
        const betsCount = pool.bets?.[0]?.count || 0;
        setHasBets(betsCount > 0);

        // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
        // Supabase returns UTC ISO strings. e.g. 2023-10-10T15:00:00+00:00
        // datetime-local expects local time string. 
        // We need to convert UTC to Local String "YYYY-MM-DDTHH:mm" for the input value.
        const toLocalISO = (isoString: string) => {
            if (!isoString) return '';
            const date = new Date(isoString);
            // Getting local parts
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        setFormData({
            modality: pool.modality,
            title: pool.title,
            teamA: pool.options[0] || '',
            teamB: (pool.modality === 'Futebol' && pool.options[1] === 'Empate') ? pool.options[2] : (pool.options[1] || ''),
            entry_fee: pool.entry_fee.toString(),
            bets_deadline: toLocalISO(pool.bets_deadline),
            scheduled_at: toLocalISO(pool.scheduled_at),
        });

        // Check if draw is included
        const hasDraw = pool.options.includes('Empate');
        setIncludeDraw(hasDraw);

        setLoading(false);
    };

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

        // Strict Validation: Betting Deadline MUST be BEFORE Event Date
        if (isValid) {
            const eventDate = new Date(formData.scheduled_at);
            const deadlineDate = new Date(formData.bets_deadline);

            if (deadlineDate >= eventDate) {
                isValid = false;
            }
        }

        setIsFormValid(isValid);
    }, [formData]);


    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const scheduledAtISO = new Date(formData.scheduled_at).toISOString();
        const betsDeadlineISO = new Date(formData.bets_deadline).toISOString();

        const updates: any = {
            modality: formData.modality,
            title: formData.title,
            options: includeDraw
                ? [formData.teamA, 'Empate', formData.teamB]
                : [formData.teamA, formData.teamB],
            scheduled_at: scheduledAtISO,
            bets_deadline: betsDeadlineISO,
        };

        // Only update entry fee if no bets (or if admin forces? keeping safe for now)
        if (!hasBets) {
            updates.entry_fee = parseFloat(formData.entry_fee);
        }

        const { error } = await supabase
            .from('pools')
            .update(updates)
            .eq('id', id);

        setSaving(false);

        if (error) {
            alert('Erro ao atualizar bolão: ' + error.message);
        } else {
            alert('Bolão atualizado com sucesso!');
            navigate(`/pools/${id}`);
        }
    };

    if (loading) return <div className="p-10 text-white flex justify-center"><Loader2 className="animate-spin" /></div>;

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

                    <div className="flex items-center gap-3 px-6 py-5 border-b border-[#27272A]">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Trophy className="text-orange-500" size={20} />
                        </div>
                        <h1 className="text-lg font-black text-white">
                            EDITAR BOLÃO
                        </h1>
                    </div>

                    <form onSubmit={handleUpdate} className="p-6 space-y-5">

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-400">MODALIDADE ESPORTIVA *</label>
                                <select
                                    value={formData.modality}
                                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                                    className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
                                >
                                    <option>Beach Tennis</option>
                                    <option>Futebol</option>
                                    <option>Futevôlei</option>
                                    <option>Vôlei</option>
                                    <option>Basquete</option>
                                    <option>Vale Tudo</option>
                                    <option>Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400">NOME DO EVENTO *</label>
                                <input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400">TIME / LADO A *</label>
                                <input
                                    value={formData.teamA}
                                    onChange={(e) => setFormData({ ...formData, teamA: e.target.value })}
                                    className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400">TIME / LADO B *</label>
                                <input
                                    value={formData.teamB}
                                    onChange={(e) => setFormData({ ...formData, teamB: e.target.value })}
                                    className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
                                />
                            </div>

                            {/* Enable Draw Toggle - Only visible if Modality is Football (or always? User asked for option in modal. Let's show for all or just football to avoid confusion? 
                            User said "ALWAYS WHEN MODALITY IS FOOTBALL" in first prompt, but now "IN EDIT MODAL OPTION TO ENABLE".
                            To be safe and clean, let's show it if Modality is Futebol. */}
                            {formData.modality === 'Futebol' && (
                                <div className="col-span-2 bg-[#27272A]/50 p-3 rounded-xl flex items-center gap-3 border border-[#27272A]">
                                    <input
                                        type="checkbox"
                                        checked={includeDraw}
                                        onChange={(e) => setIncludeDraw(e.target.checked)}
                                        className="w-5 h-5 accent-[#10B981] rounded cursor-pointer"
                                        id="drawToggle"
                                    />
                                    <label htmlFor="drawToggle" className="text-sm text-zinc-300 font-bold cursor-pointer select-none">
                                        Habilitar opção "Empate"?
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-zinc-400">VALOR APOSTA (R$) *</label>
                                <input
                                    value={formData.entry_fee}
                                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                                    disabled={hasBets} // Disable if bets exist
                                    className={`w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-[#10B981] ${hasBets ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                                {hasBets && <p className="text-[10px] text-zinc-500 mt-1">Não é possível alterar o valor após receber apostas.</p>}
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400">FIM DAS APOSTAS *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.bets_deadline}
                                    onChange={(e) => setFormData({ ...formData, bets_deadline: e.target.value })}
                                    className="w-full mt-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-400">DATA E HORA REAL DO EVENTO *</label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-3 text-zinc-500" size={16} />
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_at}
                                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 text-white"
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

                        <button
                            type="submit"
                            disabled={!isFormValid || saving}
                            className={`w-full font-black py-4 rounded-2xl transition-all ${isFormValid && !saving
                                ? 'bg-orange-500 hover:bg-orange-600 text-[#0A0A0B]'
                                : 'bg-[#27272A] text-zinc-500 cursor-not-allowed'
                                }`}
                        >
                            {saving ? <Loader2 className="animate-spin mx-auto" /> : 'SALVAR ALTERAÇÕES'}
                        </button>

                    </form>
                </div>

            </div>
        </div>
    );
};

export default EditPool;
